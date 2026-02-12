import React from 'react';
import { Loader2 } from 'lucide-react';

const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 rounded-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-card',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  outline: 'border-2 border-brand-600 text-brand-600 hover:bg-brand-50',
  destructiveOutline: 'border-2 border-red-600 text-red-600 hover:bg-red-50',
  nav: 'bg-white/20 text-white hover:bg-white/30 border border-white/20',
  navActive: 'bg-white text-brand-600 shadow-lg border border-white',
  toolbar: 'text-slate-600 hover:bg-slate-100 border border-transparent',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

const sizes = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-lg',
  icon: 'h-10 w-10 p-0',
  iconSm: 'h-8 w-8 p-0',
  nav: 'px-1.5 sm:px-2 py-2 sm:py-2.5 text-xs sm:text-sm',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon: Icon,
  iconSize = 18,
  loading = false,
  loadingText,
  ...props
}) => {
  const isDisabled = props.disabled || loading;

  return (
    <button
      className={`${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading
        ? <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" />
        : Icon && <Icon size={iconSize} aria-hidden="true" />}
      {(loading && loadingText) ? loadingText : children}
    </button>
  );
};

export default Button;
