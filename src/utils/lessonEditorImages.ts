export type LessonImage = {
  index: number;
  tag: string;
  src: string;
  widthPct: number;
  start: number;
  end: number;
};

export const APPLY_LESSON_IMAGE_SIZES_JS = `
(function(){
  var imgs = document.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var title = imgs[i].getAttribute('title') || '';
    var match = title.match(/w=(\\d{1,3})/);
    if (match) {
      imgs[i].style.width = match[1] + '%';
      imgs[i].style.height = 'auto';
      imgs[i].style.maxWidth = '100%';
    }
  }
})();
`;

export const LESSON_IMAGE_EDITOR_CSS = `
img {
  height: auto;
  max-width: 100%;
  border-radius: 8px;
  cursor: pointer;
}
img.ProseMirror-selectednode {
  outline: 3px solid #68cef8;
}
`;

export function parseWidthPct(title?: string | null): number {
  const match = (title || '').match(/w=(\d{1,3})/);
  if (!match) return 100;
  return Math.min(100, Math.max(20, parseInt(match[1], 10)));
}

export function listLessonImages(html: string): LessonImage[] {
  const images: LessonImage[] = [];
  const re = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = re.exec(html))) {
    const tag = match[0];
    images.push({
      index,
      tag,
      src: tag.match(/\bsrc=["']([^"']*)["']/i)?.[1] || '',
      widthPct: parseWidthPct(tag.match(/\btitle=["']([^"']*)["']/i)?.[1]),
      start: match.index,
      end: match.index + tag.length,
    });
    index += 1;
  }
  return images;
}

function setImgWidthTitle(tag: string, pct: number): string {
  const next = Math.min(100, Math.max(20, Math.round(pct)));
  if (/\btitle=["'][^"']*["']/i.test(tag)) {
    return tag.replace(/\btitle=["'][^"']*["']/i, `title="w=${next}"`);
  }
  return tag.replace(/<img\b/i, `<img title="w=${next}"`);
}

export function resizeLessonImage(html: string, imageIndex: number, pct: number): string {
  const image = listLessonImages(html)[imageIndex];
  if (!image) return html;
  return html.slice(0, image.start) + setImgWidthTitle(image.tag, pct) + html.slice(image.end);
}

export function deleteLessonImage(html: string, imageIndex: number): string {
  const image = listLessonImages(html)[imageIndex];
  if (!image) return html;
  return html
    .slice(0, image.start)
    .concat(html.slice(image.end))
    .replace(/<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '');
}

type Segment = { type: 'html' | 'img'; value: string };

function splitImageSegments(html: string): Segment[] {
  const parts: Segment[] = [];
  const re = /<img\b[^>]*>/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    if (match.index > last) {
      parts.push({ type: 'html', value: html.slice(last, match.index) });
    }
    parts.push({ type: 'img', value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < html.length) {
    parts.push({ type: 'html', value: html.slice(last) });
  }
  return parts;
}

function hasVisibleHtml(value: string): boolean {
  return value.replace(/<p(?:\s[^>]*)?>\s*(?:<br\s*\/?>)?\s*<\/p>/gi, '').replace(/\s+/g, '').length > 0;
}

export function extractInlineImages(html: string): string {
  const re =
    /<p(\b[^>]*)>((?:(?!<\/p>)[\s\S])*)<img(\b[^>]*)>((?:(?!<\/p>)[\s\S])*)<\/p>/i;
  let current = html;
  for (let i = 0; i < 20; i += 1) {
    const next = current.replace(re, (_all, attrs, before, imgAttrs, after) => {
      const open = `<p${attrs}>`;
      const beforePart = String(before).trim() ? `${open}${before}</p>` : '';
      const afterPart = String(after).trim() ? `${open}${after}</p>` : '';
      return `${beforePart}<img${imgAttrs}>${afterPart}`;
    });
    if (next === current) break;
    current = next;
  }
  return current;
}

export function moveLessonImage(
  html: string,
  imageIndex: number,
  direction: 'up' | 'down',
): string {
  const parts = splitImageSegments(extractInlineImages(html));
  const imgIndexes = parts
    .map((part, index) => (part.type === 'img' ? index : -1))
    .filter((index) => index >= 0);
  const partIndex = imgIndexes[imageIndex];
  if (partIndex == null) return html;

  const step = direction === 'up' ? -1 : 1;
  let swapWith = partIndex + step;
  while (
    swapWith >= 0 &&
    swapWith < parts.length &&
    parts[swapWith].type === 'html' &&
    !hasVisibleHtml(parts[swapWith].value)
  ) {
    swapWith += step;
  }
  if (swapWith < 0 || swapWith >= parts.length) return parts.map((part) => part.value).join('');

  const next = [...parts];
  const current = next[partIndex];
  next[partIndex] = next[swapWith];
  next[swapWith] = current;
  return next.map((part) => part.value).join('');
}

export function canMoveLessonImage(
  html: string,
  imageIndex: number,
  direction: 'up' | 'down',
): boolean {
  const current = extractInlineImages(html);
  return moveLessonImage(current, imageIndex, direction) !== current;
}

export function applyLessonImageSizes(html: string): string {
  return html.replace(/<img\b[^>]*>/gi, (tag) => {
    const title = tag.match(/\btitle=["']([^"']*)["']/i)?.[1] || '';
    if (!/w=\d+/.test(title)) return tag;
    const pct = parseWidthPct(title);
    const style = `style="width:${pct}%;height:auto;max-width:100%"`;
    if (/\bstyle=["'][^"']*["']/i.test(tag)) {
      return tag.replace(/\bstyle=["'][^"']*["']/i, style);
    }
    return tag.replace(/<img\b/i, `<img ${style}`);
  });
}
