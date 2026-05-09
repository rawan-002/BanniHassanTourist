

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

const COLLECTIONS = {
  TOURISM_SITES: 'tourismSites',
  CAFES:         'cafes',
  DAMS:          'dams',
  PARKS:         'parks',
  HOUSING:       'housing',
  VIEWPOINTS:    'viewpoints',
  FARMS:         'farms',
};

export const findTourismSiteById = async (siteId) => {
  const snap = await getDoc(doc(db, COLLECTIONS.TOURISM_SITES, siteId));
  if (!snap.exists()) throw new Error('الموقع السياحي غير موجود');
  return { id: snap.id, ...snap.data() };
};

export const findAllTourismSites = async () => {
  const snap = await getDocs(collection(db, COLLECTIONS.TOURISM_SITES));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const findTourismSitesByCategory = async (category) => {
  const q = query(
    collection(db, COLLECTIONS.TOURISM_SITES),
    where('category', '==', category)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const findSitesPaginated = async (category, lastDoc = null, pageSize = 10) => {
  const collectionName = COLLECTIONS[category.toUpperCase()];
  if (!collectionName) throw new Error(`Unknown category: ${category}`);

  let q = query(
    collection(db, collectionName),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) q = query(q, startAfter(lastDoc));

  const snap = await getDocs(q);
  return {
    sites:   snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
};

export const insertTourismSite = async (documentData) => {
  const ref = await addDoc(collection(db, COLLECTIONS.TOURISM_SITES), {
    ...documentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateTourismSiteById = async (siteId, updatedFields) => {
  await updateDoc(doc(db, COLLECTIONS.TOURISM_SITES, siteId), {
    ...updatedFields,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTourismSiteById = async (siteId) => {
  const snap = await getDoc(doc(db, COLLECTIONS.TOURISM_SITES, siteId));
  if (!snap.exists()) throw new Error('الموقع السياحي غير موجود');
  await deleteDoc(doc(db, COLLECTIONS.TOURISM_SITES, siteId));
  return snap.data();
};

export const subscribeTourismSitesByCategory = (category, onData, onError) => {
  const q = query(
    collection(db, COLLECTIONS.TOURISM_SITES),
    where('category', '==', category)
  );

  return onSnapshot(q, (snap) => {
    const sites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onData(sites);
  }, onError);
};

export { COLLECTIONS };
