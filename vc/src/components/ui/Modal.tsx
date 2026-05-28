import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  id
}: ModalProps) {
  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto select-none"
      id={id}
    >
      {/* Dark overlay backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Centered card content */}
      <div 
        className={`relative w-full max-w-lg bg-[#121620] border border-[#22253B] rounded-2xl shadow-2xl p-6 text-left transform transition-all animate-in zoom-in-95 duration-200 z-10 ${className}`}
      >
        <div className="flex items-center justify-between border-b border-[#22253B] pb-3 mb-4">
          {title ? (
            <h3 className="text-sm font-black text-white tracking-tight">{title}</h3>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-[#1E2235] transition"
          >
            <X size={15} />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
