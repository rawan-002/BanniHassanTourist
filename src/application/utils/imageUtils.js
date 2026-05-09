

export const compressImage = (
  file,
  maxWidth  = 1200,
  maxHeight = 1200,
  quality   = 0.8
) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    img.onerror = () => reject(new Error('فشل تحميل الصورة'));
    img.onload  = () => {
      let { width, height } = img;

      if (width > maxWidth) {
        height = Math.round((maxWidth * height) / width);
        width  = maxWidth;
      }
      if (height > maxHeight) {
        width  = Math.round((maxHeight * width) / height);
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('فشل ضغط الصورة')); return; }
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        },
        'image/jpeg',
        quality
      );
    };
    img.src = URL.createObjectURL(file);
  });
};

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const optimizeFirebaseUrl = (url) => {
  if (!url) return url;
  try {
    const optimizedUrl = new URL(url);
    optimizedUrl.searchParams.set('quality', '80');
    optimizedUrl.searchParams.set('format', 'webp');
    optimizedUrl.searchParams.set('cache', 'max-age=31536000');
    return optimizedUrl.toString();
  } catch {
    return url;
  }
};

class ImageCache {
  constructor(maxSize = 100, ttl = 15 * 60 * 1000) {
    this.cache   = new Map();
    this.maxSize = maxSize;
    this.ttl     = ttl;
    this.stats   = { hits: 0, misses: 0, evictions: 0 };
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) this._evict();
    this.cache.set(key, { value, timestamp: Date.now(), accessCount: 0 });
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) { this.stats.misses++; return null; }
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    entry.accessCount++;
    entry.timestamp = Date.now();
    this.stats.hits++;
    return entry.value;
  }

  _evict() {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].accessCount - b[1].accessCount);
    entries.slice(0, Math.floor(this.maxSize / 2))
      .forEach(([k]) => { this.cache.delete(k); this.stats.evictions++; });
  }

  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  getStats() {
    const { hits, misses } = this.stats;
    return { ...this.stats, size: this.cache.size, hitRate: hits / (hits + misses) || 0 };
  }
}

export const imageCache = new ImageCache();

export const preloadImage = (url) =>
  new Promise((resolve, reject) => {
    const cached = imageCache.get(url);
    if (cached) { resolve(cached); return; }

    const img = new Image();
    let attempts = 0;
    const MAX = 3;

    const attempt = () => {
      img.onload  = () => { imageCache.set(url, img); resolve(img); };
      img.onerror = () => {
        if (++attempts >= MAX) { reject(new Error(`فشل تحميل الصورة بعد ${MAX} محاولات`)); return; }
        img.src = '';
        setTimeout(attempt, 1000 * attempts);
      };
      img.src = url;
    };
    attempt();
  });

export const preloadImages = async (urls, batchSize = 5) => {
  const results = { successful: [], failed: [] };
  for (let i = 0; i < urls.length; i += batchSize) {
    await Promise.all(
      urls.slice(i, i + batchSize).map(url =>
        preloadImage(url)
          .then(() => results.successful.push(url))
          .catch(() => results.failed.push(url))
      )
    );
    if (i + batchSize < urls.length) await new Promise(r => setTimeout(r, 100));
  }
  return results;
};
