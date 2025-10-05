import React from 'react';

interface IconProps {
  className?: string;
}

export const AdminIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background layer (lighter) */}
    <path
      d="M12 1L21 5V11C21 16.55 17.16 21.74 12 23C6.84 21.74 3 16.55 3 11V5L12 1Z"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M9 12L11 14L15 10"
      fill="currentColor"
      fillOpacity="0.3"
    />
    
    {/* Foreground layer (darker) */}
    <path
      d="M12 1L21 5V11C21 16.55 17.16 21.74 12 23C6.84 21.74 3 16.55 3 11V5L12 1Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M9 12L11 14L15 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);