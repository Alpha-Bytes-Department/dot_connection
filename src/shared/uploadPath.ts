import path from "path";

/**
 * Convert uploaded absolute/disk path to public static URL path.
 * Example:
 * - C:\proj\uploads\images\a.webp -> /images/a.webp
 * - /app/uploads/images/a.webp -> /images/a.webp
 */
export const toPublicUploadPath = (inputPath: string): string => {
  const normalized = inputPath.replace(/\\/g, "/");
  const marker = "/uploads/";
  const markerIndex = normalized.lastIndexOf(marker);

  if (markerIndex !== -1) {
    const suffix = normalized.slice(markerIndex + marker.length);
    return `/${suffix.replace(/^\/+/, "")}`;
  }

  return `/${path.basename(normalized)}`;
};

