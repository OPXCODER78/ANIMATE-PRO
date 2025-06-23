
import React from 'react';

export const FilmIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      d="M6 20.25h12m-7.5-3.75v3.75m4.5-3.75v3.75m-7.5-3.75L3 16.5m0 0L3 21m3-4.5L3.5 15M21 16.5L18 20.25m3-3.75L21 21m-3-4.5l2.5-1.5M16.5 3.75L12 6.75 7.5 3.75m9 0L12 9.75M7.5 3.75L12 9.75m0 0V21m0-11.25c-1.875 0-3.5-1.25-4.125-3M12 9.75c1.875 0 3.5-1.25 4.125-3" 
    />
    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="0" fill="currentColor" fillOpacity="0.05" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75h.75m13.5 0h.75M4.5 12h.75m13.5 0h.75m-15 4.5h.75M18 16.5h.75" />
  </svg>
);
