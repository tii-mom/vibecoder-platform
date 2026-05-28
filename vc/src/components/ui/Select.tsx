import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full text-left">
        {label && (
          <label className="text-[11px] text-gray-400 font-bold block">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full bg-[#121620] border border-[#22253B] focus:border-[#635BFF] text-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none transition cursor-pointer font-sans font-semibold ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#121620] text-gray-200">
              {opt.label}
            </option>
          ))}
        </select>
        {error && <span className="text-[10px] text-rose-400 block">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
