export interface ModuleDescriptor {
  name: string;
  responsibility: string;
}

export function defineModuleDescriptor(
  name: string,
  responsibility: string
): ModuleDescriptor {
  return { name, responsibility };
}

export function readPort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}
