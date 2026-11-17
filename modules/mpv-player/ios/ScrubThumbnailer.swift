import AVFoundation
import UIKit

/// Grabs scrub-preview frames from a progressive mp4/mov URL. One asset and
/// generator are kept for the latest URL; a new request cancels the one in
/// flight, since only the newest position matters while scrubbing.
final class ScrubThumbnailer {
  static let shared = ScrubThumbnailer()

  private let queue = DispatchQueue(label: "ScrubThumbnailer")
  private var currentURL: String?
  private var generator: AVAssetImageGenerator?
  private let directory: URL

  private init() {
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    directory = caches.appendingPathComponent("scrub-thumbs", isDirectory: true)
    // Frames from earlier runs are useless: start clean.
    try? FileManager.default.removeItem(at: directory)
    try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
  }

  func thumbnail(
    urlString: String, seconds: Double, maxWidth: Double,
    completion: @escaping (String?) -> Void
  ) {
    queue.async {
      guard let url = URL(string: urlString), seconds.isFinite else {
        completion(nil)
        return
      }
      if self.currentURL != urlString || self.generator == nil {
        self.generator?.cancelAllCGImageGeneration()
        let generator = AVAssetImageGenerator(asset: AVURLAsset(url: url))
        generator.appliesPreferredTrackTransform = true
        // Nearest keyframe within the tolerance decodes much faster than an exact frame.
        let tolerance = CMTime(seconds: 1.5, preferredTimescale: 600)
        generator.requestedTimeToleranceBefore = tolerance
        generator.requestedTimeToleranceAfter = tolerance
        self.generator = generator
        self.currentURL = urlString
      }
      guard let generator = self.generator else {
        completion(nil)
        return
      }
      generator.cancelAllCGImageGeneration()
      generator.maximumSize = CGSize(width: maxWidth, height: maxWidth)
      let time = NSValue(time: CMTime(seconds: max(0, seconds), preferredTimescale: 600))
      let directory = self.directory
      generator.generateCGImagesAsynchronously(forTimes: [time]) { _, image, _, result, _ in
        guard result == .succeeded, let image = image,
              let data = UIImage(cgImage: image).jpegData(compressionQuality: 0.6) else {
          completion(nil)
          return
        }
        let file = directory.appendingPathComponent("\(UUID().uuidString).jpg")
        do {
          try data.write(to: file, options: .atomic)
          completion(file.absoluteString)
        } catch {
          completion(nil)
        }
      }
    }
  }
}
