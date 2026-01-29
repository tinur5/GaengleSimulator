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
    <div className={`relative inline-block ${className}`}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors ml-1"
        aria-label="Information"
      >
        ?
      </button>
      {isVisible && (
        <div className="absolute z-50 w-64 p-2 mt-1 text-xs bg-gray-900 text-white rounded shadow-lg left-0 top-full">
          {text}
          <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      )}
    </div>
  );
}
