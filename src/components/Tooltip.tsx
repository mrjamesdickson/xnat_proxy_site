import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  delay?: number; // in milliseconds, must be < 250ms
}

export function Tooltip({ content, children, delay = 150 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const handleMouseEnter = (e: MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX + rect.width / 2,
      });
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = triggerRef.current;
    if (element) {
      element.addEventListener('mouseenter', handleMouseEnter);
      element.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        element.removeEventListener('mouseenter', handleMouseEnter);
        element.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [delay]);

  const childrenWithRef = (
    <children.type
      {...(children.props as any)}
      ref={(node: HTMLElement) => {
        triggerRef.current = node;
        // Handle existing ref if present
        const { ref } = children as any;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
    />
  );

  return (
    <>
      {childrenWithRef}
      {isVisible &&
        createPortal(
          <div
            className="fixed z-[9999] px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-lg pointer-events-none whitespace-nowrap"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              transform: 'translateX(-50%)',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
