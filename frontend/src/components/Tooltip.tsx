import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface Props {
  content: string;
  title?: string;
  items?: string[];
  footer?: string;
  children: ReactNode;
  position?: TooltipPosition;
  fullWidth?: boolean;
}

export default function Tooltip({
  content,
  title,
  items,
  footer,
  children,
  position = 'top',
  fullWidth = false,
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const updatePosition = () => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(360, viewportWidth - 24);
    const sideOffset = 14;

    if (position === 'top' || position === 'bottom') {
      const left = Math.min(
        Math.max(12, rect.left + rect.width / 2 - tooltipWidth / 2),
        viewportWidth - tooltipWidth - 12,
      );
      setStyle({
        position: 'fixed',
        left,
        top: position === 'top' ? rect.top - sideOffset : rect.bottom + sideOffset,
        width: tooltipWidth,
        transform: position === 'top' ? 'translateY(-100%)' : undefined,
      });
      return;
    }

    const rawTop = rect.top + rect.height / 2 - 72;
    const top = Math.min(Math.max(12, rawTop), viewportHeight - 148);
    const preferredLeft =
      position === 'left'
        ? rect.left - tooltipWidth - sideOffset
        : rect.right + sideOffset;
    const left = Math.min(
      Math.max(12, preferredLeft),
      viewportWidth - tooltipWidth - 12,
    );

    setStyle({
      position: 'fixed',
      left,
      top,
      width: tooltipWidth,
    });
  };

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, position]);

  return (
    <div
      ref={triggerRef}
      className={fullWidth ? 'relative block w-full' : 'relative inline-flex'}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            style={style}
            className={`pointer-events-none z-[200] rounded-xl border border-black bg-gray-900 px-4 py-3 text-xs leading-5 text-white shadow-2xl transition-all duration-150 ${
              isVisible ? 'visible opacity-100' : 'invisible opacity-0'
            }`}
          >
            {title && (
              <span className="mb-1 block text-sm font-semibold text-white">{title}</span>
            )}
            <span className="block whitespace-pre-line break-words text-white">
              {content}
            </span>
            {items && items.length > 0 && (
              <ul className="mt-2 space-y-1 text-gray-100">
                {items.map((item) => (
                  <li key={item} className="whitespace-pre-line break-words">
                    • {item}
                  </li>
                ))}
              </ul>
            )}
            {footer && (
              <span className="mt-2 block whitespace-pre-line break-words border-t border-white/20 pt-2 text-[11px] text-orange-300">
                {footer}
              </span>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
