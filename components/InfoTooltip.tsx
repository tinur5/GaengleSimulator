// components/InfoTooltip.tsx
'use client';

import { useState } from 'react';

interface InfoTooltipProps {
  text: string;
  className?: string;
}

export default function InfoTooltip({ text, className = '' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <button
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          onClick={(e) => {
            e.preventDefault();
            setIsVisible(!isVisible);
          }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors ml-1"
          aria-label="Information"
        >
          ?
        </button>
        {/* Desktop tooltip - hidden on mobile */}
        {isVisible && (
          <div className="hidden md:block absolute z-50 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg left-0 top-full">
            {text}
            <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        )}
      </div>
      
      {/* Mobile modal - shown only on mobile */}
      {isVisible && (
        <div 
          className="md:hidden fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setIsVisible(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-sm w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-sm font-bold text-gray-900">Information</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Schließen"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-700">{text}</p>
          </div>
        </div>
      )}
    </>
  );
}
