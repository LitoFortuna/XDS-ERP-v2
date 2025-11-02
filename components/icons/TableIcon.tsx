
import React from 'react';
import { Icon } from './Icon';

export const TableIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5v-1.5M1.125 18.375v-1.5m1.125 1.5H1.125m2.25 0h17.25m-17.25 0a1.125 1.125 0 001.125 1.125m1.125-1.125v-1.5m17.25 1.5v-1.5M20.625 19.5h1.125m-1.125 0a1.125 1.125 0 011.125 1.125m1.125-1.125v-1.5m-21 0v-1.5m21 1.5v-1.5M3.375 4.5h17.25m-17.25 0a1.125 1.125 0 01-1.125 1.125M3.375 4.5v1.5m-2.25-1.5v1.5m1.125-1.5H1.125m2.25 0h17.25M3.375 6v1.5m17.25-1.5v1.5m0-1.5a1.125 1.125 0 00-1.125-1.125m-1.125 1.125v1.5m-15-1.5v1.5m15 0v1.5m-15-1.5v1.5M4.5 12h15m-15 0a1.125 1.125 0 01-1.125-1.125M4.5 12v-1.5m-2.25 1.5v-1.5m1.125 1.5H1.125M4.5 9.375v-1.5m17.25 1.5v-1.5M20.625 9.375h1.125M20.625 9.375a1.125 1.125 0 011.125-1.125m1.125 1.125V6.75" />
    </svg>
  </Icon>
);
