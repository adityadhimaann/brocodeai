import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) { // Removed ClassValue[]
  return twMerge(clsx(inputs))
}