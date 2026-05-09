

import {
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

const MEDIA_COLLECTION = 'mediaFiles';

export const insertMediaFile = async (fileData) => {
  const ref = await addDoc(collection(db, MEDIA_COLLECTION), {
    ...fileData,
    uploadedAt: serverTimestamp(),
  });
  return { id: ref.id, ...fileData };
};

export const findMediaFilesByCategory = async (category) => {
  const q = query(
    collection(db, MEDIA_COLLECTION),
    where('category', '==', category)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const findAllMediaFiles = async () => {
  const snap = await getDocs(collection(db, MEDIA_COLLECTION));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const removeMediaFile = async (fileId) => {
  await deleteDoc(doc(db, MEDIA_COLLECTION, fileId));
};
