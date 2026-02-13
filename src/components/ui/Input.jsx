import React from 'react';

const inputBase = 'w-full border-2 rounded-app transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed';

const inputSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3',
};

export const Input = ({
  label,
  type = 'text',
  className = '',
  inputClassName = '',
  error,
  size = 'md',
  rightElement,
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          type={type}
          className={`${inputBase} ${error ? 'border-red-500' : 'border-slate-200 focus:border-brand-500'} ${inputSizes[size] || inputSizes.md} ${rightElement ? 'pr-10' : ''} ${inputClassName}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export const Select = ({
  label,
  options = [],
  className = '',
  size = 'md',
  error,
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold mb-1">{label}</label>
      )}
      <select
        className={`${inputBase} ${error ? 'border-red-500' : 'border-slate-200 focus:border-brand-500'} ${inputSizes[size] || inputSizes.md}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const Checkbox = ({
  label,
  className = '',
  ...props
}) => {
  return (
    <label className={`flex items-center gap-2 cursor-pointer ${className}`}>
      <input type="checkbox" className="w-4 h-4 accent-brand-600" {...props} />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
};

export default Input;
