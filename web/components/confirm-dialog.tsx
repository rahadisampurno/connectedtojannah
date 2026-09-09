'use client';

import Image from 'next/image';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  detailText?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  mascotSpeech?: string;
}

type ConfirmContextType = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm(): ConfirmContextType {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context;
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((result: boolean) => {
    if (dialogState) {
      dialogState.resolve(result);
      setDialogState(null);
    }
  }, [dialogState]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!dialogState?.isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus cancel button for safe keyboard interaction
    const timer = setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [dialogState?.isOpen, handleClose]);

  const options = dialogState?.options;
  const variant = options?.variant || 'primary';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {dialogState?.isOpen && options && (
        <div
          className="ctj-confirm-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose(false);
            }
          }}
        >
          <div
            className="ctj-confirm-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ctj-confirm-dialog-title"
            aria-describedby="ctj-confirm-dialog-message"
          >
            {/* Mascot Container */}
            <div className="ctj-confirm-mascot-wrap">
              <div className="ctj-confirm-mascot-glow" aria-hidden="true" />
              <div className="ctj-confirm-mascot-img-box">
                <Image
                  src="/images/lea-nan-companions.webp"
                  alt="Maskot Lea dan Nan"
                  width={240}
                  height={160}
                  priority
                  className="ctj-confirm-mascot-img"
                />
              </div>
            </div>

            {/* Kicker badge */}
            <div className="ctj-confirm-kicker">
              <span>✦</span> TEMAN PERJALANANMU <span>✦</span>
            </div>

            {/* Dialog Content */}
            <h3 id="ctj-confirm-dialog-title" className="ctj-confirm-title">
              {options.title}
            </h3>

            <p id="ctj-confirm-dialog-message" className="ctj-confirm-message">
              {options.message}
            </p>

            {options.detailText && (
              <div className="ctj-confirm-detail-badge">
                <span>{options.detailText}</span>
              </div>
            )}

            {options.mascotSpeech && (
              <div className="ctj-confirm-speech-quote">
                <span className="quote-icon">“</span>
                <p>{options.mascotSpeech}</p>
                <small>— Lea & Nan</small>
              </div>
            )}

            {/* Action buttons */}
            <div className="ctj-confirm-actions">
              <button
                ref={cancelBtnRef}
                type="button"
                className="ctj-confirm-btn ctj-confirm-cancel"
                onClick={() => handleClose(false)}
              >
                {options.cancelText || 'Batal'}
              </button>

              <button
                type="button"
                className={`ctj-confirm-btn ctj-confirm-submit ctj-confirm-submit-${variant}`}
                onClick={() => handleClose(true)}
              >
                {options.confirmText || 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
