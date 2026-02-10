import React from 'react';
import { useToast } from '../../hooks/useToast';
import { Check, AlertCircle, X, Info } from 'lucide-react';

const icons = {
  success: Check,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
};

const styles = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
};

export const Toast = () => {
  const { toast, hideToast } = useToast();

  if (!toast) return null;

  const Icon = icons[toast.type] || Info;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
          styles[toast.type] || styles.info
        }`}
      >
        <Icon size={20} />
        <span className="font-medium">{toast.message}</span>
        <button
          onClick={hideToast}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
