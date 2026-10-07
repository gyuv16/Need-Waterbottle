import { useEffect, useRef, useState } from 'react';
import type { VrmAvatar } from './VrmAvatar';

// The .vrm file is read once and shared; it is re-read when the user imports a new one.
let data: Promise<ArrayBuffer | null> | null = null;
function vrmData(): Promise<ArrayBuffer | null> {
  data ??= window.waterBuddy?.loadVrm?.() ?? Promise.resolve(null);
  return data;
}
window.waterBuddy?.onVrmChanged?.(() => (data = null));

/**
 * Load the user's VRM avatar into `canvas`. Three.js and three-vrm are only downloaded into memory
 * (a separate chunk) when a 3D avatar is actually used, so the 2D buddies stay lightweight.
 */
export function useVrmAvatar(fps = 60): [React.RefObject<HTMLCanvasElement>, VrmAvatar | null, string | null] {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [avatar, setAvatar] = useState<VrmAvatar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => window.waterBuddy?.onVrmChanged?.(() => setVersion((v) => v + 1)), []);

  useEffect(() => {
    let alive = true;
    let instance: VrmAvatar | null = null;
    (async () => {
      try {
        const [buf, mod] = await Promise.all([vrmData(), import(/* webpackChunkName: "vrm" */ './VrmAvatar')]);
        if (!alive || !canvas.current) return;
        if (!buf) {
          setError('No 3D avatar imported yet.');
          return;
        }
        instance = await mod.VrmAvatar.load(canvas.current, buf.slice(0));
        if (!alive) return instance.dispose();
        instance.start(fps);
        setAvatar(instance);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
      instance?.dispose();
      setAvatar(null);
    };
  }, [fps, version]);

  return [canvas, avatar, error];
}
