import React from 'react';

interface IconProps {
  className?: string;
}

export const NotificationsIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background layer (lighter) */}
    <path
      d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M13.73 21A2 2 0 0 1 10.27 21"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <circle
      cx="18"
      cy="6"
      r="3"
      fill="currentColor"
      fillOpacity="0.3"
    />
    
    {/* Foreground layer (darker) */}
    <path
      d="M18 8A6 6 0 0 0 6 8C6 15 3 17 3 17H21S18 15 18 8Z"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M13.73 21A2 2 0 0 1 10.27 21"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle
      cx="18"
      cy="6"
      r="3"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);