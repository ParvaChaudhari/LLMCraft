import { GridPoint } from './isoRouter';

type Listener = () => void;

const paths = new Map<string, GridPoint[]>();
const listeners = new Set<Listener>();

let cachedPaths: GridPoint[][] = [];
let isDirty = false;

export const roadStore = {
  setPath(id: string, points: GridPoint[]) {
    paths.set(id, points);
    isDirty = true;
    listeners.forEach(l => l());
  },
  removePath(id: string) {
    paths.delete(id);
    isDirty = true;
    listeners.forEach(l => l());
  },
  getPaths(): GridPoint[][] {
    if (isDirty) {
      cachedPaths = Array.from(paths.values());
      isDirty = false;
    }
    return cachedPaths;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
