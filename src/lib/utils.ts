import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Pull a human-readable message out of whatever a thrown value turns out to be. */
export function errorMessage(e: unknown, fallback = 'Er ging iets mis'): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return fallback;
}

/** Tailwind-friendly hex + alpha, mirroring the RN app's `Colors.primary + '22'`. */
export function alpha(color: string, opacity: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}
