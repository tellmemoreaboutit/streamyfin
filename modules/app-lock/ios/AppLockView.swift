import SwiftUI

/// Few strings, English and Polish, picked from the preferred languages.
enum AppLockText {
  private static var polish: Bool {
    Locale.preferredLanguages.first?.hasPrefix("pl") == true
  }

  private static func pick(_ en: String, _ pl: String) -> String { polish ? pl : en }

  static var wrongPasscode: String { pick("Wrong passcode", "Nieprawidłowy kod") }
  static func tooMany(_ seconds: Int) -> String {
    polish
      ? "Zbyt wiele prób. Spróbuj ponownie za \(seconds) s"
      : "Too many attempts. Try again in \(seconds) s"
  }
  static var useFaceId: String { pick("Use Face ID", "Użyj Face ID") }
  static var forgot: String { pick("Forgot passcode?", "Nie pamiętasz kodu?") }
  static var forgotDesc: String {
    pick(
      "This turns off the lock and logs you out of all saved accounts and servers.",
      "To wyłączy blokadę i wyloguje Cię ze wszystkich zapisanych kont i serwerów.")
  }
  static var reset: String { pick("Reset", "Resetuj") }
  static var cancel: String { pick("Cancel", "Anuluj") }
  static var faceIdReason: String { pick("Unlock Streamyfin", "Odblokuj Streamyfin") }
}

/// State shown by `LockView`; the logic lives in `AppLockCenter`.
final class LockModel: ObservableObject {
  @Published var pin = ""
  @Published var locked = false
  @Published var covered = false
  @Published var showFaceId = false
  @Published var wrong = false
  @Published var cooldown = 0
  @Published var shakeOffset: CGFloat = 0

  var onSubmit: ((String) -> Void)?
  var onFaceId: (() -> Void)?
  var onForgot: (() -> Void)?

  private var busy = false

  func tap(_ digit: String) {
    guard cooldown == 0, !busy, pin.count < AppLockStore.pinLength else { return }
    pin += digit
    wrong = false
    if pin.count == AppLockStore.pinLength {
      busy = true
      onSubmit?(pin)
    }
  }

  func backspace() {
    guard !busy, !pin.isEmpty else { return }
    pin.removeLast()
  }

  /// A correct PIN: `AppLockCenter` hides the window, just reset the entry.
  func accepted() {
    busy = false
    pin = ""
    wrong = false
  }

  func rejected() {
    wrong = true
    cooldown = AppLockStore.cooldownRemaining()
    let steps: [CGFloat] = [10, -10, 10, -10, 0]
    for (i, x) in steps.enumerated() {
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.05 * Double(i)) {
        withAnimation(.linear(duration: 0.05)) { self.shakeOffset = x }
      }
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
      self.pin = ""
      self.busy = false
    }
  }

  func tick() {
    let left = AppLockStore.cooldownRemaining()
    if left != cooldown { cooldown = left }
  }
}

struct LockView: View {
  @ObservedObject var model: LockModel
  private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

  private var appName: String {
    (Bundle.main.object(forInfoDictionaryKey: "CFBundleDisplayName") as? String)
      ?? (Bundle.main.object(forInfoDictionaryKey: "CFBundleName") as? String)
      ?? "Streamyfin"
  }

  private var message: String {
    if model.cooldown > 0 { return AppLockText.tooMany(model.cooldown) }
    return model.wrong ? AppLockText.wrongPasscode : ""
  }

  var body: some View {
    ZStack {
      Color.black.ignoresSafeArea()
      // While only covered (privacy cover) nothing but black is drawn.
      // Scrolls when the phone is in landscape (e.g. locked over the player),
      // where the keypad is taller than the screen.
      if model.locked {
        GeometryReader { geo in
        ScrollView(showsIndicators: false) {
        VStack(spacing: 20) {
          Text(appName)
            .font(.system(size: 28, weight: .bold))
            .foregroundColor(.white)
          HStack(spacing: 16) {
            ForEach(0..<AppLockStore.pinLength, id: \.self) { i in
              Circle()
                .strokeBorder(Color.white, lineWidth: 1.5)
                .background(Circle().fill(i < model.pin.count ? Color.white : Color.clear))
                .frame(width: 16, height: 16)
            }
          }
          .offset(x: model.shakeOffset)
          Text(message)
            .font(.system(size: 14))
            .foregroundColor(.red)
            .multilineTextAlignment(.center)
            .frame(height: 36)
          keypad
          if model.showFaceId {
            Button(AppLockText.useFaceId) { model.onFaceId?() }
              .foregroundColor(Color(red: 0.75, green: 0.55, blue: 1.0))
          }
          Button(AppLockText.forgot) { model.onForgot?() }
            .foregroundColor(Color(red: 0.75, green: 0.55, blue: 1.0))
        }
        .padding(.horizontal, 32)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity, minHeight: geo.size.height)
        }
        }
      }
    }
    .preferredColorScheme(.dark)
    .onReceive(timer) { _ in model.tick() }
  }

  private var keypad: some View {
    VStack(spacing: 14) {
      ForEach(0..<3, id: \.self) { row in
        HStack(spacing: 24) {
          ForEach(1...3, id: \.self) { col in
            key(String(row * 3 + col))
          }
        }
      }
      HStack(spacing: 24) {
        Color.clear.frame(width: 76, height: 76)
        key("0")
        Button(action: { model.backspace() }) {
          Image(systemName: "delete.left")
            .font(.system(size: 24))
            .foregroundColor(.white)
            .frame(width: 76, height: 76)
        }
      }
    }
  }

  private func key(_ digit: String) -> some View {
    Button(action: { model.tap(digit) }) {
      Text(digit)
        .font(.system(size: 30, weight: .regular))
        .foregroundColor(.white)
        .frame(width: 76, height: 76)
        .background(Circle().fill(Color.white.opacity(0.12)))
    }
  }
}
