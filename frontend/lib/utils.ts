import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}