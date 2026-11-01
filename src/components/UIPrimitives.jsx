import React from 'react'
import { CloseIcon, AlertCircleIcon, CheckCircleIcon, SparklesIcon } from './icons.jsx'
import './UIPrimitives.css'

/**
 * 1. Button Primitive
 * Variants: primary | ghost | outline | danger | subtle
 * Sizes: normal (44px) | small (36px) | wide (full width)
 * Pill shape optional (default radius 12px)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'normal',
  pill = false,
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) {
  const classes = [
    'reading-btn',
    `reading-btn--${variant}`,
    size !== 'normal' ? `reading-btn--${size}` : '',
    pill ? 'reading-btn--pill' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
}

/**
 * 2. Chip / Badge Primitive
 * For blueprint chips (MCQs count, duration, pass mark, deduction),
 * syllabus tags, status pills.
 */
export function Chip({
  children,
  variant = 'default', // 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'urdu'
  size = 'normal', // 'normal' | 'small'
  className = '',
  ...props
}) {
  const classes = [
    'reading-chip',
    `reading-chip--${variant}`,
    size === 'small' ? 'reading-chip--small' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}

/**
 * 3. Form Input Primitives
 * TextInput, SearchInput with clear button, Slider, Checkbox
 */
export function Input({
  label,
  error,
  id,
  className = '',
  ...props
}) {
  return (
    <div className={`reading-input-wrap ${className}`}>
      {label && (
        <label htmlFor={id} className="reading-input-label">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`reading-input-field ${error ? 'has-error' : ''}`}
        {...props}
      />
      {error && <span className="reading-input-error">{error}</span>}
    </div>
  )
}

export function Checkbox({
  label,
  checked,
  onChange,
  id,
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <label className={`reading-checkbox-label ${disabled ? 'is-disabled' : ''} ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="reading-checkbox-native"
        {...props}
      />
      <span className="reading-checkbox-custom" aria-hidden="true">
        {checked && <CheckCircleIcon width="14" height="14" />}
      </span>
      {label && <span className="reading-checkbox-text">{label}</span>}
    </label>
  )
}

/**
 * 4. Universal Modal / Drawer
 * 24px radius, backdrop blur, mobile handle, esc dismissal
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  drawerMobile = true,
  maxWidth = '28rem',
}) {
  if (!isOpen) return null

  return (
    <div
      className="reading-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Dialog'}
    >
      <div
        className={`reading-modal-dialog ${drawerMobile ? 'has-drawer-mobile' : ''}`}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {drawerMobile && <div className="reading-drawer-handle" aria-hidden="true" />}
        <header className="reading-modal-header">
          {title && <h2 className="reading-modal-title">{title}</h2>}
          <button
            type="button"
            className="reading-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <CloseIcon width="20" height="20" />
          </button>
        </header>
        <div className="reading-modal-content">{children}</div>
      </div>
    </div>
  )
}

/**
 * 5. Toast Notification
 */
export function Toast({
  message,
  variant = 'info', // 'success' | 'error' | 'warning' | 'info'
  onDismiss,
}) {
  return (
    <div className={`reading-toast reading-toast--${variant}`} role="alert">
      <span className="toast-icon">
        {variant === 'success' && <CheckCircleIcon width="18" height="18" />}
        {variant === 'error' && <AlertCircleIcon width="18" height="18" />}
        {variant === 'warning' && <AlertCircleIcon width="18" height="18" />}
        {variant === 'info' && <SparklesIcon width="18" height="18" />}
      </span>
      <span className="toast-msg">{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="toast-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <CloseIcon width="14" height="14" />
        </button>
      )}
    </div>
  )
}

/**
 * 6. Empty State Component
 * Quiet desk empty illustration with calm reassurance and primary CTA
 */
export function EmptyState({
  title = 'No items found',
  description = 'Your desk is clean and ready. Select a lesson or track to begin study.',
  actionLabel,
  onAction,
  icon,
}) {
  return (
    <div className="reading-empty-state">
      <div className="empty-state-lamp-art" aria-hidden="true">
        {icon || (
          <div className="omr-empty-disc">
            <SparklesIcon width="32" height="32" />
          </div>
        )}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" pill onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
