import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-modal w-full ${maxWidth}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <Button
              variant="toolbar"
              size="iconSm"
              className="rounded-lg"
              onClick={onClose}
              aria-label="Close modal"
              icon={X}
              iconSize={20}
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
