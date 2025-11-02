
import React from 'react';

interface IconProps {
  className?: string;
  children: React.ReactNode;
}

export const Icon: React.FC<IconProps> = ({ className = 'w-6 h-6', children }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};
