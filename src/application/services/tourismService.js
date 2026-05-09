

import {
  findTourismSiteById,
  findAllTourismSites,
  findTourismSitesByCategory,
  findSitesPaginated,
  insertTourismSite,
  updateTourismSiteById,
  deleteTourismSiteById,
  subscribeTourismSitesByCategory,
} from '../../infrastructure/repositories/tourismRepository.js';

import {
  findMediaFilesByCategory,
  findAllMediaFiles,
  removeMediaFile,
} from '../../infrastructure/repositories/mediaRepository.js';

import {
  uploadFile,
  deleteFile,
  getDownloadUrl,
} from '../../infrastructure/storage/storageService.js';

import {
  compressImage,
  fileToBase64,
} from '../utils/imageUtils.js';

const mediaCache = new Map();
const CACHE_TTL  = 5 * 60 * 1000; 

const getCached = (key) => {
  const entry = mediaCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { mediaCache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => mediaCache.set(key, { data, timestamp: Date.now() });
export const clearCache = () => mediaCache.clear();

setInterval(clearCache, 10 * 60 * 1000);

const validateSiteData = (siteData) => {
  if (!siteData.title?.trim())       throw new Error('العنوان مطلوب');
  if (!siteData.description?.trim()) throw new Error('الوصف مطلوب');
  if (!siteData.category)            throw new Error('نوع الموقع مطلوب');
  if (!siteData.coordinates?.lat || !siteData.coordinates?.lon) {
    throw new Error('الإحداثيات مطلوبة');
  }
};

const uploadMediaFiles = async (files, folder) => {
  const results = [];
  const errors  = [];

  for (const file of files) {
    try {
      let processedFile = file;

      if (file.type?.startsWith('image/')) {
        processedFile = await compressImage(file);
      }

      
      if (processedFile.size <= 1 * 1024 * 1024) {
        const base64 = await fileToBase64(processedFile);
        results.push({
          id:       `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          url:      base64,
          name:     file.name,
          type:     file.type,
          isLocal:  true,
        });
      } else {
        const result = await uploadFile(processedFile, folder);
        results.push({ ...result, isLocal: false });
      }
    } catch (err) {
      errors.push({ fileName: file.name, error: err.message });
    }
  }

  return { results, errors };
};

const normalizeImages = (rawImages = [], fallbackImages = []) => {
  let images = [];

  if (Array.isArray(rawImages)) {
    images = rawImages.map(img => {
      if (typeof img === 'string') return { url: img };
      return { url: img.url || img.base64 || img.downloadURL, ...img };
    }).filter(img => img.url);
  }

  return images.length > 0 ? images : fallbackImages.slice(0, 3);
};

export const getTourismSiteById = async (siteId) => {
  const data = await findTourismSiteById(siteId);
  return {
    ...data,
    images: normalizeImages(data.images),
    videos: Array.isArray(data.videos)
      ? data.videos.map(v => typeof v === 'string' ? { url: v } : v)
      : [],
  };
};

export const getAllTourismSites = async () => {
  const sites = await findAllTourismSites();
  return sites.map(data => ({
    ...data,
    images: normalizeImages(data.images),
    videos: Array.isArray(data.videos)
      ? data.videos.map(v => typeof v === 'string' ? { url: v } : v)
      : [],
  }));
};

export const getTourismSitesByCategory = async (category) => {
  return await findTourismSitesByCategory(category);
};

export const getTourismSites = async (category, lastDoc = null, pageSize = 10) => {
  return await findSitesPaginated(category, lastDoc, pageSize);
};

export const addTourismSite = async (siteData, imageFiles = [], videoFiles = []) => {
  validateSiteData(siteData);

  const [imageUpload, videoUpload] = await Promise.all([
    uploadMediaFiles(imageFiles, 'tourismSites/images'),
    uploadMediaFiles(videoFiles, 'tourismSites/videos'),
  ]);

  
  const details = siteData.details?.length > 0
    ? await Promise.all(siteData.details.map(async (detail) => {
        const detailUpload = await uploadMediaFiles(detail.images || [], 'tourismSites/images');
        return { ...detail, images: detailUpload.results };
      }))
    : [];

  const documentData = {
    title:          String(siteData.title).trim(),
    description:    String(siteData.description).trim(),
    category:       String(siteData.category),
    coordinates:    { lat: Number(siteData.coordinates.lat), lon: Number(siteData.coordinates.lon) },
    address:        siteData.address?.trim()         || '',
    googleMapsUrl:  siteData.googleMapsUrl?.trim()   || '',
    rating:         Number(siteData.rating)          || 4.0,
    popularity:     siteData.popularity?.trim()      || '',
    openingHours:   siteData.openingHours?.trim()    || '',
    contactInfo:    siteData.contactInfo?.trim()     || '',
    price:          siteData.price?.trim()           || '',
    additionalInfo: siteData.additionalInfo?.trim()  || '',
    images:         imageUpload.results,
    videos:         videoUpload.results,
    details,
    totalImages:    imageUpload.results.length,
    totalVideos:    videoUpload.results.length,
    status:         'active',
    verified:       false,
  };

  const id = await insertTourismSite(documentData);
  return { id, success: true, data: { ...documentData, id } };
};

export const updateTourismSite = async (
  siteId,
  siteData,
  newImageFiles  = [],
  newVideoFiles  = [],
  removeImageIds = [],
  removeVideoIds = []
) => {
  const current = await findTourismSiteById(siteId);

  
  for (const id of removeImageIds) {
    try { await removeMediaFile(id); } catch {  }
  }
  for (const id of removeVideoIds) {
    try { await removeMediaFile(id); } catch {  }
  }

  let images = (current.images || []).filter(img => !removeImageIds.includes(img.id));
  let videos = (current.videos || []).filter(vid => !removeVideoIds.includes(vid.id));

  if (newImageFiles.length > 0) {
    const { results } = await uploadMediaFiles(newImageFiles, 'tourismSites/images');
    images = [...images, ...results];
  }
  if (newVideoFiles.length > 0) {
    const { results } = await uploadMediaFiles(newVideoFiles, 'tourismSites/videos');
    videos = [...videos, ...results];
  }

  
  let details = current.details || [];
  if (siteData.details) {
    details = await Promise.all(siteData.details.map(async (detail) => {
      const existingImages = (detail.images || []).filter(img => !(img instanceof File));
      const newDetailFiles = (detail.images || []).filter(img => img instanceof File);
      let uploadedImages   = [];
      if (newDetailFiles.length > 0) {
        const { results } = await uploadMediaFiles(newDetailFiles, 'tourismSites/images');
        uploadedImages = results;
      }
      return { ...detail, images: [...existingImages, ...uploadedImages] };
    }));
  }

  const updatedFields = {
    ...(siteData.title        && { title:         String(siteData.title).trim() }),
    ...(siteData.description  && { description:   String(siteData.description).trim() }),
    ...(siteData.category     && { category:       String(siteData.category) }),
    ...(siteData.coordinates  && { coordinates:   { lat: Number(siteData.coordinates.lat), lon: Number(siteData.coordinates.lon) } }),
    ...('address'        in siteData && { address:        siteData.address?.trim()        || '' }),
    ...('googleMapsUrl'  in siteData && { googleMapsUrl:  siteData.googleMapsUrl?.trim()  || '' }),
    ...('rating'         in siteData && { rating:         Number(siteData.rating) || 4.0 }),
    ...('openingHours'   in siteData && { openingHours:   siteData.openingHours?.trim()   || '' }),
    ...('contactInfo'    in siteData && { contactInfo:    siteData.contactInfo?.trim()    || '' }),
    ...('price'          in siteData && { price:          siteData.price?.trim()          || '' }),
    ...('additionalInfo' in siteData && { additionalInfo: siteData.additionalInfo?.trim() || '' }),
    images,
    videos,
    details,
    totalImages: images.length,
    totalVideos: videos.length,
  };

  await updateTourismSiteById(siteId, updatedFields);
  return { id: siteId, success: true };
};

export const deleteTourismSite = async (siteId) => {
  const siteData = await deleteTourismSiteById(siteId);

  
  const allFiles = [
    ...(siteData.images  || []),
    ...(siteData.videos  || []),
    ...((siteData.details || []).flatMap(d => d.images || [])),
  ];
  await Promise.allSettled(
    allFiles.filter(f => f.storagePath).map(f => deleteFile(f.storagePath))
  );

  return { success: true, id: siteId };
};

export const refreshImageUrls = async (siteId) => {
  const site = await findTourismSiteById(siteId);

  const refresh = async (mediaList) =>
    Promise.all(mediaList.map(async (item) => {
      if (!item.storagePath) return item;
      const newUrl = await getDownloadUrl(item.storagePath);
      return { ...item, url: newUrl || item.url };
    }));

  const [images, videos] = await Promise.all([
    refresh(site.images || []),
    refresh(site.videos || []),
  ]);

  await updateTourismSiteById(siteId, { images, videos });
  return { success: true, updatedImages: images.length, updatedVideos: videos.length };
};

export const onTourismSitesByCategoryChange = (category, callback) => {
  let lastHash = null;

  return subscribeTourismSitesByCategory(
    category,
    async (rawSites) => {
      const cacheKey = `media_${category}`;
      let mediaImages = getCached(cacheKey);

      if (!mediaImages) {
        const raw = await findMediaFilesByCategory(category).catch(() => []);
        mediaImages = raw.filter(m => m.base64 || m.url).map(m => ({
          id:           m.id,
          url:          m.base64 || m.url,
          thumbnail:    m.thumbnail,
          originalName: m.originalName,
          type:         m.type,
        }));
        setCache(cacheKey, mediaImages);
      }

      const sites = rawSites.map(data => ({
        ...data,
        images: normalizeImages(data.images, mediaImages),
        videos: Array.isArray(data.videos)
          ? data.videos.map(v => typeof v === 'string' ? { url: v } : v)
          : [],
        details: data.details || [],
      }));

      const hash = JSON.stringify(sites.map(s => ({ id: s.id, imgs: s.images?.length })));
      if (hash !== lastHash) {
        lastHash = hash;
        callback(sites, null);
      }
    },
    (error) => callback(null, error)
  );
};

export const cleanupOrphanedFiles = async () => {
  const [allFiles, allSites] = await Promise.all([
    findAllMediaFiles(),
    findAllTourismSites(),
  ]);

  const usedIds = new Set(
    allSites.flatMap(s => [
      ...(s.images || []),
      ...(s.videos || []),
    ]).map(m => m.id).filter(Boolean)
  );

  let deletedCount = 0;
  for (const file of allFiles) {
    if (!usedIds.has(file.id)) {
      await removeMediaFile(file.id);
      deletedCount++;
    }
  }
  return { success: true, deletedCount };
};

export const getSafeImageUrl = getDownloadUrl;
