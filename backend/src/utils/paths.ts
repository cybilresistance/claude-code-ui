import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

/**
 * Convert a project directory name back to a folder path.
 * The SDK encodes paths by replacing / with -, so "-home-exedev-my-app"
 * is ambiguous (could be /home/exedev/my-app or /home/exedev/my/app).
 * We try all possible splits and return the first path that exists on disk.
 */
export function projectDirToFolder(dirName: string): string {
  // Strip leading dash (represents the root /)
  const parts = dirName.slice(1).split('-');

  // Try all possible ways to rejoin the parts with / or -
  function resolve(index: number, current: string): string | null {
    if (index === parts.length) {
      return existsSync(current) ? current : null;
    }
    // Try joining with / first (prefer deeper paths)
    const withSlash = resolve(index + 1, current + '/' + parts[index]);
    if (withSlash) return withSlash;
    // Then try joining with - (keeps it as part of the folder name)
    const withDash = resolve(index + 1, current + '-' + parts[index]);
    if (withDash) return withDash;
    return null;
  }

  const resolved = resolve(1, '/' + parts[0]);
  if (resolved) return resolved;

  // Fallback: naive replacement
  return '/' + parts.join('/');
}
