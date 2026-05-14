import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date nicely
export function formatDate(dateString: string) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

// Format date and time nicely
export function formatDateTime(dateString: string) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('ar-IQ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

// Format file size nicely
export function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Generate an Arabic translation for statuses
export const statusTranslations = {
  PENDING: 'قيد الانتظار',
  IN_PROGRESS: 'قيد المتابعة',
  COMPLETED: 'منجز',
  ARCHIVED: 'مؤرشف'
};

export const typeTranslations = {
  INCOMING: 'وارد',
  OUTGOING: 'صادر'
};
