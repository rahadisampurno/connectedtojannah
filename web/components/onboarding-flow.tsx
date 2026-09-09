'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../lib/api';
import { avatarOptions, AvatarKey } from '../lib/avatar-options';
import { UserAvatar } from './user-avatar';

type Catalog = { key: string; title: string; category: string; note: string }[];
const defaults = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya', 'quran', 'dzikir-pagi'];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState<Catalog>([]);
  const [avatar, setAvatar] = useState<AvatarKey | null>(null);
  const [selected, setSelected] = useState<string[]>(defaults);
  const [reminders, setReminders] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<Catalog>('/amalan/catalog')
      .then(setCatalog)
      .catch(e => setError(e.message));
  }, []);

  const toggle = (key: string) =>
    setSelected(items => (items.includes(key) ? items.filter(x => x !== key) : [...items, key]));

  const isAllSelected = catalog.length > 0 && catalog.every(item => selected.includes(item.key));

  const toggleAll = () => {
    if (isAllSelected) {
      setSelected([]);
    } else {
      setSelected(catalog.map(item => item.key));
    }
  };

  const resetToDefaults = () => {
    const validDefaults = defaults.filter(d => catalog.some(c => c.key === d));
    setSelected(validDefaults.length ? validDefaults : defaults);
  };

  const finish = async () => {
    if (!avatar) return setError('Pilih avatar terlebih dahulu.');
    try {
      await apiFetch('/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          avatar,
          amalanKeys: selected,
          remindersEnabled: reminders,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        }),
      });
      router.replace('/app');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Belum berhasil memulai.');
    }
  };

  return (
    <main className="onboarding-flow">
      <div className="onboarding-stars" />
      <section>
        <Image src="/images/ctj-logo.webp" width={1254} height={1254} alt="Connected to Jannah" />
        <small>LANGKAH {step + 1} DARI 5</small>
        {step === 0 && (
          <>
            <h1>Selamat datang di perjalananmu.</h1>
            <p>Connected to Jannah adalah teman untuk menjaga langkah, bukan pemeriksa ibadah.</p>
          </>
        )}
        {step === 1 && (
          <>
            <h1>Pilih avatar-mu.</h1>
            <p>Teman kecil yang akan menjadi foto profil dan menemani perjalananmu.</p>
            <div className="avatar-picker" role="radiogroup" aria-label="Pilih avatar profil">
              {avatarOptions.map(item => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={avatar === item.key}
                  key={item.key}
                  className={avatar === item.key ? 'active' : ''}
                  onClick={() => {
                    setAvatar(item.key);
                    setError('');
                  }}
                >
                  <UserAvatar avatar={item.key} name={item.name} />
                  <span>
                    <b>{item.name}</b>
                    <small>{item.trait}</small>
                  </span>
                  <i>{avatar === item.key ? '✓' : ''}</i>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1>Apa yang ingin kamu jaga?</h1>
            <p>Tidak perlu memilih semuanya. Mulailah dari yang ingin dan mampu kamu jaga.</p>

            <div className="onboarding-select-toolbar">
              <div className="onboarding-select-counter">
                <span className="counter-badge">{selected.length} / {catalog.length}</span>
                <span>amalan dipilih</span>
              </div>
              <div className="onboarding-select-actions">
                <button
                  type="button"
                  className={`select-all-btn ${isAllSelected ? 'all-active' : ''}`}
                  onClick={toggleAll}
                  title={isAllSelected ? 'Batalkan pilihan semua amalan' : 'Centang semua amalan sekaligus'}
                >
                  <span className="btn-check-icon">{isAllSelected ? '✓' : '☐'}</span>
                  <span>{isAllSelected ? 'Batalkan Semua' : 'Checklist Semua Amalan'}</span>
                </button>
                <button
                  type="button"
                  className="reset-defaults-btn"
                  onClick={resetToDefaults}
                  title="Kembalikan ke amalan rekomendasi dasar"
                >
                  Rekomendasi Awal
                </button>
              </div>
            </div>

            <div className="onboarding-choices">
              {catalog.map(item => (
                <button
                  type="button"
                  key={item.key}
                  className={selected.includes(item.key) ? 'active' : ''}
                  onClick={() => toggle(item.key)}
                >
                  <i>{selected.includes(item.key) ? '✓' : '○'}</i>
                  <span>
                    <b>{item.title}</b>
                    <small>{item.category}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <h1>Ingin pengingat lembut?</h1>
            <p>Kamu dapat mengatur quiet hours dan kategori notifikasi kapan saja.</p>
            <button
              type="button"
              className={`reminder-choice ${reminders ? 'active' : ''}`}
              onClick={() => setReminders(!reminders)}
            >
              <i>{reminders ? '✓' : '○'}</i>
              <span>
                <b>Pengingat di dalam aplikasi</b>
                <small>{reminders ? 'Aktif' : 'Tidak aktif'}</small>
              </span>
            </button>
          </>
        )}
        {step === 4 && (
          <>
            <h1>Perjalanan siap dimulai.</h1>
            <div className="onboarding-avatar-summary">
              {avatar && (
                <UserAvatar
                  avatar={avatar}
                  name={avatarOptions.find(item => item.key === avatar)?.name ?? 'pilihanmu'}
                />
              )}
              <p>
                Kamu memilih {selected.length} amalan awal. Avatar dan pilihan amalan dapat diubah kapan saja dari Profil.
              </p>
            </div>
            <blockquote>“Mulailah dari yang ringan. Perjalananmu tetap berarti.”</blockquote>
          </>
        )}
        {error && (
          <p className="flow-message" role="alert">
            {error}
          </p>
        )}
        <div className="onboarding-actions">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setError('');
                setStep(step - 1);
              }}
            >
              Kembali
            </button>
          )}
          <button
            type="button"
            disabled={(step === 1 && !avatar) || (step === 2 && !selected.length)}
            onClick={() => (step === 4 ? void finish() : (setError(''), setStep(step + 1)))}
          >
            {step === 4 ? 'Mulai perjalanan' : 'Lanjut'} →
          </button>
        </div>
      </section>
    </main>
  );
}
