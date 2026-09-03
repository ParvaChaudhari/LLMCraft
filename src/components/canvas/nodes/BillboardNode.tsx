import { useRef, useEffect, useLayoutEffect } from 'react';
import DiamondHighlight from './DiamondHighlight';
import NodeControls from './NodeControls';

interface BillboardData {
  title?: string;
  content?: string;
  theme?: 'classic' | 'cyber' | 'amber' | 'hazard';
  align?: 'left' | 'center';
  fontSize?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function BillboardNode({ id, data, selected }: { id: string; data: BillboardData; selected?: boolean }) {
  const title = data?.title || 'NOTE';
  const content = data?.content || 'Edit message in SidePanel';
  const theme = data?.theme || 'classic';
  const align = data?.align || 'center';
  const fontSize = data?.fontSize || 'md';

  const boardRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Theme color styling
  const themeStyles = {
    classic: {
      bg: 'rgba(235, 230, 215, 0.95)',
      titleColor: '#1c1917',
      textColor: '#44403c',
      border: '1px solid #78716c',
      glow: 'none',
    },
    cyber: {
      bg: 'rgba(10, 25, 40, 0.95)',
      titleColor: '#22d3ee',
      textColor: '#a5f3fc',
      border: '1px solid #06b6d4',
      glow: '0 0 8px rgba(6, 182, 212, 0.6)',
    },
    amber: {
      bg: 'rgba(30, 20, 5, 0.95)',
      titleColor: '#fbbf24',
      textColor: '#fde68a',
      border: '1px solid #d97706',
      glow: '0 0 8px rgba(245, 158, 11, 0.6)',
    },
    hazard: {
      bg: 'rgba(250, 204, 21, 0.95)',
      titleColor: '#000000',
      textColor: '#1c1917',
      border: '2px solid #000000',
      glow: 'none',
    },
  }[theme];

  // Auto-fit loop: dynamically shrinks font size until entire text fits inside the billboard frame
  useIsomorphicLayoutEffect(() => {
    const board = boardRef.current;
    const inner = innerRef.current;
    const titleEl = titleRef.current;
    const contentEl = contentRef.current;
    if (!board || !inner) return;

    // Base target sizes based on user's preference
    const baseTitle = fontSize === 'lg' ? 14 : fontSize === 'sm' ? 10 : 12;
    const baseContent = fontSize === 'lg' ? 10 : fontSize === 'sm' ? 7.5 : 8.8;

    let tSize = baseTitle;
    let cSize = baseContent;

    if (titleEl) {
      titleEl.style.fontSize = `${tSize}px`;
      titleEl.style.lineHeight = '1.15';
    }
    if (contentEl) {
      contentEl.style.fontSize = `${cSize}px`;
      contentEl.style.lineHeight = '1.2';
    }

    const maxBoardHeight = board.clientHeight;
    const maxBoardWidth = board.clientWidth;

    // 1. If title alone overflows horizontally, scale title down until it fits width
    if (titleEl) {
      let titleSafety = 0;
      while (titleEl.scrollWidth > maxBoardWidth - 10 && tSize > 6.5 && titleSafety < 25) {
        tSize -= 0.4;
        titleEl.style.fontSize = `${tSize}px`;
        titleSafety++;
      }
    }

    // 2. Shrink content and title font sizes smoothly until everything fits within the board height
    let safety = 0;
    while (inner.scrollHeight > maxBoardHeight - 8 && (cSize > 4 || tSize > 6) && safety < 45) {
      if (cSize > 4) {
        cSize -= 0.3;
        if (contentEl) contentEl.style.fontSize = `${cSize}px`;
      }
      // Proportionally scale title if content is already getting small
      if (cSize < 7 && tSize > 6) {
        tSize -= 0.25;
        if (titleEl) titleEl.style.fontSize = `${tSize}px`;
      }
      safety++;
    }
  }, [title, content, fontSize, align]);

  return (
    <div className="relative group" style={{ width: 192, height: 128 }}>
      <NodeControls id={id} data={data} showPin label="Billboard" />
      {selected && <DiamondHighlight cols={3} rows={2} offsetX={32} offsetY={64} />}

      {/* Billboard Sprite */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: 14,
          bottom: -68,
          width: '100%',
          height: 260,
          transform: 'scale(1.15)',
          transformOrigin: 'bottom center',
        }}
      >
        <img src="/assets/billboard.png" alt="Billboard" className="w-full h-full object-contain" />

        {/* Isometric Text Overlay mapped directly onto the billboard face */}
        <div
          ref={boardRef}
          className="absolute overflow-hidden p-2 select-none"
          style={{
            left: '22%',
            top: '16.5%',
            width: '46%',
            height: '31.5%',
            transform: 'matrix(1, 0.5, 0, 1, 0, 0)',
            transformOrigin: 'top left',
            background: themeStyles.bg,
            border: themeStyles.border,
            boxShadow: themeStyles.glow,
            textAlign: align,
          }}
        >
          <div ref={innerRef} className="w-full h-full flex flex-col justify-start">
            {/* Title: wraps and scales down till it fits inside the frame without truncating */}
            <div
              ref={titleRef}
              className="font-[family-name:var(--font-label-caps)] font-bold uppercase tracking-wider break-words"
              style={{ color: themeStyles.titleColor }}
            >
              {title}
            </div>

            {/* Content: scales down till it fits inside the frame without truncating */}
            {content && (
              <div
                ref={contentRef}
                className="font-[family-name:var(--font-code-sm)] break-words mt-1"
                style={{ color: themeStyles.textColor }}
              >
                {content}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
