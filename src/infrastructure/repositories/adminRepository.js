

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config.js';

const COLLECTIONS = {
  ADMINS:              'admins',
  SYSTEM_ADMINS:       'systemAdmins',
  ADMIN_INVITATIONS:   'adminInvitations',
  EMAIL_LOGS:          'emailLogs',
  SYSTEM_LOGS:         'systemLogs',
};

export const findAllAdmins = async () => {
  const snap = await getDocs(collection(db, COLLECTIONS.ADMINS));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const findAdminById = async (adminId) => {
  const snap = await getDoc(doc(db, COLLECTIONS.ADMINS, adminId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

export const upsertAdmin = async (userId, adminData) => {
  await setDoc(doc(db, COLLECTIONS.ADMINS, userId), {
    ...adminData,
    updatedAt: new Date().toISOString(),
  });
};

export const setAdminStatus = async (adminId, status) => {
  await updateDoc(doc(db, COLLECTIONS.ADMINS, adminId), { status });
};

export const removeAdmin = async (adminId) => {
  await deleteDoc(doc(db, COLLECTIONS.ADMINS, adminId));
};

export const isSystemAdmin = async (email) => {
  const q = query(
    collection(db, COLLECTIONS.SYSTEM_ADMINS),
    where('email', '==', email)
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

export const upsertSystemAdmin = async (userId, adminData) => {
  await setDoc(doc(db, COLLECTIONS.SYSTEM_ADMINS, userId), {
    ...adminData,
    updatedAt: new Date().toISOString(),
  });
};

export const insertInvitation = async (invitationData) => {
  const ref = await addDoc(collection(db, COLLECTIONS.ADMIN_INVITATIONS), {
    ...invitationData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const insertEmailLog = async (emailData) => {
  await addDoc(collection(db, COLLECTIONS.EMAIL_LOGS), {
    ...emailData,
    timestamp: serverTimestamp(),
  });
};

export const findSystemLogs = async (maxResults = 100) => {
  const q = query(
    collection(db, COLLECTIONS.SYSTEM_LOGS),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const checkUserPermissions = async (userId, email) => {
  const adminSnap       = await getDoc(doc(db, COLLECTIONS.ADMINS, userId));
  const systemAdminSnap = await getDoc(doc(db, COLLECTIONS.SYSTEM_ADMINS, userId));

  return {
    isAdmin:            adminSnap.exists()       && adminSnap.data().isActive,
    isSystemAdmin:      systemAdminSnap.exists() && systemAdminSnap.data().isActive,
    adminData:          adminSnap.exists()       ? adminSnap.data() : null,
    systemAdminData:    systemAdminSnap.exists() ? systemAdminSnap.data() : null,
  };
};

export { COLLECTIONS as ADMIN_COLLECTIONS };
