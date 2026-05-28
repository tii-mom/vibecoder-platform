import React from 'react';

export interface CardProps {
  hoverable?: boolean;
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  key?: React.Key;
}

export function Card({
  children,
  className = '',
  hoverable = false,
  onClick,
  ...props
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#0A0B14] border border-[#171A30] rounded-3xl p-8 text-left transition-all duration-300 ${
        hoverable ? 'hover:border-[#22284C] hover:bg-[#0F1121] hover:shadow-xl hover:shadow-black/35 cursor-pointer' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`border-b border-[#171A30] pb-4 mb-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '', ...props }: CardTitleProps) {
  return (
    <h3 className={`text-sm font-black text-white tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export interface CardDescriptionProps {
  children?: React.ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '', ...props }: CardDescriptionProps) {
  return (
    <p className={`text-[10.5px] text-gray-400 font-medium leading-relaxed mt-1 ${className}`} {...props}>
      {children}
    </p>
  );
}
