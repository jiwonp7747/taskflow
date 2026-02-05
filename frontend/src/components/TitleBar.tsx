/**
 * TitleBar Component for macOS
 *
 * 커스텀 타이틀바 - 드래그 가능, 더블클릭으로 최대화 토글
 */

import { useCallback, useEffect, useState } from 'react';
import { toggleMaximize, isWindowMaximized, isElectron } from '../lib/ipcClient';

interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title = 'TaskFlow' }: TitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  // 최대화 상태 확인
  useEffect(() => {
    if (!isElectron()) return;

    const checkMaximized = async () => {
      const maximized = await isWindowMaximized();
      setIsMaximized(maximized);
    };

    checkMaximized();

    // 윈도우 리사이즈 시 상태 업데이트
    const handleResize = () => {
      checkMaximized();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 더블클릭 핸들러 - 최대화 토글
  const handleDoubleClick = useCallback(async () => {
    if (!isElectron()) return;

    const newMaximized = await toggleMaximize();
    setIsMaximized(newMaximized);
  }, []);

  // Electron이 아니면 타이틀바 표시 안함
  if (!isElectron()) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 h-8 z-[100] bg-[var(--background)] flex items-center select-none"
      style={{
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* macOS 트래픽 라이트 공간 (왼쪽 80px 비움) */}
      <div className="w-20 flex-shrink-0" />

      {/* 타이틀 (가운데 정렬) */}
      <div className="flex-1 text-center">
        <span className="text-xs font-medium text-[var(--text-tertiary)]">
          {title}
        </span>
      </div>

      {/* 오른쪽 여백 (대칭) */}
      <div className="w-20 flex-shrink-0" />
    </div>
  );
}
