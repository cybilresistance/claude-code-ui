import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join } from 'path';

export interface GitInfo {
  isGitRepo: boolean;
  branch?: string;
}

/**
 * Check if a directory is a git repository and get the current branch
 */
export function getGitInfo(directory: string): GitInfo {
  if (!directory || !existsSync(directory)) {
    return { isGitRepo: false };
  }

  try {
    // Check if directory exists and is accessible
    const stat = statSync(directory);
    if (!stat.isDirectory()) {
      return { isGitRepo: false };
    }

    // Check if it's a git repository by looking for .git folder or if it's inside a git repo
    const gitDir = join(directory, '.git');
    let isGitRepo = existsSync(gitDir);

    // If no .git folder in current directory, check if we're inside a git repo
    if (!isGitRepo) {
      try {
        execSync('git rev-parse --git-dir', {
          cwd: directory,
          stdio: 'pipe',
          timeout: 5000 // 5 second timeout
        });
        isGitRepo = true;
      } catch {
        // Not a git repo or git not available
        return { isGitRepo: false };
      }
    }

    if (isGitRepo) {
      try {
        // Get current branch name
        const branch = execSync('git branch --show-current', {
          cwd: directory,
          encoding: 'utf8',
          stdio: 'pipe',
          timeout: 5000 // 5 second timeout
        }).trim();

        return {
          isGitRepo: true,
          branch: branch || 'main' // fallback to 'main' if branch is empty
        };
      } catch {
        // Git repo exists but can't get branch (detached HEAD, etc.)
        return {
          isGitRepo: true,
          branch: 'main'
        };
      }
    }

    return { isGitRepo: false };
  } catch (error) {
    // Any other error (permissions, etc.)
    return { isGitRepo: false };
  }
}