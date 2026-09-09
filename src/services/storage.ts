import { supabase } from '@/lib/supabase';

/**
 * Web replacement for expo-camera / expo-image-picker.
 *
 * A hidden <input type="file" capture="environment"> opens the rear camera
 * directly on iOS and Android browsers, and falls back to the normal file
 * picker on desktop. There is no permission call to make: the browser handles
 * consent as part of showing the picker.
 */
export function pickPhoto(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      window.removeEventListener('focus', onFocus);
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // `change` never fires when the user cancels, so a focus return with no
    // file selected is our cancel signal. The delay lets `change` win the race.
    const onFocus = () => window.setTimeout(() => finish(input.files?.[0] ?? null), 400);
    window.addEventListener('focus', onFocus, { once: true });

    input.click();
  });
}

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.7;

/**
 * Downscale and re-encode to JPEG before upload. Phone cameras hand back
 * multi-megabyte images; proof photos only ever render a few hundred pixels
 * wide, so shipping the original wastes the user's data and Supabase storage.
 */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    return blob ?? file;
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

export async function uploadTaskPhoto(instanceId: string, file: File): Promise<string> {
  const blob = await compressImage(file);
  const fileName = `task-proofs/${instanceId}-${Date.now()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('task-photos')
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('task-photos').getPublicUrl(fileName);
  return data.publicUrl;
}

/** Thrown when the user closes the picker without choosing anything. */
export const NO_PHOTO = 'No photo taken';

export async function takeAndUploadPhoto(instanceId: string): Promise<string> {
  const file = await pickPhoto();
  if (!file) throw new Error(NO_PHOTO);
  return uploadTaskPhoto(instanceId, file);
}
