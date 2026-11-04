'use client';

import React, { useEffect } from 'react';

interface ImageLightboxModalProps {
  src?: string | null;
  imageSrc?: string | null;
  alt?: string;
  title?: string;
  isOpen?: boolean;
  onClose: () => void;
}

export default function ImageLightboxModal({
  src,
  imageSrc,
  alt = 'Preview Image',
  title,
  isOpen = true,
  onClose,
}: ImageLightboxModalProps) {
  const activeSrc = src || imageSrc;
  const displayTitle = title || alt;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (activeSrc && isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSrc, isOpen, onClose]);

  if (!isOpen || !activeSrc) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 transition-all"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close Preview"
        className="absolute top-4 right-4 z-50 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div 
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={activeSrc}
          alt={alt}
          className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl border border-white/10"
        />
        {alt && (
          <p className="mt-3 text-center text-sm font-medium text-slate-200">
            {alt}
          </p>
        )}
      </div>
    </div>
  );
}
