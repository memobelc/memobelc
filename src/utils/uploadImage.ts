import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '../../FirebaseConfig';

export async function uploadImageToFirebase(uri: string, path: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

const DATA_IMG_SRC_RE =
  /(<img\b[^>]*?\bsrc=["'])(data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+)(["'])/gi;

export async function replaceDataImagesWithUploads(
  html: string,
  pathPrefix: string,
): Promise<string> {
  const matches = [...html.matchAll(DATA_IMG_SRC_RE)];
  if (!matches.length) return html;

  let next = html;
  let index = 0;
  for (const match of matches) {
    const rawSrc = match[2];
    const dataUrl = rawSrc.replace(/\s+/g, '');
    const mime = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);/i)?.[1] || 'jpeg';
    const ext = mime === 'jpeg' ? 'jpg' : mime.replace(/[^a-z0-9]/gi, '') || 'jpg';
    const url = await uploadImageToFirebase(
      dataUrl,
      `${pathPrefix}/${Date.now()}_${index}.${ext}`,
    );
    next = next.split(rawSrc).join(url);
    index += 1;
  }
  return next;
}
