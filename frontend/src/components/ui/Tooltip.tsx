/********************************************************************************
# Tractus-X - EDC Management Console
#
# Copyright (c) 2026 ARENA2036 e.V.
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
# WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
# License for the specific language governing permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
********************************************************************************/
import {
  useEffect,
  useCallback,
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
  const isRich = Boolean(title || footer || (items && items.length > 0));

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) {
      return;
    }

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.min(isRich ? 360 : 220, viewportWidth - 24);
    const sideOffset = 14;
    const verticalPosition = position === 'top' && rect.top < 96 ? 'bottom' : position;

    if (verticalPosition === 'top' || verticalPosition === 'bottom') {
      const centerX = rect.left + rect.width / 2;
      const left = Math.min(
        Math.max(centerX, maxWidth / 2 + 12),
        viewportWidth - maxWidth / 2 - 12,
      );
      setStyle({
        position: 'fixed',
        left,
        top: verticalPosition === 'top' ? rect.top - sideOffset : rect.bottom + sideOffset,
        maxWidth,
        transform:
          verticalPosition === 'top' ? 'translate(-50%, -100%)' : 'translateX(-50%)',
      });
      return;
    }

    const rawTop = rect.top + rect.height / 2 - 72;
    const top = Math.min(Math.max(12, rawTop), viewportHeight - 148);
    const preferredLeft =
      verticalPosition === 'left'
        ? rect.left - maxWidth - sideOffset
        : rect.right + sideOffset;
    const left = Math.min(
      Math.max(12, preferredLeft),
      viewportWidth - maxWidth - 12,
    );

    setStyle({
      position: 'fixed',
      left,
      top,
      maxWidth,
    });

  }, [position, isRich]);

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
  }, [isVisible, updatePosition]);

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
            className={`pointer-events-none z-[200] w-max rounded-xl border border-black bg-gray-900 text-xs leading-5 text-white shadow-2xl transition-all duration-150 ${
              isRich ? 'px-4 py-3' : 'px-3 py-1.5'
            } ${isVisible ? 'visible opacity-100' : 'invisible opacity-0'}`}
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
