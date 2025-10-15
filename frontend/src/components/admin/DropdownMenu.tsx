'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerElement: HTMLElement | null;
  children: React.ReactNode;
}

export function DropdownMenu({ isOpen, onClose, triggerElement, children }: DropdownMenuProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && triggerElement) {
      const rect = triggerElement.getBoundingClientRect();
      const dropdownWidth = 192; // w-48 = 12rem = 192px
      const padding = 10;

      // Try to align dropdown right edge with button right edge
      let left = rect.right - dropdownWidth;

      // Ensure dropdown doesn't go off left edge
      if (left < padding) {
        left = padding;
      }

      // Ensure dropdown doesn't go off right edge
      const rightEdge = left + dropdownWidth;
      if (rightEdge > window.innerWidth - padding) {
        left = window.innerWidth - dropdownWidth - padding;
      }

      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: left,
      });
    }
  }, [isOpen, triggerElement]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerElement &&
        !triggerElement.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerElement]);

  if (!isMounted || !isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
    >
      {children}
    </div>,
    document.body
  );
}
