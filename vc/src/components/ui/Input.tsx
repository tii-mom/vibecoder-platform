import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <label className="text-[11px] text-gray-400 font-bold block">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full bg-[#121620]/40 border border-[#22253B] focus:border-[#635BFF] text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition disabled:opacity-50 disabled:pointer-events-none font-sans font-medium placeholder:text-gray-600 ${className}`}
          {...props}
        />
        {error && <span className="text-[10px] text-rose-400 block">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
