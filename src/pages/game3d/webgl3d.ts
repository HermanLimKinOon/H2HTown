type ContextLossExtension = { loseContext: () => void };
type WebGLContextLike = { getExtension?: (name: string) => ContextLossExtension | null };
type CanvasLike = { getContext: (kind: 'webgl2' | 'webgl') => WebGLContextLike | null };

export function createWebGLSupportProbe(createCanvas: () => CanvasLike) {
  let cached: boolean | undefined;

  return () => {
    if (cached !== undefined) return cached;
    try {
      const canvas = createCanvas();
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      cached = Boolean(context);
      context?.getExtension?.('WEBGL_lose_context')?.loseContext();
    } catch {
      cached = false;
    }
    return cached;
  };
}

export const canUseWebGL3D = typeof document === 'undefined'
  ? () => true
  : createWebGLSupportProbe(() => document.createElement('canvas'));
