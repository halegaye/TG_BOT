export interface InlineButtonDto {
  text: string;
  url: string;
  sameRow?: boolean;
}

/**
 * Validates that button URLs strictly use http:// or https:// schemes.
 * Rejects dangerous protocols like javascript:, data:, file:, etc.
 */
export function validateInlineButtonUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
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

  const validButtons = buttons.filter(
    (btn) => btn && btn.text && validateInlineButtonUrl(btn.url),
  );

  if (validButtons.length === 0) return undefined;

  const rows: Array<Array<{ text: string; url: string }>> = [];
  let currentRow: Array<{ text: string; url: string }> = [];

  for (const btn of validButtons) {
    const item = { text: btn.text.trim(), url: btn.url.trim() };

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
