import React from 'react';

const variants = {
  primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  ghost: 'bg-transparent hover:bg-slate-100 text-slate-600',
  outline: 'border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50',
  nav: 'bg-white/20 text-white hover:bg-white/30',
  navActive: 'bg-white text-emerald-600',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconSize = 18,
  ...props
}) => {
  return (
    <button
      className={`rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={iconSize} />}
      {children}
    </button>
  );
};

export default Button;
