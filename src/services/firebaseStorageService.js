import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  getMetadata
} from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import app, { firebaseConfig } from '../firebaseConfig';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const storage = getStorage(app);

const BUCKET_NAME = firebaseConfig.storageBucket;
const BUCKET_URL = `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o`;

const uploadCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const compressImage = (file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          
          resolve(compressedFile);
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

export const uploadFileToFirebaseStorage = async (file, folder = 'tourismSites/images', options = {}) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً لرفع الملفات');
    }

    const {
      compress = true,
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      onProgress = null
    } = options;

    let processedFile = file;
    if (compress && file.type.startsWith('image/')) {
      processedFile = await compressImage(file, quality, maxWidth, maxHeight);
    }

    if (processedFile.size > 8 * 1024 * 1024) {
      throw new Error('حجم الملف كبير جداً. الحد الأقصى 8 ميجابايت.');
    }

    if (!processedFile.type.startsWith('image/') && !processedFile.type.startsWith('video/')) {
      throw new Error('نوع الملف غير مدعوم. يُسمح بالصور والمقاطع المرئية فقط.');
    }

    const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
    if (uploadCache.has(cacheKey)) {
      const cached = uploadCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.result;
      } else {
        uploadCache.delete(cacheKey);
      }
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${fileId}_${processedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    const metadata = {
      contentType: processedFile.type,
      cacheControl: 'public,max-age=31536000',
      customMetadata: {
        originalName: file.name,
        originalSize: file.size.toString(),
        compressedSize: processedFile.size.toString(),
        uploadedAt: new Date().toISOString(),
        fileId: fileId,
        uploadedBy: user.email || user.uid,
        folder: folder,
        compressed: compress.toString()
      }
    };
    
    const uploadTask = uploadBytesResumable(storageRef, processedFile, metadata);
    
    let lastReportedProgress = 0;
    
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          
          if (progress - lastReportedProgress >= 5 || progress >= 100) {
            lastReportedProgress = progress;
            
            if (onProgress) {
              onProgress(progress);
            }
          }
        },
        (error) => {
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
    
    const downloadURL = await getDownloadURL(storageRef);
    
    const result = {
      id: fileId,
      url: downloadURL,
      name: file.name,
      type: file.type,
      size: file.size,
      compressedSize: processedFile.size,
      storagePath: storageRef.fullPath,
      storageRef: storageRef.name,
      folder: folder,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.email || user.uid,
      isFirebaseStorage: true,
      compressed: compress,
      metadata: metadata
    };

    uploadCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    if (uploadCache.size > 50) {
      const oldEntries = Array.from(uploadCache.entries())
        .filter(([_, value]) => Date.now() - value.timestamp > CACHE_TTL);
      oldEntries.forEach(([key]) => uploadCache.delete(key));
    }
    
    return result;
    
  } catch (error) {
    if (error.code === 'storage/unauthorized') {
      throw new Error('ليس لديك صلاحية لرفع الملفات. تأكد من تسجيل الدخول وتأكيد البريد الإلكتروني.');
    } else if (error.code === 'storage/canceled') {
      throw new Error('تم إلغاء عملية الرفع.');
    } else if (error.code === 'storage/unknown') {
      throw new Error('حدث خطأ غير معروف في Firebase Storage.');
    } else if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error('تم تجاوز حد المحاولات. حاول مرة أخرى لاحقاً.');
    } else if (error.code === 'storage/quota-exceeded') {
      throw new Error('تم تجاوز حد التخزين المسموح.');
    }
    
    throw new Error(`فشل في رفع الملف: ${error.message}`);
  }
};

export const uploadMultipleFilesToFirebase = async (files, folder = 'tourismSites/images', options = {}) => {
  const {
    maxConcurrent = 3,
    onProgress = null,
    ...uploadOptions
  } = options;

  const results = [];
  const errors = [];
  
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    if (i + maxConcurrent < files.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  if (errors.length > 0) {
  }

  return {
    results,
    errors,
    totalFiles: files.length,
    successCount: results.length,
    errorCount: errors.length
  };
};

export const deleteFileFromFirebaseStorage = async (storagePath) => {
  try {
    const fileRef = ref(storage, storagePath);
    await deleteObject(fileRef);
    return { success: true, path: storagePath };
  } catch (error) {
    return { success: false, path: storagePath, error };
  }
};

export const getFirebaseDownloadURL = async (storagePath) => {
  try {
    const fileRef = ref(storage, storagePath);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    return null;
  }
};

export const getFileMetadata = async (storagePath) => {
  try {
    if (!storagePath) return null;
    
    const fileRef = ref(storage, storagePath);
    const metadata = await getMetadata(fileRef);
    
    return metadata;
    
  } catch (error) {
    return null;
  }
};

export const testFirebaseStorageConnection = async () => {
  try {
    const testBlob = new Blob(['Firebase Storage Test'], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test.png', { type: 'image/png' });

    const result = await uploadFileToFirebaseStorage(testFile, 'test');
    
    if (result && result.storagePath) {
      const fileRef = ref(storage, result.storagePath);
      await deleteObject(fileRef);
    }
    
    return { success: true, message: 'الاتصال ناجح' };
  } catch (error) {
    let errorMessage = 'فشل اختبار الاتصال بـ Firebase Storage.';
    if (error.code) {
      switch (error.code) {
        case 'storage/unauthorized':
          errorMessage = 'خطأ صلاحيات: ليس لديك إذن للوصول إلى Storage.';
          break;
        case 'storage/object-not-found':
          errorMessage = 'خطأ: الملف غير موجود. قد تكون مشكلة في اسم الـ Bucket.';
          break;
        case 'storage/canceled':
          errorMessage = 'تم إلغاء العملية.';
          break;
        default:
          errorMessage = `فشل الاتصال: ${error.code}`;
      }
    }
    
    return { success: false, message: errorMessage, error };
  }
};

export const getStorageStats = async (folder = 'tourismSites') => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً');
    }

    const storageRef = ref(storage, folder);
    const metadata = await getMetadata(storageRef);
    
    return {
      folder: folder,
      size: metadata.size || 0,
      updated: metadata.updated || new Date().toISOString(),
      customMetadata: metadata.customMetadata || {}
    };
  } catch (error) {
    throw error;
  }
};

const saveToFirestore = async (fileDetails) => {
  try {
    const docRef = await addDoc(collection(db, 'storageFiles'), {
      ...fileDetails,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    return null;
  }
};

export const getVideoFromStorage = async (videoPath = 'header_video.mp4') => {
  try {
    const videoRef = ref(storage, videoPath);
    const url = await getDownloadURL(videoRef);
    
    return {
      url,
      path: videoPath,
      isFirebaseStorage: true,
      loadedAt: new Date().toISOString()
    };
  } catch (error) {
    
    
    if (error.code === 'storage/object-not-found') {
      throw new Error(`الفيديو غير موجود في المسار: ${videoPath}`);
    } else if (error.code === 'storage/unauthorized') {
      throw new Error('ليس لديك صلاحية للوصول إلى هذا الفيديو');
    } else {
      throw new Error(`خطأ في تحميل الفيديو: ${error.message}`);
    }
  }
};

export const uploadVideoToStorage = async (videoFile, folder = 'videos', options = {}) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('يجب تسجيل الدخول أولاً لرفع الفيديو');
    }

    if (!videoFile.type.startsWith('video/')) {
      throw new Error('الملف المحدد ليس فيديو');
    }

    const {
      onProgress = null,
      maxSize = 100 * 1024 * 1024 
    } = options;

    if (videoFile.size > maxSize) {
      throw new Error(`حجم الفيديو كبير جداً. الحد الأقصى ${Math.round(maxSize / (1024 * 1024))} ميجابايت.`);
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileName = `${fileId}_${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    const storageRef = ref(storage, `${folder}/${fileName}`);
    
    const metadata = {
      contentType: videoFile.type,
      cacheControl: 'public,max-age=31536000',
      customMetadata: {
        originalName: videoFile.name,
        originalSize: videoFile.size.toString(),
        uploadedAt: new Date().toISOString(),
        fileId: fileId,
        uploadedBy: user.email || user.uid,
        folder: folder,
        fileType: 'video'
      }
    };
    
    const uploadTask = uploadBytesResumable(storageRef, videoFile, metadata);
    
    let lastReportedProgress = 0;
    
    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          
          if (progress - lastReportedProgress >= 5 || progress >= 100) {
            lastReportedProgress = progress;
            
            if (onProgress) {
              onProgress(progress);
            }
          }
        },
        (error) => {
          reject(error);
        },
        () => {
          resolve();
        }
      );
    });
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      id: fileId,
      url: downloadURL,
      name: videoFile.name,
      type: videoFile.type,
      size: videoFile.size,
      storagePath: storageRef.fullPath,
      storageRef: storageRef.name,
      folder: folder,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.email || user.uid,
      isFirebaseStorage: true,
      metadata: metadata
    };
    
  } catch (error) {
    throw error;
  }
};

export const checkVideoExists = async (videoPath = 'header_video.mp4') => {
  try {
    const videoRef = ref(storage, videoPath);
    const metadata = await getMetadata(videoRef);
    
    return {
      exists: true,
      path: videoPath,
      metadata: metadata,
      size: metadata.size,
      contentType: metadata.contentType,
      updated: metadata.updated
    };
  } catch (error) {
    
    return {
      exists: false,
      path: videoPath,
      error: error.message,
      code: error.code
    };
  }
};

export const ensureVideoExists = async (videoPath = 'header_video.mp4', fallbackUrl = null) => {
  try {
    
    const checkResult = await checkVideoExists(videoPath);
    
    if (checkResult.exists) {
      return await getVideoFromStorage(videoPath);
    }
    
    
    if (fallbackUrl) {
      return {
        url: fallbackUrl,
        path: videoPath,
        isFirebaseStorage: false,
        isFallback: true,
        loadedAt: new Date().toISOString()
      };
    }
    
    throw new Error(`الفيديو غير موجود في المسار: ${videoPath}`);
    
  } catch (error) {
    throw error;
  }
};

export default {
  uploadFileToFirebaseStorage,
  uploadMultipleFilesToFirebase,
  deleteFileFromFirebaseStorage,
  getFirebaseDownloadURL,
  getFileMetadata,
  testFirebaseStorageConnection,
  getStorageStats,
  saveToFirestore
};