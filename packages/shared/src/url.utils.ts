/**
 * Media URL Sanitizer & Normalizer for Telegram API
 * Transforms webpage album links (e.g. Imgur album, Giphy page) into direct image CDN URLs.
 */
export function sanitizeMediaUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Imgur Album/Gallery/Page link normalization
  // Matches: https://imgur.com/a/aQBiYFt, https://imgur.com/gallery/aQBiYFt, https://imgur.com/aQBiYFt
  const imgurMatch = trimmed.match(/^https?:\/\/(?:www\.|i\.)?imgur\.com\/(?:a\/|gallery\/)?([a-zA-Z0-9]+)(?:\.[a-zA-Z]+)?$/i);
  if (imgurMatch && imgurMatch[1]) {
    // If it's already i.imgur.com/xxx.jpg or .png, preserve or ensure format
    if (trimmed.includes('i.imgur.com') && /\.(jpg|jpeg|png|gif|webp)$/i.test(trimmed)) {
      return trimmed;
    }
    return `https://i.imgur.com/${imgurMatch[1]}.png`;
  }

  // 2. Giphy Webpage Normalization
  const giphyMatch = trimmed.match(/^https?:\/\/(?:www\.)?giphy\.com\/gifs\/(?:.*-)?([a-zA-Z0-9]+)/i);
  if (giphyMatch && giphyMatch[1]) {
    return `https://i.giphy.com/media/${giphyMatch[1]}/giphy.gif`;
  }

  return trimmed;
}
