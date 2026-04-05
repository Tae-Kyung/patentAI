/**
 * Escape HTML special characters to prevent XSS in generated HTML content.
 * Optionally converts newlines to <br/> tags.
 */
export function escapeHtml(str: string, options?: { nl2br?: boolean }): string {
  let result = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  if (options?.nl2br) {
    result = result.replace(/\n/g, '<br/>')
  }
  return result
}
