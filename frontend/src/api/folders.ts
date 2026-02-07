import type { FolderItem, BrowseResult, ValidateResult, FolderSuggestion } from "shared/types/index.js";

export type { FolderItem, BrowseResult, ValidateResult, FolderSuggestion };

const BASE = "/api";

export interface SuggestionsResponse {
  suggestions: FolderSuggestion[];
}

/**
 * Browse directories and files in the given path
 */
export async function browseDirectory(path: string, showHidden: boolean = false, limit: number = 500): Promise<BrowseResult> {
  const params = new URLSearchParams({
    path,
    showHidden: showHidden.toString(),
    limit: limit.toString(),
  });

  const res = await fetch(`${BASE}/folders/browse?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to browse directory");
  }
  return res.json();
}

/**
 * Validate if a path exists and is accessible
 */
export async function validatePath(path: string): Promise<ValidateResult> {
  const params = new URLSearchParams({ path });

  const res = await fetch(`${BASE}/folders/validate?${params}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to validate path");
  }
  return res.json();
}

/**
 * Get suggested directories for quick access
 */
export async function getFolderSuggestions(): Promise<SuggestionsResponse> {
  const res = await fetch(`${BASE}/folders/suggestions`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to get folder suggestions");
  }
  return res.json();
}
