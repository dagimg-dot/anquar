export const IMG_SRC_REGEX = /src="([^"]+)"/;
export const IMG_BLOB_REGEX = /<img[^>]+src="(blob:[^"]+)"/g;

export function uint8ArrayToDataUrl(
  bytes: Uint8Array,
  mimeType: string
): string {
  const base64 = btoa(
    Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join("")
  );
  return `data:${mimeType};base64,${base64}`;
}
