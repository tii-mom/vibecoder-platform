import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
}

export function Skeleton({
  className = '',
  variant = 'rect'
}: SkeletonProps) {
  const shapes = {
    text: 'h-3.5 w-3/4 rounded-md',
    rect: 'h-24 w-full rounded-2xl',
    circle: 'h-10 w-10 rounded-full'
  };

  return (
    <div
      className={`bg-[#181C2D] animate-pulse ${shapes[variant]} ${className}`}
    />
  );
}
