import React from 'react';

interface IconProps {
  className?: string;
}

export const ProfileIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background layer (lighter) */}
    <circle
      cx="12"
      cy="8"
      r="5"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M20 21A8 8 0 1 0 4 21"
      fill="currentColor"
      fillOpacity="0.3"
    />
    
    {/* Foreground layer (darker) */}
    <circle
      cx="12"
      cy="8"
      r="5"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M20 21A8 8 0 1 0 4 21"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);