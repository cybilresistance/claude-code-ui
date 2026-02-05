export interface PluginCommand {
  name: string;
  description?: string;
}

export interface PluginManifest {
  name: string;
  description: string;
  source: string;
  [key: string]: any;
}

export interface Plugin {
  id: string;
  path: string;
  manifest: PluginManifest;
  commands: PluginCommand[];
}