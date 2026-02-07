export interface PluginCommand {
  name: string;
  description?: string;
}

export interface PluginManifest {
  name: string;
  description: string;
  source: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface Plugin {
  id: string;
  path: string;
  manifest: PluginManifest;
  commands: PluginCommand[];
}
