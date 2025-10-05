import React from 'react';

interface IconProps {
  className?: string;
}

export const DashboardIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background layer (lighter) */}
    <rect
      x="3"
      y="3"
      width="8"
      height="8"
      rx="2"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <rect
      x="13"
      y="3"
      width="8"
      height="5"
      rx="2"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <rect
      x="13"
      y="10"
      width="8"
      height="11"
      rx="2"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <rect
      x="3"
      y="13"
      width="8"
      height="8"
      rx="2"
      fill="currentColor"
      fillOpacity="0.3"
    />
    
    {/* Foreground layer (darker) */}
    <rect
      x="3"
      y="3"
      width="8"
      height="8"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <rect
      x="13"
      y="3"
      width="8"
      height="5"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <rect
      x="13"
      y="10"
      width="8"
      height="11"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <rect
      x="3"
      y="13"
      width="8"
      height="8"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);