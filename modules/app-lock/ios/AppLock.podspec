Pod::Spec.new do |s|
  s.name           = 'AppLock'
  s.version        = '1.0.0'
  s.summary        = 'Native passcode lock window with privacy cover'
  s.description    = 'Own UIWindow with PIN keypad and Face ID, shown at cold start before JS runs.'
  s.author         = ''
  s.homepage       = 'https://github.com/streamyfin/streamyfin'
  # iOS only: tvOS has no app lock.
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.frameworks = 'UIKit', 'SwiftUI', 'LocalAuthentication', 'CryptoKit', 'Security'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift}"
end
