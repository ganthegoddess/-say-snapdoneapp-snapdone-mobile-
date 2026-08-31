import UserNotifications

/// SnapDone Notification Service Extension: attaches the memory image from a
/// SnapBack push so the lock-screen notification shows the actual photo/
/// screenshot the user entrusted to PIP. Falls back to text-only when no image
/// is present (voice/text memories).
class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    bestAttemptContent =
      (request.content.mutableCopy() as? UNMutableNotificationContent)

    if let bestAttemptContent = bestAttemptContent {
      if let imageUrl = imageUrlString(from: request.content.userInfo) {
        downloadAndAttachImage(url: imageUrl, to: bestAttemptContent) { content in
          contentHandler(content)
        }
      } else {
        // No image: keep the text-only SnapBack.
        contentHandler(bestAttemptContent)
      }
    } else {
      contentHandler(request.content)
    }
  }

  /// Resolve the image URL from any of the payload shapes the Expo push
  /// service can produce: `body._richContent.image`, top-level `richContent`,
  /// or a flat `imageUrl` custom-data string.
  private func imageUrlString(from userInfo: [AnyHashable: Any]) -> URL? {
    if let body = userInfo["body"] as? [String: Any],
      let rich = body["_richContent"] as? [String: Any],
      let image = rich["image"] as? String,
      let url = URL(string: image) {
      return url
    }
    if let rich = userInfo["_richContent"] as? [String: Any],
      let image = rich["image"] as? String,
      let url = URL(string: image) {
      return url
    }
    if let rich = userInfo["richContent"] as? [String: Any],
      let image = rich["image"] as? String,
      let url = URL(string: image) {
      return url
    }
    if let image = userInfo["imageUrl"] as? String,
      let url = URL(string: image) {
      return url
    }
    return nil
  }

  private func downloadAndAttachImage(
    url: URL,
    to content: UNMutableNotificationContent,
    completion: @escaping (UNNotificationContent) -> Void
  ) {
    let task = URLSession.shared.downloadTask(with: url) { temporaryFileLocation, _, _ in
      guard let temporaryFileLocation = temporaryFileLocation else {
        completion(content)
        return
      }

      let fileManager = FileManager.default
      let tempDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
      let targetFileName = "snapdone-\(UUID().uuidString).jpg"
      let targetUrl = tempDirectory.appendingPathComponent(targetFileName)

      try? fileManager.removeItem(at: targetUrl)

      do {
        try fileManager.moveItem(at: temporaryFileLocation, to: targetUrl)
        let attachment = try UNNotificationAttachment(
          identifier: "image",
          url: targetUrl,
          options: nil
        )
        content.attachments = [attachment]
      } catch {
        print("SnapDone NSE attachment error: \(error.localizedDescription)")
      }

      completion(content)
    }

    task.resume()
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler = contentHandler,
      let bestAttemptContent = bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }
}
