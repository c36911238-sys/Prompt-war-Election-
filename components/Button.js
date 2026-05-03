/**
 * Reusable Button component with consistent styling and accessibility
 * Eliminates button styling inconsistencies across the application
 */

import React from 'react';
import './Button.css';

/**
 * Button variants and their corresponding CSS classes
 */
const BUTTON_VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  google: 'btn-google',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  link: 'btn-link',
};

/**
 * Button sizes and their corresponding CSS classes
 */
const BUTTON_SIZES = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
};

/**
 * Reusable Button component
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button style variant (primary, secondary, google, danger, ghost, link)
 * @param {string} props.size - Button size (sm, md, lg)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {boolean} props.loading - Whether button is in loading state
 * @param {string} props.type - Button type (button, submit, reset)
 * @param {string} props.className - Additional CSS classes
 * @param {React.ReactNode} props.children - Button content
 * @param {React.ReactNode} props.icon - Optional icon element
 * @param {string} props.iconPosition - Icon position (left, right)
 * @param {Function} props.onClick - Click handler
 * @param {Object} props.ariaLabel - Accessibility label
 * @param {...Object} props - Additional props passed to button element
 * @returns {React.ReactElement} Button component
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  children,
  icon = null,
  iconPosition = 'left',
  onClick,
  ariaLabel,
  ...props
}) {
  // Build CSS classes
  const baseClass = 'btn';
  const variantClass = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary;
  const sizeClass = BUTTON_SIZES[size] || BUTTON_SIZES.md;
  const loadingClass = loading ? 'btn-loading' : '';
  const disabledClass = disabled ? 'btn-disabled' : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    loadingClass,
    disabledClass,
    className,
  ].filter(Boolean).join(' ');

  // Handle click events
  const handleClick = (event) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick(event);
    }
  };

  // Render icon with proper positioning
  const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <span 
        className={`btn-icon btn-icon-${iconPosition}`}
        aria-hidden="true"
      >
        {icon}
      </span>
    );
  };

  // Render loading spinner
  const renderLoadingSpinner = () => {
    if (!loading) return null;
    
    return (
      <span 
        className="btn-spinner"
        aria-hidden="true"
      />
    );
  };

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={handleClick}
      aria-label={ariaLabel}
      aria-busy={loading}
      {...props}
    >
      {loading && renderLoadingSpinner()}
      {iconPosition === 'left' && renderIcon()}
      
      <span className="btn-content">
        {children}
      </span>
      
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
}

/**
 * Specialized button variants for common use cases
 */

/**
 * Primary action button (most important action on the page)
 */
export function PrimaryButton(props) {
  return <Button variant="primary" {...props} />;
}

/**
 * Secondary action button (less important actions)
 */
export function SecondaryButton(props) {
  return <Button variant="secondary" {...props} />;
}

/**
 * Google OAuth button with consistent styling
 */
export function GoogleButton(props) {
  return <Button variant="google" {...props} />;
}

/**
 * Danger/destructive action button (delete, remove, etc.)
 */
export function DangerButton(props) {
  return <Button variant="danger" {...props} />;
}

/**
 * Ghost button (minimal styling, often used for cancel actions)
 */
export function GhostButton(props) {
  return <Button variant="ghost" {...props} />;
}

/**
 * Link-styled button (looks like a link but behaves like a button)
 */
export function LinkButton(props) {
  return <Button variant="link" {...props} />;
}

/**
 * Icon-only button for actions with just an icon
 */
export function IconButton({ 
  icon, 
  ariaLabel, 
  size = 'md', 
  variant = 'ghost',
  ...props 
}) {
  if (!ariaLabel) {
    console.warn('IconButton requires ariaLabel for accessibility');
  }
  
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      ariaLabel={ariaLabel}
      className="btn-icon-only"
      {...props}
    />
  );
}

/**
 * Loading button that shows spinner when loading
 */
export function LoadingButton({ 
  loading, 
  loadingText = 'Loading...', 
  children, 
  ...props 
}) {
  return (
    <Button
      loading={loading}
      {...props}
    >
      {loading ? loadingText : children}
    </Button>
  );
}

export default Button;