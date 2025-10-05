import React from 'react';

interface IconProps {
  className?: string;
}

export const CollaborationIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background layer (lighter) */}
    <circle
      cx="9"
      cy="7"
      r="4"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <circle
      cx="15"
      cy="7"
      r="4"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M12 14C16 14 20 16 20 20V22H4V20C4 16 8 14 12 14Z"
      fill="currentColor"
      fillOpacity="0.3"
    />
    
    {/* Foreground layer (darker) */}
    <circle
      cx="9"
      cy="7"
      r="4"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <circle
      cx="15"
      cy="7"
      r="4"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M12 14C16 14 20 16 20 20V22H4V20C4 16 8 14 12 14Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);