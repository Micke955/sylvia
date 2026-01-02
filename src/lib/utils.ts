import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const publicMarker = "/storage/v1/object/public/avatars/";
  if (trimmed.includes(publicMarker)) return trimmed;
  const rawMarker = "/storage/v1/object/avatars/";
  if (trimmed.includes(rawMarker)) {
    return trimmed.replace(rawMarker, publicMarker);
  }
  return trimmed;
}

export function synopsisText(text?: string | null, maxLength = 180): string {
  if (!text) return "Synopsis indisponible.";
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Synopsis indisponible.";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trim()}...`;
}

export function isValidCoverUrl(url?: string | null): boolean {
  if (!url) return false;
  return !/image[_-]?not[_-]?available|no[_-]?cover|placeholder/i.test(url);
}

export function formatUsername(username?: string | null): string {
  if (!username) return "";
  const trimmed = username.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}
