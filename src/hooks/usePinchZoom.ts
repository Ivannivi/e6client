import { useRef, useState, useCallback, type CSSProperties, type PointerEvent } from 'react';

interface PinchZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface PointerInfo {
  x: number;
  y: number;
}

const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_DISTANCE_PX = 10;
const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function usePinchZoom() {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, PointerInfo>());
  const pinchStart = useRef<{
    distance: number;
    scale: number;
    centerX: number;
    centerY: number;
    translateX: number;
    translateY: number;
  } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);

  const [state, setState] = useState<PinchZoomState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });

  const reset = useCallback(() => {
    setState({ scale: 1, translateX: 0, translateY: 0 });
    pinchStart.current = null;
  }, []);

  const getDistance = (a: PointerInfo, b: PointerInfo): number => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  };

  const getCenter = (a: PointerInfo, b: PointerInfo): { x: number; y: number } => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (!element) return;

    try {
      element.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture may fail in some environments; ignore.
    }

    const rect = element.getBoundingClientRect();
    pointers.current.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    // Double-tap to reset when using a single pointer.
    if (pointers.current.size === 1) {
      const now = Date.now();
      const tap = lastTap.current;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (
        tap &&
        now - tap.time < DOUBLE_TAP_MS &&
        Math.hypot(x - tap.x, y - tap.y) < DOUBLE_TAP_DISTANCE_PX
      ) {
        reset();
        lastTap.current = null;
        return;
      }

      lastTap.current = { time: now, x, y };
    }

    // Start a pinch gesture once two pointers are down.
    if (pointers.current.size === 2) {
      const [first, second] = Array.from(pointers.current.values());
      const distance = getDistance(first, second);
      const center = getCenter(first, second);

      pinchStart.current = {
        distance,
        scale: state.scale,
        centerX: center.x,
        centerY: center.y,
        translateX: state.translateX,
        translateY: state.translateY,
      };
    }
  }, [state.scale, state.translateX, state.translateY, reset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;

    const element = ref.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    pointers.current.set(e.pointerId, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [first, second] = Array.from(pointers.current.values());
      const distance = getDistance(first, second);
      const center = getCenter(first, second);
      const start = pinchStart.current;

      const rawScale = start.scale * (distance / start.distance);
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, rawScale));

      const dx = center.x - start.centerX;
      const dy = center.y - start.centerY;

      setState({
        scale,
        translateX: start.translateX + dx,
        translateY: start.translateY + dy,
      });
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const element = ref.current;
    if (element) {
      try {
        element.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer may not be captured; ignore.
      }
    }
    pointers.current.delete(e.pointerId);

    if (pointers.current.size < 2) {
      pinchStart.current = null;
    }
  }, []);

  const style: CSSProperties = {
    transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`,
    transformOrigin: 'center center',
    touchAction: 'none',
    willChange: 'transform',
  };

  return {
    ref,
    style,
    reset,
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
    onPointerLeave: handlePointerUp,
  };
}
