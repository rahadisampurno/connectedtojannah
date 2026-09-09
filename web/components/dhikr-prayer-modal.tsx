'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IslamicModule, DhikrItem } from '../lib/islamic-content';

interface DzikirPrayerModalProps {
  module: IslamicModule;
  onClose: () => void;
  initialIndex?: number;
}

export function DzikirPrayerModal({ module, onClose, initialIndex = 0 }: DzikirPrayerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [fontSizeStep, setFontSizeStep] = useState<number>(2); // 0: 20px, 1: 24px, 2: 28px, 3: 34px, 4: 40px
  const [showToc, setShowToc] = useState(false);

  const fontSizes = ['21px', '25px', '29px', '35px', '42px'];
  const currentItem: DhikrItem | undefined = module.items[currentIndex];

  const currentCount = currentItem ? (counts[currentItem.id] ?? 0) : 0;
  const isCompleted = currentItem ? currentCount >= currentItem.count : false;

  // Handle keyboard navigation (Left / Right arrow, Space for count, Esc to close)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showToc) {
          setShowToc(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < module.items.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }
    },
    [currentIndex, module.items.length, onClose, showToc]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const incrementCount = () => {
    if (!currentItem) return;
    setCounts(prev => {
      const cur = prev[currentItem.id] ?? 0;
      return { ...prev, [currentItem.id]: cur + 1 };
    });
  };

  const resetCount = () => {
    if (!currentItem) return;
    setCounts(prev => ({ ...prev, [currentItem.id]: 0 }));
  };

  const nextItem = () => {
    if (currentIndex < module.items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / module.items.length) * 100);

  return (
    <div className="dhikr-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={module.title}>
      <section className="dhikr-modal-container" onClick={e => e.stopPropagation()}>
        {/* Header Bar */}
        <header className="dhikr-modal-head">
          <button type="button" className="dhikr-close-btn" onClick={onClose} aria-label="Tutup modal">
            ✕
          </button>
          <div className="dhikr-head-title-wrap">
            <span className="dhikr-head-badge">{module.badge}</span>
            <h2>{module.title}</h2>
            <small>{module.subtitle}</small>
          </div>
          <div className="dhikr-head-actions">
            {/* Font Size Adjuster */}
            <div className="font-size-controls" title="Ukuran Font Arab">
              <button
                type="button"
                disabled={fontSizeStep <= 0}
                onClick={() => setFontSizeStep(prev => Math.max(0, prev - 1))}
                aria-label="Perkecil font"
              >
                A-
              </button>
              <button
                type="button"
                disabled={fontSizeStep >= fontSizes.length - 1}
                onClick={() => setFontSizeStep(prev => Math.min(fontSizes.length - 1, prev + 1))}
                aria-label="Perbesar font"
              >
                A+
              </button>
            </div>
            {/* Table of Contents Button */}
            <button
              type="button"
              className={`dhikr-toc-toggle ${showToc ? 'active' : ''}`}
              onClick={() => setShowToc(!showToc)}
              title="Daftar Isi"
              aria-label="Daftar Isi"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" strokeWidth="3" />
                <line x1="3" y1="12" x2="3.01" y2="12" strokeWidth="3" />
                <line x1="3" y1="18" x2="3.01" y2="18" strokeWidth="3" />
              </svg>
            </button>
          </div>
        </header>

        {/* Time Guide Alert */}
        {module.timeGuide && (
          <div className="dhikr-time-guide">
            <span className="time-guide-icon">☀</span>
            <p>{module.timeGuide}</p>
          </div>
        )}

        {/* Progress Bar & Sequence Counter */}
        <div className="dhikr-progress-bar-wrap">
          <div className="dhikr-sequence-info">
            <b>
              {String(currentIndex + 1).padStart(2, '0')} / {String(module.items.length).padStart(2, '0')}
            </b>
            <span>{currentItem?.title}</span>
          </div>
          <div className="dhikr-progress-track">
            <div className="dhikr-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Main Content Card */}
        {currentItem && (
          <div className="dhikr-card-body">
            {/* Top Card Meta */}
            <div className="dhikr-card-top">
              <span className="dhikr-index-tag">#{String(currentItem.order).padStart(2, '0')}</span>
              <h3 className="dhikr-item-title">{currentItem.title}</h3>
              <span className={`dhikr-count-badge ${isCompleted ? 'done' : ''}`}>
                {isCompleted ? '✓ Target ' : ''}
                {currentItem.count}x
              </span>
            </div>

            {/* Arabic Text Display */}
            <div className="dhikr-arabic-container">
              <p
                className="dhikr-arabic-text"
                dir="rtl"
                lang="ar"
                style={{ fontSize: fontSizes[fontSizeStep] }}
              >
                {currentItem.arabic}
              </p>
            </div>

            {/* Interactive Tasbih Counter */}
            <div className={`dhikr-counter-box ${isCompleted ? 'target-reached' : ''}`}>
              <button
                type="button"
                className="counter-reset-btn"
                onClick={resetCount}
                title="Reset Hitungan"
                aria-label="Reset hitungan"
              >
                ↺
              </button>
              <div className="counter-display" onClick={incrementCount} role="button" tabIndex={0}>
                <span className="current-count-num">{currentCount}</span>
                <span className="count-target-num">/ {currentItem.count}</span>
              </div>
              <button
                type="button"
                className="counter-plus-btn"
                onClick={incrementCount}
                aria-label="Tambah hitungan tasbih"
              >
                +
              </button>
            </div>

            {/* Latin Transliteration */}
            {currentItem.latin && (
              <div className="dhikr-latin-box">
                <p>{currentItem.latin}</p>
              </div>
            )}

            {/* Translation */}
            {currentItem.translation && (
              <div className="dhikr-translation-box">
                <p>"{currentItem.translation}"</p>
              </div>
            )}

            {/* Dalil & Fadhilah Box */}
            <div className="dhikr-dalil-box">
              {currentItem.fadhilah && (
                <div className="fadhilah-row">
                  <b>Fadhilah:</b> <span>{currentItem.fadhilah}</span>
                </div>
              )}
              <div className="dalil-row">
                <b>Dalil:</b> <cite>{currentItem.dalil}</cite>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Bar */}
        <footer className="dhikr-modal-footer">
          <button
            type="button"
            className="dhikr-nav-btn prev"
            disabled={currentIndex === 0}
            onClick={prevItem}
            aria-label="Sebelumnya"
          >
            ‹ Sebelumnya
          </button>

          <div className="dhikr-dots-indicator">
            {module.items.map((item, idx) => {
              const itemDone = (counts[item.id] ?? 0) >= item.count;
              return (
                <button
                  key={item.id}
                  className={`dot ${idx === currentIndex ? 'active' : ''} ${itemDone ? 'completed' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  title={item.title}
                  aria-label={`Buka item ${idx + 1}`}
                />
              );
            })}
          </div>

          {currentIndex < module.items.length - 1 ? (
            <button type="button" className="dhikr-nav-btn next" onClick={nextItem} aria-label="Berikutnya">
              Berikutnya ›
            </button>
          ) : (
            <button type="button" className="dhikr-nav-btn finish" onClick={onClose} aria-label="Selesai">
              ✓ Selesai
            </button>
          )}
        </footer>

        {/* Table of Contents Drawer */}
        {showToc && (
          <div className="dhikr-toc-drawer" onClick={() => setShowToc(false)}>
            <div className="dhikr-toc-panel" onClick={e => e.stopPropagation()}>
              <div className="dhikr-toc-header">
                <h3>Daftar Bacaan ({module.items.length})</h3>
                <button type="button" onClick={() => setShowToc(false)}>
                  ✕
                </button>
              </div>
              <ul className="dhikr-toc-list">
                {module.items.map((item, idx) => {
                  const itemDone = (counts[item.id] ?? 0) >= item.count;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`toc-item-btn ${idx === currentIndex ? 'current' : ''} ${itemDone ? 'done' : ''}`}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setShowToc(false);
                        }}
                      >
                        <span className="toc-number">{String(idx + 1).padStart(2, '0')}</span>
                        <span className="toc-title">{item.title}</span>
                        <span className="toc-badge">{item.count}x</span>
                        {itemDone && <span className="toc-check">✓</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
