const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI']);

/**
 * Sanitize an admin-authored HTML fragment down to a small formatting
 * allowlist (paragraphs, bold, italic, lists). Strips every attribute and
 * unwraps anything else, keeping its text. Safe to pass to
 * dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

  function clean(node: Node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (!ALLOWED_TAGS.has(el.tagName)) {
          el.replaceWith(doc.createTextNode(el.textContent ?? ''));
          continue;
        }
        for (const attr of Array.from(el.attributes)) el.removeAttribute(attr.name);
        clean(el);
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove();
      }
    }
  }

  clean(doc.body);
  return doc.body.innerHTML;
}

/** Plain-text version of an HTML fragment, for meta tags and previews. */
export function htmlToText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
