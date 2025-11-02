
import React from 'react';
import { Icon } from './Icon';

export const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <Icon className={className}>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663v.005zM18 7.5a3 3 0 11-6 0 3 3 0 016 0zM12 12.75a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </Icon>
);
