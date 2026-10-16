/**
 * Permitted YouTube hostnames for video URL validation.
 */
const PERMITTED_YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "music.youtube.com",
]);

/**
 * Standard 11-character YouTube video ID regex: ^[a-zA-Z0-9_-]{11}$
 */
const YOUTUBE_VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts the 11-character YouTube video ID from a watch URL, youtu.be shortlink,
 * embed URL, shorts URL, etc.
 * Returns null if the URL is invalid or the host is not an allowed YouTube domain.
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== "string") {
    return null;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  let parsed: URL;
  try {
    const urlWithProtocol = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    parsed = new URL(urlWithProtocol);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  // Reject URLs with embedded credentials (e.g. user:pass@host)
  if (parsed.username || parsed.password) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!PERMITTED_YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  let videoId: string | null = null;

  if (hostname === "youtu.be") {
    // https://youtu.be/VIDEO_ID
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      videoId = segments[0];
    }
  } else {
    // youtube.com, www.youtube.com, m.youtube.com, music.youtube.com
    if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.startsWith("/embed/")) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && segments[0] === "embed") {
        videoId = segments[1];
      }
    } else if (parsed.pathname.startsWith("/shorts/")) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && segments[0] === "shorts") {
        videoId = segments[1];
      }
    } else if (parsed.pathname.startsWith("/v/")) {
      const segments = parsed.pathname.split("/").filter(Boolean);
      if (segments.length >= 2 && segments[0] === "v") {
        videoId = segments[1];
      }
    }
  }

  if (videoId && YOUTUBE_VIDEO_ID_REGEX.test(videoId)) {
    return videoId;
  }

  return null;
}

/**
 * Returns the canonical YouTube embed URL for a given video ID.
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Validates and normalises a YouTube URL to the canonical embed format.
 * Returns { ok: true, embedUrl } on success, or { ok: false, error } if invalid.
 */
export function normaliseYouTubeUrl(
  url: string
): { ok: true; embedUrl: string } | { ok: false; error: string } {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    return { ok: false, error: "Invalid YouTube URL format." };
  }
  return { ok: true, embedUrl: getYouTubeEmbedUrl(videoId) };
}
