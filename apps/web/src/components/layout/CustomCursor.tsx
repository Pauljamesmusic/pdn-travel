import { MousePointer2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

/** Replaces the native pointer with a glowing red cursor on fine-pointer (mouse) devices. */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine) and (hover: hover)').matches) return;

    const dot = dotRef.current;
    const icon = iconRef.current;
    if (!dot || !icon) return;

    document.documentElement.classList.add('custom-cursor-active');

    const move = (e: MouseEvent) => {
      dot.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      dot.style.opacity = '1';
    };
    const hide = () => {
      dot.style.opacity = '0';
    };
    const down = () => {
      icon.style.transform = 'scale(0.85)';
    };
    const up = () => {
      icon.style.transform = 'scale(1)';
    };

    window.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', hide);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);

    return () => {
      document.documentElement.classList.remove('custom-cursor-active');
      window.removeEventListener('mousemove', move);
      document.removeEventListener('mouseleave', hide);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  return (
    <div ref={dotRef} className="pointer-events-none fixed left-0 top-0 z-[200] opacity-0" aria-hidden="true">
      <MousePointer2
        ref={iconRef}
        size={30}
        className="-translate-x-1.5 -translate-y-1.5 fill-red-500 text-red-600 transition-transform duration-100 ease-out"
        style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.9)) drop-shadow(0 0 18px rgba(239,68,68,0.65)) drop-shadow(0 0 34px rgba(239,68,68,0.35))' }}
      />
    </div>
  );
}
