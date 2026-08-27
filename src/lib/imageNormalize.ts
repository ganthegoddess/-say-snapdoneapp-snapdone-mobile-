import * as ImageManipulator from "expo-image-manipulator";

/**
 * Normalize a photo before upload so an iOS HEIC source can never silently
 * fail on the server (owner's bn17 blocker: "uploaded two pictures and they
 * both failed" — a client-side transfer failure with no server row).
 *
 * HEIC is the default format iOS cameras produce. Some servers/OCRs reject it;
 * re-encoding to JPEG (quality 0.85) guarantees a standard, always-uploadable
 * image while keeping file size reasonable for the AI pipeline.
 *
 * `expo-image-manipulator` writes JPEG by default. We run it only as insurance:
 * JPEG sources pass through a (near-)no-op re-encode for uniformity; if the
 * returned format is not HEIC we still return the cleaned JPEG, which is the
 * safest, most compatible representation for the server.
 *
 * Falls back to the original URI on any error — never blocks a capture.
 */
export async function normalizeImageForUpload(uri: string): Promise<string> {
  try {
    const ctx = ImageManipulator.ImageManipulator.manipulate(uri);
    const result = await ctx.renderAsync();
    const saved = await result.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.85,
    });
    if (saved?.uri) {
      return saved.uri;
    }
  } catch (err) {
    // Non-fatal: leave the original to the server's accepted-standard path.
    console.warn("Image normalization skipped:", err);
  }
  return uri;
}
