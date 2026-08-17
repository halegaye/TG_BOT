export interface InlineButtonDto {
  text: string;
  url: string;
  sameRow?: boolean;
}

/**
 * Ensures button URLs have http:// or https:// scheme.
 * Prepend https:// if protocol is omitted (e.g. t.me/... or site.com).
 */
export function normalizeButtonUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  let trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('file:')) {
    return null;
  }
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
}

export function validateInlineButtonUrl(url: string): boolean {
  const normalized = normalizeButtonUrl(url);
  return normalized !== null;
}

/**
 * Converts InlineButtonDto array into Telegram's inline_keyboard matrix format.
 * Respects sameRow flag to put buttons on the same row or a new row.
 */
export function buildInlineKeyboard(
  buttons?: InlineButtonDto[] | null,
): { inline_keyboard: Array<Array<{ text: string; url: string }>> } | undefined {
  if (!buttons || !Array.isArray(buttons) || buttons.length === 0) {
    return undefined;
  }

  const validButtons: Array<{ text: string; url: string; sameRow?: boolean }> = [];
  for (const btn of buttons) {
    if (btn && btn.text && btn.text.trim()) {
      const normalizedUrl = normalizeButtonUrl(btn.url);
      if (normalizedUrl) {
        validButtons.push({
          text: btn.text.trim(),
          url: normalizedUrl,
          sameRow: !!btn.sameRow,
        });
      }
    }
  }

  if (validButtons.length === 0) return undefined;

  const rows: Array<Array<{ text: string; url: string }>> = [];
  let currentRow: Array<{ text: string; url: string }> = [];

  for (const btn of validButtons) {
    const item = { text: btn.text, url: btn.url };

    if (btn.sameRow && currentRow.length > 0 && currentRow.length < 8) {
      currentRow.push(item);
    } else {
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      currentRow = [item];
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return { inline_keyboard: rows };
}
