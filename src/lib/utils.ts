import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  	return twMerge(clsx(inputs));
}

// Helper types for Svelte 5 components
export type WithElementRef<T = HTMLElement> = T & {
	ref?: HTMLElement | null;
};

export type WithoutChild<T> = Omit<T, 'children'>;

export type WithoutChildrenOrChild<T> = Omit<T, 'children' | 'child'>;
