import LocalAuthentication
import SwiftUI
import UIKit

/// Owns the lock window and decides when it shows. Everything here runs on the main thread.
final class AppLockCenter: @unchecked Sendable {
  static let shared = AppLockCenter()

  /// Set by the module while JS listens; the reset flag in UserDefaults covers the rest.
  var onReset: (() -> Void)?

  private let model = LockModel()
  private lazy var host: UIHostingController<LockView> = {
    let controller = UIHostingController(rootView: LockView(model: self.model))
    controller.view.backgroundColor = .black
    return controller
  }()
  private var window: UIWindow?
  private var started = false
  private var locked = false
  private var faceIdTried = false
  private var faceIdRunning = false

  private init() {}

  /// Idempotent. Called from the app delegate subscriber at launch (main thread).
  func start() {
    guard !started else { return }
    started = true

    model.onSubmit = { [weak self] pin in self?.submit(pin) }
    model.onFaceId = { [weak self] in
      self?.faceIdTried = false
      self?.tryFaceId()
    }
    model.onForgot = { [weak self] in self?.confirmForgot() }

    let nc = NotificationCenter.default
    func observe(_ name: Notification.Name, _ handler: @escaping (AppLockCenter) -> Void) {
      nc.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
        if let self { handler(self) }
      }
    }
    observe(UIApplication.willResignActiveNotification) { $0.willResignActive() }
    observe(UIApplication.didBecomeActiveNotification) { $0.didBecomeActive() }
    observe(UIApplication.didEnterBackgroundNotification) { $0.didEnterBackground() }
    observe(UIApplication.willEnterForegroundNotification) { $0.willEnterForeground() }
    // The scene may connect after launch; re-attach the window to it.
    observe(UIScene.willConnectNotification) { center in
      if center.locked || center.model.covered { center.showWindow(makeKey: center.locked) }
    }

    // Cold start: locked before the first frame of the app can show.
    if AppLockStore.isEnabled { lock() }
  }

  // MARK: Lifecycle

  private func willResignActive() {
    guard AppLockStore.isEnabled, !locked else { return }
    // Synchronous, so the app switcher snapshot is taken with the cover in place.
    model.covered = true
    showWindow(makeKey: false)
  }

  private func didBecomeActive() {
    if locked {
      showWindow(makeKey: true)
      tryFaceId()
    } else if model.covered {
      model.covered = false
      hideWindow()
    }
  }

  private func didEnterBackground() {
    // Only "background" counts: Face ID and system sheets just make the app inactive.
    guard AppLockStore.isEnabled, !locked else { return }
    AppLockStore.setBackgroundedAt(Date())
  }

  private func willEnterForeground() {
    guard AppLockStore.isEnabled, !locked, let at = AppLockStore.backgroundedAt else { return }
    AppLockStore.setBackgroundedAt(nil)
    if Date().timeIntervalSince(at) >= Double(AppLockStore.graceSeconds) { lock() }
  }

  // MARK: Lock / unlock

  private func lock() {
    locked = true
    faceIdTried = false
    model.pin = ""
    model.wrong = false
    model.cooldown = AppLockStore.cooldownRemaining()
    model.showFaceId = AppLockStore.faceIdEnabled && canUseFaceId()
    model.locked = true
    showWindow(makeKey: true)
    // During launch the app is still inactive; didBecomeActive tries then.
    if UIApplication.shared.applicationState == .active { tryFaceId() }
  }

  private func unlock() {
    locked = false
    model.locked = false
    model.covered = false
    model.accepted()
    hideWindow()
  }

  private func submit(_ pin: String) {
    if AppLockStore.cooldownRemaining() > 0 {
      model.rejected()
    } else if AppLockStore.verify(pin) {
      AppLockStore.resetFailures()
      unlock()
    } else {
      AppLockStore.registerFailure()
      model.rejected()
    }
  }

  private func confirmForgot() {
    guard host.presentedViewController == nil else { return }
    let alert = UIAlertController(
      title: AppLockText.forgot, message: AppLockText.forgotDesc, preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: AppLockText.cancel, style: .cancel))
    alert.addAction(
      UIAlertAction(title: AppLockText.reset, style: .destructive) { [weak self] _ in
        AppLockStore.clearPin()
        AppLockStore.configure(enabled: false, faceId: false, graceSeconds: 0)
        AppLockStore.resetFailures()
        AppLockStore.markResetPending()
        self?.unlock()
        self?.onReset?()
      })
    host.present(alert, animated: true)
  }

  // MARK: Face ID

  private func canUseFaceId() -> Bool {
    var error: NSError?
    return LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
  }

  private func tryFaceId() {
    guard locked, AppLockStore.faceIdEnabled, !faceIdTried, !faceIdRunning, canUseFaceId() else {
      return
    }
    faceIdTried = true
    faceIdRunning = true
    LAContext().evaluatePolicy(
      .deviceOwnerAuthenticationWithBiometrics, localizedReason: AppLockText.faceIdReason
    ) { [weak self] success, _ in
      DispatchQueue.main.async {
        guard let self else { return }
        self.faceIdRunning = false
        if success && self.locked {
          AppLockStore.resetFailures()
          self.unlock()
        }
      }
    }
  }

  // MARK: Window

  private func activeScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    return scenes.first { $0.activationState == .foregroundActive }
      ?? scenes.first { $0.activationState == .foregroundInactive }
      ?? scenes.first
  }

  private func showWindow(makeKey: Bool) {
    let scene = activeScene()
    // (Re)build when there is none yet, or it was made before a scene existed.
    if window == nil || (window?.windowScene == nil && scene != nil) {
      window?.rootViewController = nil
      window?.isHidden = true
      let newWindow: UIWindow
      if let scene {
        newWindow = UIWindow(windowScene: scene)
      } else {
        newWindow = UIWindow(frame: UIScreen.main.bounds)
      }
      newWindow.windowLevel = UIWindow.Level.alert + 1
      newWindow.backgroundColor = .black
      newWindow.rootViewController = host
      window = newWindow
    }
    guard let window else { return }
    if makeKey {
      window.makeKeyAndVisible()
    } else {
      window.isHidden = false
    }
  }

  private func hideWindow() {
    guard let window else { return }
    window.isHidden = true
    // Give key status back to the app's main window.
    UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .first { $0 !== window && !$0.isHidden }?
      .makeKey()
  }
}
