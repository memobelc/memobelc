export type ILessonAnnotation = {
  _id: string;
  lesson_id: string;
  user_id: string;
  author_name: string;
  is_public: boolean;
  is_mine?: boolean;
  start_offset: number;
  end_offset: number;
  quote: string;
  highlight_color: string;
  comment: string;
};

export const ANNOTATION_COLORS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8'] as const;

export function resolveLessonHtml(contentHtml?: string | null, description?: string | null): string {
  if (contentHtml?.trim()) return contentHtml;
  if (description?.trim()) {
    const escaped = description
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`;
  }
  return '';
}

export function htmlToPlainText(html: string): string {
  if (typeof document === 'undefined') {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n+/g, '\n')
      .trim();
  }
  const el = document.createElement('div');
  el.innerHTML = html;
  return el.textContent || '';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function wrapPlainRange(
  root: HTMLElement,
  start: number,
  end: number,
  ann: ILessonAnnotation,
): boolean {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let startNode: Text | null = null;
  let startOff = 0;
  let endNode: Text | null = null;
  let endOff = 0;
  let node = walker.nextNode() as Text | null;

  while (node) {
    const len = node.textContent?.length ?? 0;
    if (!startNode && offset + len > start) {
      startNode = node;
      startOff = start - offset;
    }
    if (!endNode && offset + len >= end) {
      endNode = node;
      endOff = end - offset;
      break;
    }
    offset += len;
    node = walker.nextNode() as Text | null;
  }

  if (!startNode || !endNode) return false;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);
    const mark = document.createElement('mark');
    mark.setAttribute('data-annotation-id', ann._id);
    mark.style.backgroundColor = ann.highlight_color;
    mark.style.borderRadius = '2px';
    mark.style.padding = '0 1px';
    if (ann.is_public) {
      mark.style.outline = '1px solid #6366f1';
    }
    range.surroundContents(mark);
    return true;
  } catch {
    return false;
  }
}

export function applyAnnotationsToHtml(
  html: string,
  annotations: ILessonAnnotation[],
): string {
  if (!annotations.length) return html;

  if (typeof document !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div id="lesson-root">${html}</div>`, 'text/html');
    const root = doc.getElementById('lesson-root');
    if (!root) return html;
    const sorted = [...annotations].sort((a, b) => b.start_offset - a.start_offset);
    for (const ann of sorted) {
      if (!wrapPlainRange(root, ann.start_offset, ann.end_offset, ann)) {
        const quote = ann.quote?.trim();
        if (quote && root.innerHTML.includes(quote)) {
          root.innerHTML = root.innerHTML.replace(
            quote,
            `<mark data-annotation-id="${ann._id}" style="background-color:${ann.highlight_color};border-radius:2px;padding:0 1px;${ann.is_public ? 'outline:1px solid #6366f1;' : ''}">${escapeHtml(quote)}</mark>`,
          );
        }
      }
    }
    return root.innerHTML;
  }

  let result = html;
  for (const ann of [...annotations].sort((a, b) => b.quote.length - a.quote.length)) {
    const quote = ann.quote?.trim();
    if (!quote || !result.includes(quote)) continue;
    result = result.replace(
      quote,
      `<mark style="background-color:${ann.highlight_color}">${quote}</mark>`,
    );
  }
  return result;
}

export function getSelectionOffsets(
  root: HTMLElement,
): { start: number; end: number; quote: string } | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  const quote = range.toString().trim();
  if (!quote) return null;

  const pre = document.createRange();
  pre.selectNodeContents(root);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  return { start, end: start + range.toString().length, quote };
}
