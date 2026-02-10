import React from 'react';

export const Input = ({
  label,
  type = 'text',
  className = '',
  error,
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold mb-1">{label}</label>
      )}
      <input
        type={type}
        className={`w-full px-3 py-2 border-2 rounded-xl focus:border-emerald-500 outline-none transition-colors ${
          error ? 'border-red-500' : 'border-slate-200'
        }`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export const Select = ({
  label,
  options = [],
  className = '',
  ...props
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold mb-1">{label}</label>
      )}
      <select
        className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none transition-colors"
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
      <input type="checkbox" className="w-4 h-4" {...props} />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
};

export default Input;
