import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';

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

/**
 * List local branch names for a git repository.
 * Returns branches sorted alphabetically with the current branch first.
 */
export function getGitBranches(directory: string): string[] {
  if (!directory || !existsSync(directory)) {
    return [];
  }

  try {
    const output = execSync("git branch --list --format='%(refname:short)'", {
      cwd: directory,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 5000,
    }).trim();

    if (!output) return [];

    const branches = output
      .split('\n')
      .map((b) => b.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort();

    // Move current branch to front
    const currentBranch = execSync('git branch --show-current', {
      cwd: directory,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 5000,
    }).trim();

    if (currentBranch) {
      const idx = branches.indexOf(currentBranch);
      if (idx > 0) {
        branches.splice(idx, 1);
        branches.unshift(currentBranch);
      }
    }

    return branches;
  } catch {
    return [];
  }
}

/**
 * Sanitize a branch name for use in filesystem paths.
 * Replaces slashes with hyphens.
 */
function sanitizeBranchForPath(branch: string): string {
  return branch.replace(/\//g, '-');
}

/**
 * Create or reuse a git worktree as a sibling directory of the repo.
 * Worktree path: [repo-parent]/[repo-name].[sanitized-branch]
 *
 * If the worktree already exists at the expected path, returns the path without creating.
 *
 * @param repoDir - The original repository directory
 * @param branch - Branch name to checkout in the worktree
 * @param createBranch - If true and branch doesn't exist, create it from baseBranch
 * @param baseBranch - Base branch for new branch creation
 * @returns The absolute path to the worktree directory
 */
export function ensureWorktree(
  repoDir: string,
  branch: string,
  createBranch: boolean,
  baseBranch?: string,
): string {
  const sanitized = sanitizeBranchForPath(branch);
  const repoName = basename(repoDir);
  const parentDir = dirname(repoDir);
  const worktreePath = join(parentDir, `${repoName}.${sanitized}`);

  // If worktree directory already exists, reuse it
  if (existsSync(worktreePath)) {
    return worktreePath;
  }

  // Create the worktree
  if (createBranch) {
    // Create a new branch and worktree in one command
    const base = baseBranch || 'HEAD';
    execSync(`git worktree add -b ${branch} ${JSON.stringify(worktreePath)} ${base}`, {
      cwd: repoDir,
      stdio: 'pipe',
      timeout: 10000,
    });
  } else {
    // Use an existing branch
    execSync(`git worktree add ${JSON.stringify(worktreePath)} ${branch}`, {
      cwd: repoDir,
      stdio: 'pipe',
      timeout: 10000,
    });
  }

  return worktreePath;
}

/**
 * Switch to a branch in the given directory (non-worktree mode).
 * If createNew is true, creates the branch from baseBranch first.
 */
export function switchBranch(
  directory: string,
  branch: string,
  createNew: boolean,
  baseBranch?: string,
): void {
  if (createNew) {
    const base = baseBranch || 'HEAD';
    execSync(`git checkout -b ${branch} ${base}`, {
      cwd: directory,
      stdio: 'pipe',
      timeout: 5000,
    });
  } else {
    execSync(`git checkout ${branch}`, {
      cwd: directory,
      stdio: 'pipe',
      timeout: 5000,
    });
  }
}