import ExpoModulesCore
import UIKit

public class AppLockModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppLock")

    Events("onReset")

    // Normally the app delegate subscriber has started the lock already; this is a
    // fallback and start() is idempotent.
    OnCreate {
      DispatchQueue.main.async { AppLockCenter.shared.start() }
    }

    Function("isAvailable") { () -> Bool in
      true
    }

    Function("setPin") { (pin: String) -> Bool in
      AppLockStore.setPin(pin)
    }

    Function("verifyPin") { (pin: String) -> Bool in
      AppLockStore.verify(pin)
    }

    Function("clearPin") { () -> Void in
      AppLockStore.clearPin()
    }

    Function("configure") { (enabled: Bool, faceId: Bool, graceSeconds: Int) -> Void in
      AppLockStore.configure(enabled: enabled, faceId: faceId, graceSeconds: graceSeconds)
    }

    Function("getConfig") { () -> [String: Any] in
      [
        "enabled": AppLockStore.isEnabled,
        "faceId": AppLockStore.faceIdEnabled,
        "graceSeconds": AppLockStore.graceSeconds,
        "hasPin": AppLockStore.hasPin,
      ]
    }

    Function("consumeResetFlag") { () -> Bool in
      AppLockStore.consumeResetFlag()
    }

    OnStartObserving {
      AppLockCenter.shared.onReset = { [weak self] in
        self?.sendEvent("onReset", [:])
      }
    }

    OnStopObserving {
      AppLockCenter.shared.onReset = nil
    }
  }
}

/// Starts the lock during launch, before any JavaScript runs.
public class AppLockAppDelegate: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    AppLockCenter.shared.start()
    return true
  }
}
