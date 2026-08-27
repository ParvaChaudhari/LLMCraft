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

export default function BillboardNode({ id, data, selected }: { id: string; data: BillboardData; selected?: boolean }) {
  const title = data?.title || 'NOTE';
  const content = data?.content || 'Edit message in SidePanel';
  const theme = data?.theme || 'classic';
  const align = data?.align || 'center';
  const fontSize = data?.fontSize || 'md';

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

  const fontSizes = {
    sm: { title: 'text-[9px]', text: 'text-[7px]' },
    md: { title: 'text-[11px]', text: 'text-[8.5px]' },
    lg: { title: 'text-[13px]', text: 'text-[10px]' },
  }[fontSize];

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
          className="absolute overflow-hidden p-1.5 flex flex-col justify-center select-none"
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
          <div
            className={`font-[family-name:var(--font-label-caps)] font-bold uppercase tracking-wider truncate leading-tight ${fontSizes.title}`}
            style={{ color: themeStyles.titleColor }}
          >
            {title}
          </div>
          {content && (
            <div
              className={`font-[family-name:var(--font-code-sm)] leading-tight mt-0.5 line-clamp-3 overflow-hidden ${fontSizes.text}`}
              style={{ color: themeStyles.textColor }}
            >
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
