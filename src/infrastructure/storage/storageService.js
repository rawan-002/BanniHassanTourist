

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { storage } from '../firebase/config.js';

const CACHE_TTL = 5 * 60 * 1000; 
const uploadCache = new Map();

export const uploadFile = async (file, folder = 'tourismSites/images', onProgress = null) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error('يجب تسجيل الدخول أولاً لرفع الملفات');

  
  const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
  const cached = uploadCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }

  const fileId    = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const fileName  = `${fileId}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);

  const metadata = {
    contentType: file.type,
    cacheControl: 'public,max-age=31536000',
    customMetadata: {
      originalName:   file.name,
      originalSize:   file.size.toString(),
      uploadedAt:     new Date().toISOString(),
      fileId,
      uploadedBy:     user.email || user.uid,
      folder,
    },
  };

  const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  let lastProgress = 0;

  await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress && progress - lastProgress >= 5) {
          lastProgress = progress;
          onProgress(progress);
        }
      },
      reject,
      resolve
    );
  });

  const downloadURL = await getDownloadURL(storageRef);

  const result = {
    id:          fileId,
    url:         downloadURL,
    name:        file.name,
    type:        file.type,
    size:        file.size,
    storagePath: storageRef.fullPath,
    folder,
    uploadedAt:  new Date().toISOString(),
    uploadedBy:  user.email || user.uid,
  };

  
  if (uploadCache.size > 50) {
    for (const [key, val] of uploadCache.entries()) {
      if (Date.now() - val.timestamp > CACHE_TTL) uploadCache.delete(key);
    }
  }
  uploadCache.set(cacheKey, { result, timestamp: Date.now() });

  return result;
};

export const deleteFile = async (storagePath) => {
  try {
    await deleteObject(ref(storage, storagePath));
    return { success: true, path: storagePath };
  } catch (error) {
    return { success: false, path: storagePath, error };
  }
};

export const getDownloadUrl = async (storagePath) => {
  try {
    return await getDownloadURL(ref(storage, storagePath));
  } catch {
    return null;
  }
};

export const getFileMetadata = async (storagePath) => {
  try {
    return await getMetadata(ref(storage, storagePath));
  } catch {
    return null;
  }
};

export const getVideoUrl = async (videoPath = 'header_video.mp4') => {
  try {
    const url = await getDownloadURL(ref(storage, videoPath));
    return { url, path: videoPath, isFirebaseStorage: true };
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      throw new Error(`الفيديو غير موجود في المسار: ${videoPath}`);
    }
    throw new Error(`خطأ في تحميل الفيديو: ${error.message}`);
  }
};

export const testFirebaseStorageConnection = async () => {
  try {
    const testBlob = new Blob(['test'], { type: 'image/png' });
    const testFile = new File([testBlob], 'test.png', { type: 'image/png' });
    const result   = await uploadFile(testFile, 'test');
    if (result?.storagePath) await deleteFile(result.storagePath);
    return { success: true, message: 'الاتصال ناجح' };
  } catch (error) {
    return { success: false, message: `فشل الاتصال: ${error.message}`, error };
  }
};

export const testLocalStorage = async () => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    canvas.getContext('2d').fillRect(0, 0, 1, 1);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve({ success: true, message: 'التخزين المحلي متاح ويعمل بشكل صحيح' });
      }, 'image/png');
    });
  } catch (error) {
    return { success: false, message: `فشل: ${error.message}` };
  }
};

export const ensureVideoExists = async (videoPath = 'header_video.mp4', fallbackUrl = null) => {
  try {
    return await getVideoUrl(videoPath);
  } catch {
    if (fallbackUrl) return { url: fallbackUrl, path: videoPath, isFirebaseStorage: false, isFallback: true };
    throw new Error(`الفيديو غير موجود في المسار: ${videoPath}`);
  }
};
