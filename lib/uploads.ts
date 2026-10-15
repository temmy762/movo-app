/**
 * Uploaded files (chauffeur documents, profile and vehicle photos) are checked
 * by their actual content, and only photos/PDFs are ever shown in the browser.
 * An HTML or SVG file posing as a photo would otherwise run code on the Movo
 * site — in an admin's session when they open it.
 */

/** Real type of an allowed photo from its first bytes, else null */
export function sniffImageType(b: Buffer): string | null {
  const ascii = (start: number, end: number) => b.subarray(start, end).toString("latin1");
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (b.length >= 12 && ascii(4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(ascii(8, 12))) return "image/heic";
  return null;
}

/** Photo or PDF (chauffeur documents), else null */
export function sniffDocumentType(b: Buffer): string | null {
  if (b.length >= 5 && b.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return sniffImageType(b);
}

const VIEWABLE = /^(image\/(jpeg|png|gif|webp|heic)|application\/pdf)$/;

/** Response headers for serving a stored file: photos/PDFs display, anything
    else (e.g. stored before uploads were checked) is downloaded, never rendered */
export function safeFileHeaders(mime: string, fileName?: string): Record<string, string> {
  const viewable = VIEWABLE.test(mime);
  return {
    "Content-Type": viewable ? mime : "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    ...(viewable && mime !== "application/pdf"
      ? { "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox" }
      : {}),
    ...(fileName || !viewable
      ? { "Content-Disposition": `${viewable ? "inline" : "attachment"}; filename="${encodeURIComponent(fileName || "file")}"` }
      : {}),
  };
}
