import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface PluginSkill {
  name: string;
  description?: string;
}

export interface PluginAgent {
  name: string;
  description?: string;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  skills?: PluginSkill[];
  agents?: PluginAgent[];
  [key: string]: any;
}

export interface Plugin {
  id: string;
  path: string;
  manifest: PluginManifest;
  skills: PluginSkill[];
  agents: PluginAgent[];
}

/**
 * Discover all plugins from .claude-plugin/marketplace.json
 */
export function discoverPlugins(directory: string): Plugin[] {
  const marketplacePath = join(directory, '.claude-plugin', 'marketplace.json');

  if (!existsSync(marketplacePath)) {
    return [];
  }

  try {
    const data = readFileSync(marketplacePath, 'utf-8');
    const marketplace = JSON.parse(data);

    if (!Array.isArray(marketplace.plugins)) {
      return [];
    }

    return marketplace.plugins
      .filter((p: any) => p.name && p.version && p.description)
      .map((p: any) => ({
        id: p.name,
        path: marketplacePath,
        manifest: p,
        skills: p.skills || [],
        agents: p.agents || []
      }));
  } catch (error) {
    console.warn(`Failed to parse marketplace.json at ${marketplacePath}:`, error);
    return [];
  }
}

/**
 * Get plugins for a specific directory (looks in current directory only)
 */
export function getPluginsForDirectory(directory: string): Plugin[] {
  return discoverPlugins(directory);
}

/**
 * Convert plugin skills and agents to slash command format
 */
export function pluginToSlashCommands(plugin: Plugin): string[] {
  const commands: string[] = [];

  // Add skills with plugin namespace
  for (const skill of plugin.skills) {
    commands.push(`${plugin.manifest.name}:${skill.name}`);
  }

  // Add agents with plugin namespace
  for (const agent of plugin.agents) {
    commands.push(`${plugin.manifest.name}:${agent.name}`);
  }

  return commands;
}