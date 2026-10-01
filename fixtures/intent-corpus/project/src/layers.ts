export type Layer = { name: string; z: number };

const byZ = (a: Layer, b: Layer): number => a.z - b.z;

/** Orders the layers back to front for drawing. */
export function sortLayers(layers: Layer[]): void {
  layers.sort(byZ);
}
