import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '../../FirebaseConfig';

export async function uploadImageToFirebase(uri: string, path: string) {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
