/**
 * ResizeHandle Component
 *
 * 분할 패널 간 드래그 리사이즈 핸들
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export function ResizeHandle({
  direction,
  onResize,
  onResizeStart,
  onResizeEnd,
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
    onResizeStart?.();
  }, [direction, onResizeStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;
      startPosRef.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, onResize, onResizeEnd]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute ${
        direction === 'horizontal'
          ? 'right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:w-2'
          : 'bottom-0 left-0 right-0 h-1.5 cursor-row-resize hover:h-2'
      } ${
        isDragging
          ? 'bg-cyan-500/60'
          : 'bg-white/5 hover:bg-cyan-500/40'
      } transition-all z-20`}
      style={{
        // 드래그 중 핸들이 보이도록
        ...(isDragging && {
          [direction === 'horizontal' ? 'width' : 'height']: '4px',
        }),
      }}
    />
  );
}
