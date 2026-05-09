

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config.js';

export const fetchPlaceDetails = async (placeId) => {
  const fn = httpsCallable(functions, 'getPlaceDetails');
  const result = await fn({ placeId });
  return result.data;
};

export const fetchPlaceInfoFromUrl = async (googleMapsUrl) => {
  const fn = httpsCallable(functions, 'getGooglePlaceDetails');
  const result = await fn({ url: googleMapsUrl });
  return result.data;
};

export const fetchNearbyPlaces = async (location, radius = 5000, type = 'tourist_attraction') => {
  const fn = httpsCallable(functions, 'searchNearbyPlaces');
  const result = await fn({ location, radius, type });
  return result.data;
};

export const fetchPlacePhotos = async (placeId) => {
  const fn = httpsCallable(functions, 'getPlacePhotos');
  const result = await fn({ placeId });
  return result.data;
};

export const extractCoordinatesFromUrl = (url) => {
  const patterns = [
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
};

export const extractPlaceNameFromUrl = (url) => {
  const match = url.match(/\/place\/([^/?@]+)/);
  return match ? decodeURIComponent(match[1]).replace(/\+/g, ' ') : null;
};

export const isValidGoogleMapsUrl = (url) => {
  if (!url) return false;
  return /google.*maps/.test(url);
};
