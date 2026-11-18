import CryptoKit
import Foundation
import Security

/// PIN hash in the Keychain, non-secret settings in UserDefaults.
enum AppLockStore {
  static let pinLength = 4
  static let maxAttempts = 5
  static let cooldownSeconds = 30.0

  private static let service = "streamyfin.app-lock"
  private static let account = "pin-hash"
  private static var defaults: UserDefaults { UserDefaults.standard }

  private enum Key {
    static let enabled = "appLockNative.enabled"
    static let faceId = "appLockNative.faceId"
    static let grace = "appLockNative.graceSeconds"
    static let backgroundedAt = "appLockNative.backgroundedAt"
    static let failed = "appLockNative.failed"
    static let cooldownUntil = "appLockNative.cooldownUntil"
    static let resetPending = "appLockResetPending"
  }

  // MARK: PIN

  private static func hash(_ pin: String) -> String {
    SHA256.hash(data: Data(pin.utf8)).map { String(format: "%02x", $0) }.joined()
  }

  private static var baseQuery: [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
    ]
  }

  private static func readHash() -> String? {
    var query = baseQuery
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    var result: AnyObject?
    guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
      let data = result as? Data
    else { return nil }
    return String(data: data, encoding: .utf8)
  }

  static var hasPin: Bool { readHash() != nil }

  @discardableResult
  static func setPin(_ pin: String) -> Bool {
    SecItemDelete(baseQuery as CFDictionary)
    var query = baseQuery
    query[kSecValueData as String] = Data(hash(pin).utf8)
    query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
  }

  static func verify(_ pin: String) -> Bool {
    guard let stored = readHash() else { return false }
    return stored == hash(pin)
  }

  static func clearPin() {
    SecItemDelete(baseQuery as CFDictionary)
  }

  // MARK: Config

  /// The lock only counts as on when a PIN exists, so it can never lock the user out.
  static var isEnabled: Bool { defaults.bool(forKey: Key.enabled) && hasPin }
  static var faceIdEnabled: Bool { defaults.bool(forKey: Key.faceId) }
  static var graceSeconds: Int { defaults.integer(forKey: Key.grace) }

  static func configure(enabled: Bool, faceId: Bool, graceSeconds: Int) {
    defaults.set(enabled, forKey: Key.enabled)
    defaults.set(faceId, forKey: Key.faceId)
    defaults.set(max(0, graceSeconds), forKey: Key.grace)
  }

  static func setBackgroundedAt(_ date: Date?) {
    if let date {
      defaults.set(date.timeIntervalSince1970, forKey: Key.backgroundedAt)
    } else {
      defaults.removeObject(forKey: Key.backgroundedAt)
    }
  }

  static var backgroundedAt: Date? {
    guard defaults.object(forKey: Key.backgroundedAt) != nil else { return nil }
    return Date(timeIntervalSince1970: defaults.double(forKey: Key.backgroundedAt))
  }

  // MARK: Wrong-PIN throttling (persisted so killing the app does not reset it)

  /// Counts a wrong PIN; every `maxAttempts`-th one starts the cooldown.
  static func registerFailure() {
    let failed = defaults.integer(forKey: Key.failed) + 1
    defaults.set(failed, forKey: Key.failed)
    if failed % maxAttempts == 0 {
      defaults.set(Date().timeIntervalSince1970 + cooldownSeconds, forKey: Key.cooldownUntil)
    }
  }

  static func resetFailures() {
    defaults.set(0, forKey: Key.failed)
    defaults.removeObject(forKey: Key.cooldownUntil)
  }

  static func cooldownRemaining() -> Int {
    let left = defaults.double(forKey: Key.cooldownUntil) - Date().timeIntervalSince1970
    return left > 0 ? Int(left.rounded(.up)) : 0
  }

  // MARK: Forgot-passcode handoff to JS

  static func markResetPending() {
    defaults.set(true, forKey: Key.resetPending)
  }

  static func consumeResetFlag() -> Bool {
    let was = defaults.bool(forKey: Key.resetPending)
    defaults.set(false, forKey: Key.resetPending)
    return was
  }
}
