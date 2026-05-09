

import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';
import { auth } from '../../infrastructure/firebase/config.js';

export const subscribeToAuthState = (callback) => onAuthStateChanged(auth, callback);

export const signUp = async (email, password) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(result.user, {
      url:            window.location.origin + '/admin-login',
      handleCodeInApp: true,
    });
  } catch {
    throw new Error('فشل في إرسال رابط التفعيل. يرجى المحاولة مرة أخرى.');
  }
  await signOut(auth);
  return result;
};

export const signIn = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  if (!result.user.emailVerified) {
    await signOut(auth);
    const err = new Error('يجب تفعيل البريد الإلكتروني أولاً. يمكنك طلب إعادة إرسال رابط التفعيل.');
    err.code  = 'auth/email-not-verified';
    err.email = email;
    throw err;
  }
  return result;
};

export const resendVerification = async (email, password) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  try {
    await sendEmailVerification(result.user, {
      url:            window.location.origin + '/admin-login',
      handleCodeInApp: true,
    });
  } catch {
    throw new Error('فشل في إعادة إرسال رابط التفعيل.');
  }
  await signOut(auth);
  return true;
};

export const logOut = () => signOut(auth);
