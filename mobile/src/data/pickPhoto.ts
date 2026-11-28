import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { acceptPhoto, type BioPhoto } from './photo';

/** Opens the photo library. Returns null when the player cancels. */
export function pickProfilePhoto(): Promise<BioPhoto | null> {
  if (Platform.OS === 'web') return pickOnWeb();
  return pickOnDevice();
}

function pickOnWeb(): Promise<BioPhoto | null> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp';
    let settled = false;
    const finish = (photo: BioPhoto | null) => {
      if (settled) return;
      settled = true;
      resolve(photo);
    };
    const cancelOnFocus = () => {
      window.setTimeout(() => {
        if (!input.files || input.files.length === 0) finish(null);
      }, 400);
    };
    window.addEventListener('focus', cancelOnFocus, { once: true });
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      resizeImage(file).then(finish, reject);
    };
    input.click();
  });
}

async function resizeImage(file: File): Promise<BioPhoto> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 1200;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('That photo could not be read.');
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
  if (!blob) throw new Error('That photo could not be read.');
  const data = await blobToBase64(blob);
  const photo = acceptPhoto({ data });
  if (!photo) throw new Error('That photo could not be read.');
  return photo;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('That photo could not be read.'));
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      const comma = value.indexOf(',');
      resolve(comma >= 0 ? value.slice(comma + 1) : value);
    };
    reader.readAsDataURL(blob);
  });
}

async function pickOnDevice(): Promise<BioPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo access is off. Allow photos to add a picture.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 5],
    quality: 0.7,
    base64: true,
  });
  if (result.canceled) return null;
  const data = result.assets[0]?.base64;
  if (!data) throw new Error('That photo could not be read.');
  const photo = acceptPhoto({ data });
  if (!photo) throw new Error('That photo could not be read.');
  return photo;
}
