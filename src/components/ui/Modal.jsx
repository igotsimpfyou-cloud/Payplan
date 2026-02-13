import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const getFocusableElements = (container) => {
  if (!container) return [];
  return [...container.querySelectorAll(FOCUSABLE_SELECTORS)].filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true'
  );
};

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  panelClassName = '',
  overlayClassName = 'bg-black/50',
  contentClassName = 'p-6',
  titleClassName = 'text-2xl font-bold',
  closeButtonLabel = 'Close dialog',
  showCloseButton = true,
  closeOnOverlayClick = true,
  ariaLabelledBy,
  ariaLabel,
}) => {
  const generatedTitleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    const focusable = getFocusableElements(dialogRef.current);
    if (focusable.length > 0) {
      focusable[0].focus();
    } else {
      dialogRef.current?.focus();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = ariaLabelledBy || generatedTitleId;
  const shouldUseLabelledBy = !!title || !ariaLabel;

  const handleKeyDown = (event) => {
    if (!dialogRef.current) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== 'Tab') return;

    const currentFocusable = getFocusableElements(dialogRef.current);
    if (currentFocusable.length === 0) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }

    const first = currentFocusable[0];
    const last = currentFocusable[currentFocusable.length - 1];
    const active = document.activeElement;

    if (!dialogRef.current.contains(active)) {
      event.preventDefault();
      if (event.shiftKey) {
        last.focus();
      } else {
        first.focus();
      }
      return;
    }

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 p-4 ${overlayClassName}`}>
      <div
        className="absolute inset-0"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div className="relative flex min-h-full items-center justify-center" onKeyDown={handleKeyDown}>
        <div
          ref={dialogRef}
          className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} ${panelClassName}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={shouldUseLabelledBy ? titleId : undefined}
          aria-label={shouldUseLabelledBy ? undefined : ariaLabel}
          tabIndex={-1}
        >
          <div className={contentClassName}>
            {(title || showCloseButton || shouldUseLabelledBy) && (
              <div className="flex items-center justify-between mb-4">
                {title ? (
                  <h2 id={titleId} className={titleClassName}>
                    {title}
                  </h2>
                ) : (
                  <span id={titleId} className="sr-only">
                    Dialog
                  </span>
                )}
                {showCloseButton && (
                  <button
                    type="button"
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    onClick={onClose}
                    aria-label={closeButtonLabel}
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
