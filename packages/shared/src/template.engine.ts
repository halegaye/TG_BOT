/**
 * Safe Regex-based Template Engine for Telegram Messages
 * Supports: {{first_name}}, {{last_name}}, {{username}}, {{bot_name}}, {{brand_name}}, {{start_parameter}}
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, string | undefined | null>,
): string {
  if (!template) return '';

  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const value = variables[key];
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  });
}

/**
 * Escapes special characters for Telegram Parse Modes (HTML or MARKDOWN_V2)
 */
export function sanitizeTextForParseMode(text: string, parseMode: 'HTML' | 'MARKDOWN_V2' | string = 'HTML'): string {
  if (!text) return '';

  if (parseMode === 'HTML') {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  if (parseMode === 'MARKDOWN_V2') {
    // MarkdownV2 special characters: _ * [ ] ( ) ~ ` > # + - = | { } . !
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  return text;
}
