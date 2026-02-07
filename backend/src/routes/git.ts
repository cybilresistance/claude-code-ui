import { Router } from 'express';
import { existsSync } from 'fs';
import { getGitBranches } from '../utils/git.js';

export const gitRouter = Router();

/**
 * List local branches for a git repository.
 * Returns branches sorted alphabetically with the current branch first.
 */
gitRouter.get('/branches', (req, res) => {
  const folder = req.query.folder as string;
  if (!folder) return res.status(400).json({ error: 'folder query param is required' });
  if (!existsSync(folder)) return res.status(400).json({ error: 'folder does not exist' });

  try {
    const branches = getGitBranches(folder);
    res.json({ branches });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list branches', details: err.message });
  }
});
