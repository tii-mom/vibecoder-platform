import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit' | 'reset';
  title?: string;
}

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  onClick,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyle = 'inline-flex items-center justify-center font-bold tracking-tight rounded-2xl transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';
  
  const variants = {
    primary: 'bg-gradient-to-r from-[#635BFF] to-[#7E75FF] hover:opacity-95 text-white shadow-lg shadow-[#635BFF]/15 border border-[#857CFF]/20',
    secondary: 'bg-[#0E1020] border border-[#232746] hover:border-[#3C4176] text-gray-300 hover:text-white',
    danger: 'bg-gradient-to-r from-rose-600 to-red-500 hover:opacity-95 text-white shadow-lg shadow-rose-600/15',
    ghost: 'hover:bg-[#121528] text-gray-400 hover:text-white'
  };

  const sizes = {
    sm: 'px-4 py-2 text-[11px]',
    md: 'px-5 py-3 text-xs',
    lg: 'px-7 py-4 text-sm'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={13} className="animate-spin mr-1.5 shrink-0" />}
      {children}
    </button>
  );
}
export default Button;
