/**
 * Reusable Modal component with consistent behavior and accessibility
 * Eliminates modal duplication and provides standardized modal patterns
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { IconButton } from './Button';
import './Modal.css';

/**
 * Modal sizes and their corresponding CSS classes
 */
const MODAL_SIZES = {
  sm: 'modal-sm',
  md: 'modal-md',
  lg: 'modal-lg',
  xl: 'modal-xl',
  full: 'modal-full',
};

/**
 * Reusable Modal component
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Function called when modal should close
 * @param {string} props.title - Modal title (optional)
 * @param {string} props.size - Modal size (sm, md, lg, xl, full)
 * @param {boolean} props.closeOnOverlayClick - Whether clicking overlay closes modal (default: true)
 * @param {boolean} props.closeOnEscape - Whether pressing Escape closes modal (default: true)
 * @param {boolean} props.showCloseButton - Whether to show close button (default: true)
 * @param {string} props.className - Additional CSS classes for modal content
 * @param {string} props.overlayClassName - Additional CSS classes for overlay
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Optional footer content
 * @param {string} props.ariaLabel - Accessibility label for modal
 * @param {string} props.ariaDescribedBy - ID of element that describes modal
 * @returns {React.ReactElement|null} Modal component or null if not open
 */
export function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  overlayClassName = '',
  children,
  footer,
  ariaLabel,
  ariaDescribedBy,
}) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Handle escape key press
  const handleEscapeKey = useCallback((event) => {
    if (closeOnEscape && event.key === 'Escape') {
      onClose();
    }
  }, [closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement;
      
      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus();
      }
      
      // Add escape key listener
      document.addEventListener('keydown', handleEscapeKey);
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Remove escape key listener
        document.removeEventListener('keydown', handleEscapeKey);
        
        // Restore body scroll
        document.body.style.overflow = '';
        
        // Restore focus to previous element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
  }, [isOpen, handleEscapeKey]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  // Build CSS classes
  const sizeClass = MODAL_SIZES[size] || MODAL_SIZES.md;
  const modalClasses = ['modal-content', sizeClass, className].filter(Boolean).join(' ');
  const overlayClasses = ['modal-overlay', overlayClassName].filter(Boolean).join(' ');

  return (
    <div 
      className={overlayClasses}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      aria-describedby={ariaDescribedBy}
    >
      <div 
        ref={modalRef}
        className={modalClasses}
        tabIndex={-1}
        role="document"
      >
        {/* Modal Header */}
        {(title || showCloseButton) && (
          <div className="modal-header">
            {title && (
              <h2 className="modal-title" id="modal-title">
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <IconButton
                icon={<span className="material-symbols-outlined">close</span>}
                onClick={onClose}
                ariaLabel="Close modal"
                variant="ghost"
                size="sm"
                className="modal-close-button"
              />
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body">
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confirmation modal for destructive actions
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  ...props
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const footer = (
    <div className="modal-actions">
      <Button variant="ghost" onClick={onClose}>
        {cancelText}
      </Button>
      <Button variant={variant} onClick={handleConfirm}>
        {confirmText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
      {...props}
    >
      <p className="modal-message">{message}</p>
    </Modal>
  );
}

/**
 * Alert modal for displaying information
 */
export function AlertModal({
  isOpen,
  onClose,
  title = 'Information',
  message,
  buttonText = 'OK',
  variant = 'primary',
  ...props
}) {
  const footer = (
    <div className="modal-actions">
      <Button variant={variant} onClick={onClose}>
        {buttonText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
      {...props}
    >
      <p className="modal-message">{message}</p>
    </Modal>
  );
}

/**
 * Loading modal for long-running operations
 */
export function LoadingModal({
  isOpen,
  title = 'Loading...',
  message = 'Please wait while we process your request.',
  ...props
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing during loading
      title={title}
      size="sm"
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      {...props}
    >
      <div className="modal-loading">
        <div className="modal-spinner" />
        <p className="modal-message">{message}</p>
      </div>
    </Modal>
  );
}

/**
 * Form modal wrapper for forms
 */
export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  submitText = 'Submit',
  cancelText = 'Cancel',
  isSubmitting = false,
  children,
  ...props
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit(event);
    }
  };

  const footer = (
    <div className="modal-actions">
      <Button 
        variant="ghost" 
        onClick={onClose}
        disabled={isSubmitting}
      >
        {cancelText}
      </Button>
      <Button 
        type="submit" 
        variant="primary"
        loading={isSubmitting}
        form="modal-form"
      >
        {submitText}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
      {...props}
    >
      <form id="modal-form" onSubmit={handleSubmit}>
        {children}
      </form>
    </Modal>
  );
}

export default Modal;