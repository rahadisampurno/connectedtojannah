'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { IslamicModule, DhikrItem } from '../lib/islamic-content';
import {
  IconFajrSun,
  IconTwilightMoon,
  IconBadaSholat,
  IconSebelumTidur,
  IconTataCaraShalat,
  IconTasbihDigital,
} from './ctj-icons';

interface IslamicReaderScreenProps {
  module: IslamicModule;
  onBack: () => void;
  initialIndex?: number;
}

export function IslamicReaderScreen({ module, onBack, initialIndex = 0 }: IslamicReaderScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [fontSizeStep, setFontSizeStep] = useState<number>(2); // 0: 22px, 1: 26px, 2: 30px, 3: 36px, 4: 42px
  const [showToc, setShowToc] = useState(false);
  const [theme, setTheme] = useState<'midnight' | 'ivory'>('midnight');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ctj_reader_theme') as 'midnight' | 'ivory' | null;
      if (saved === 'midnight' || saved === 'ivory') {
        setTheme(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'midnight' ? 'ivory' : 'midnight';
    setTheme(next);
    try {
      localStorage.setItem('ctj_reader_theme', next);
    } catch {
      /* ignore */
    }
  };

  const fontSizes = ['22px', '26px', '30px', '36px', '42px'];
  const currentItem: DhikrItem | undefined = module.items[currentIndex];

  const currentCount = currentItem ? (counts[currentItem.id] ?? 0) : 0;
  const isCompleted = currentItem ? currentCount >= currentItem.count : false;

  // Keyboard navigation: Left/Right arrow, Space for count, Esc to back
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showToc) {
          setShowToc(false);
        } else {
          onBack();
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
    [currentIndex, module.items.length, onBack, showToc]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const incrementCount = () => {
    if (!currentItem) return;
    setCounts(prev => {
      const cur = prev[currentItem.id] ?? 0;
      if (cur >= currentItem.count) {
        return prev; // Target bacaan tidak bisa melebihi batas target
      }
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
    } else {
      onBack();
    }
  };

  const prevItem = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const progressPercent = Math.round(((currentIndex + 1) / module.items.length) * 100);

  return (
    <div className={`zen-reader-page ctj-theme-${theme}`}>
      <div className="zen-reader-container">
        {/* Top Header Row (Gambar 1 style: Circular [←] left, Centered Title, Circular [↺][☰] right) */}
        <header className="zen-header-row">
          <button
            type="button"
            className="zen-circle-btn back"
            onClick={onBack}
            title="Kembali ke Beranda"
            aria-label="Kembali ke Beranda"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="zen-header-center">
            <span className="zen-header-subtitle">{module.subtitle.toUpperCase()}</span>
            <h1 className="zen-header-title">{module.title}</h1>
          </div>

          <div className="zen-header-actions">
            <button
              type="button"
              className="zen-circle-btn theme-toggle"
              onClick={toggleTheme}
              title={theme === 'midnight' ? 'Mode Terang (Ivory Emas)' : 'Mode Malam (Midnight Celestial)'}
              aria-label="Ganti mode tema baca"
            >
              {theme === 'midnight' ? (
                <IconFajrSun size={17} color="#f0d185" />
              ) : (
                <IconTwilightMoon size={17} color="#0f766e" />
              )}
            </button>
            {currentItem && currentItem.count > 1 && (
              <button
                type="button"
                className="zen-circle-btn reset"
                onClick={resetCount}
                title="Reset hitungan bacaan ini"
                aria-label="Reset hitungan"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className={`zen-circle-btn toc ${showToc ? 'active' : ''}`}
              onClick={() => setShowToc(!showToc)}
              title="Daftar Isi Amalan"
              aria-label="Buka daftar amalan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        {/* Time Guide Card */}
        {module.timeGuide && (
          <div className="zen-time-card">
            <div className="zen-time-icon">
              {module.id === 'dzikir-petang' ? (
                <IconTwilightMoon size={22} color="#7dd3fc" />
              ) : module.id === 'sebelum-tidur' ? (
                <IconSebelumTidur size={22} color="#c4b5fd" />
              ) : module.id === 'tata-cara-shalat' ? (
                <IconTataCaraShalat size={22} color="#7dd3fc" />
              ) : module.id === 'bada-sholat' ? (
                <IconBadaSholat size={22} color="#72cec4" />
              ) : (
                <IconFajrSun size={22} color="#f0d185" />
              )}
            </div>
            <div className="zen-time-content">
              <span className="zen-time-badge">WAKTU UTAMA</span>
              <p className="zen-time-desc">{module.timeGuide}</p>
            </div>
          </div>
        )}

        {/* Minimal Stepper Row (01 / 15 and progress track) */}
        <div className="zen-stepper-row">
          <div className="zen-stepper-meta">
            <div className="zen-stepper-counter">
              <span className="zen-step-current">{String(currentIndex + 1).padStart(2, '0')}</span>
              <span className="zen-step-slash">/</span>
              <span className="zen-step-total">{String(module.items.length).padStart(2, '0')}</span>
            </div>
            <span className="zen-step-title">{currentItem?.title}</span>
            <span className="zen-step-pct">{progressPercent}%</span>
          </div>
          <div className="zen-stepper-track">
            <div className="zen-stepper-bar" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Main Clean Reading Card (Gambar 1: Solid White, Rounded 28px, Clean Shadow) */}
        {currentItem && (
          <article className="zen-reading-card">
            {/* Card Header Row */}
            <div className="zen-card-head">
              <div className="zen-card-badge-wrap">
                <span className="zen-order-pill">DZIKIR • #{String(currentItem.order).padStart(2, '0')}</span>
              </div>

              {/* In-Card Tools: Font Size and Count Badge */}
              <div className="zen-card-controls">
                <div className="zen-font-toggles" title="Ukuran Font Arab">
                  <button
                    type="button"
                    disabled={fontSizeStep <= 0}
                    onClick={() => setFontSizeStep(prev => Math.max(0, prev - 1))}
                    aria-label="Perkecil huruf Arab"
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    disabled={fontSizeStep >= fontSizes.length - 1}
                    onClick={() => setFontSizeStep(prev => Math.min(fontSizes.length - 1, prev + 1))}
                    aria-label="Perbesar huruf Arab"
                  >
                    A+
                  </button>
                </div>

                {currentItem.count > 1 ? (
                  <span className={`zen-count-pill ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? '✓ ' : ''}{currentItem.count}x
                  </span>
                ) : (
                  <span className="zen-count-pill single">
                    1x
                  </span>
                )}
              </div>
            </div>

            {/* Arabic Text Display */}
            <div className="zen-arabic-box">
              <p
                className="zen-arabic-content"
                dir="rtl"
                lang="ar"
                style={{ fontSize: fontSizes[fontSizeStep] }}
              >
                {currentItem.arabic}
              </p>
            </div>

            {/* Subtle Aesthetic Divider */}
            <div className="zen-card-divider">
              <span className="zen-divider-line" />
              <span className="zen-divider-node">✦</span>
              <span className="zen-divider-line" />
            </div>

            {/* Latin Transliteration */}
            {currentItem.latin && (
              <div className="zen-latin-box">
                <p className="zen-latin-content">{currentItem.latin}</p>
              </div>
            )}

            {/* Translation */}
            {currentItem.translation && (
              <div className="zen-translation-box">
                <p className="zen-translation-content">“{currentItem.translation}”</p>
              </div>
            )}

            {/* Interactive Tasbih Counter (Kotak Ringkas, HANYA tampil jika bacaan > 1x) */}
            {currentItem.count > 1 && (
              <div className="zen-tasbih-container">
                <button
                  type="button"
                  className={`zen-tasbih-box ${isCompleted ? 'completed' : ''}`}
                  onClick={!isCompleted ? incrementCount : undefined}
                  title={isCompleted ? 'Target telah tercapai' : 'Sentuh untuk menghitung dzikir (+1)'}
                  aria-label={isCompleted ? 'Target bacaan telah tercapai' : 'Ketuk untuk menambah hitungan dzikir'}
                >
                  <div
                    className="zen-tasbih-progress-fill"
                    style={{ width: `${Math.min(100, Math.round((currentCount / currentItem.count) * 100))}%` }}
                  />
                  <div className="zen-tasbih-left">
                    <div className="zen-tasbih-icon-badge">
                      {isCompleted ? '✓' : <IconTasbihDigital size={18} color="currentColor" />}
                    </div>
                    <div className="zen-tasbih-text">
                      <span className="zen-tasbih-title">
                        {isCompleted ? 'Alhamdulillah Selesai' : 'Sentuh untuk Menghitung'}
                      </span>
                      <span className="zen-tasbih-sub">
                        {isCompleted ? 'Target bacaan telah tercapai' : 'Ketuk area ini untuk +1 hitungan'}
                      </span>
                    </div>
                  </div>
                  <div className="zen-tasbih-count-badge">
                    <span className="zen-tasbih-now">{currentCount}</span>
                    <span className="zen-tasbih-sep">/</span>
                    <span className="zen-tasbih-target">{currentItem.count}x</span>
                  </div>
                </button>
              </div>
            )}

            {/* Dalil & Fadhilah Box */}
            <div className="zen-source-box">
              {currentItem.fadhilah && (
                <div className="zen-source-entry fadhilah">
                  <span className="zen-source-tag fadhilah">Fadhilah & Keutamaan</span>
                  <p>{currentItem.fadhilah}</p>
                </div>
              )}
              <div className="zen-source-entry dalil">
                <span className="zen-source-tag dalil">Rujukan Hadits Shahih</span>
                <cite>{currentItem.dalil}</cite>
              </div>
            </div>
          </article>
        )}

        {/* Floating Bottom Nav Pill (Gambar 1 style: [ < ] [ • • • • ] [ > ]) */}
        <footer className="zen-floating-nav">
          <button
            type="button"
            className="zen-nav-btn prev"
            disabled={currentIndex === 0}
            onClick={prevItem}
            aria-label="Bacaan sebelumnya"
            title="Bacaan sebelumnya"
          >
            ‹
          </button>

          <div className="zen-nav-dots-wrapper">
            {module.items.map((item, idx) => {
              const itemDone = item.count > 1 ? (counts[item.id] ?? 0) >= item.count : idx < currentIndex;
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`zen-nav-dot ${isActive ? 'active' : ''} ${itemDone ? 'done' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  title={`${item.order}. ${item.title}`}
                  aria-label={`Bacaan ke-${idx + 1}`}
                />
              );
            })}
          </div>

          <button
            type="button"
            className={`zen-nav-btn next ${currentIndex === module.items.length - 1 ? 'finish' : ''}`}
            onClick={nextItem}
            aria-label={currentIndex === module.items.length - 1 ? 'Selesai membaca' : 'Bacaan berikutnya'}
            title={currentIndex === module.items.length - 1 ? 'Selesai membaca' : 'Bacaan berikutnya'}
          >
            {currentIndex === module.items.length - 1 ? '✓' : '›'}
          </button>
        </footer>

        {/* Table of Contents Overlay */}
        {showToc && (
          <div className="zen-toc-backdrop" onClick={() => setShowToc(false)}>
            <aside className="zen-toc-drawer" onClick={e => e.stopPropagation()}>
              <div className="zen-toc-head">
                <div>
                  <h3>Daftar Bacaan</h3>
                  <p>{module.title} — {module.items.length} Amalan Sunnah</p>
                </div>
                <button
                  type="button"
                  className="zen-toc-close-btn"
                  onClick={() => setShowToc(false)}
                  aria-label="Tutup daftar isi"
                >
                  ✕
                </button>
              </div>

              <div className="zen-toc-items">
                {module.items.map((item, idx) => {
                  const itemDone = item.count > 1 ? (counts[item.id] ?? 0) >= item.count : idx < currentIndex;
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`zen-toc-card ${isActive ? 'active' : ''} ${itemDone ? 'done' : ''}`}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setShowToc(false);
                      }}
                    >
                      <span className="zen-toc-num">#{String(item.order).padStart(2, '0')}</span>
                      <div className="zen-toc-info">
                        <span className="zen-toc-item-title">{item.title}</span>
                        <span className="zen-toc-item-ref">{item.dalil}</span>
                      </div>
                      <span className={`zen-toc-count-pill ${itemDone ? 'done' : ''}`}>
                        {itemDone ? '✓ ' : ''}{item.count}x
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
