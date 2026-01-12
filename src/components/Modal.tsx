import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  showCancel?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmButtonStyle?: 'primary' | 'danger' | 'success';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCancel = false,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  confirmButtonStyle = 'primary'
}: ModalProps) {
  if (!isOpen) return null;

  const getConfirmButtonColor = () => {
    switch (confirmButtonStyle) {
      case 'danger':
        return '#dc2626';
      case 'success':
        return '#10b981';
      case 'primary':
      default:
        return '#3b82f6';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: 'var(--spacing-lg)',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: '1.125rem', fontWeight: 600 }}>
          {title}
        </h3>

        <div style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-text)', lineHeight: 1.5 }}>
          {children}
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#d1d5db')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#e5e7eb')}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: getConfirmButtonColor(),
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              const color = getConfirmButtonColor();
              const hoverColor = confirmButtonStyle === 'danger' ? '#b91c1c' : confirmButtonStyle === 'success' ? '#059669' : '#2563eb';
              e.currentTarget.style.backgroundColor = hoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = getConfirmButtonColor();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
