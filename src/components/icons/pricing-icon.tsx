import React from 'react';

interface IconProps {
  className?: string;
}

export const PricingIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background layer (lighter) */}
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M12 6V18"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M9 9H15C15.55 9 16 9.45 16 10S15.55 11 15 11H9C8.45 11 8 10.55 8 10S8.45 9 9 9Z"
      fill="currentColor"
      fillOpacity="0.3"
    />
    <path
      d="M9 13H15C15.55 13 16 13.45 16 14S15.55 15 15 15H9C8.45 15 8 14.55 8 14S8.45 13 9 13Z"
      fill="currentColor"
      fillOpacity="0.3"
    />
    
    {/* Foreground layer (darker) */}
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M12 6V18"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M9 9H15C15.55 9 16 9.45 16 10S15.55 11 15 11H9C8.45 11 8 10.55 8 10S8.45 9 9 9Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M9 13H15C15.55 13 16 13.45 16 14S15.55 15 15 15H9C8.45 15 8 14.55 8 14S8.45 13 9 13Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);