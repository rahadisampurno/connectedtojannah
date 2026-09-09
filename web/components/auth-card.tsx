'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, authenticate, ApiError, SessionUser } from '../lib/api';

export function AuthCard({ mode }: { mode: 'login' | 'register' }) {
  const register = mode === 'register';
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  // Form input states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Error tracking per field
  const [fieldErrors, setFieldErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    termsAccepted?: string;
  }>({});
  const [generalError, setGeneralError] = useState('');

  // Password criteria checking for register mode
  const pwdCriteria = {
    length: password.length >= 8,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[^A-Za-z\d]/.test(password),
  };

  const isPasswordValid =
    pwdCriteria.length &&
    pwdCriteria.hasLetter &&
    pwdCriteria.hasNumber &&
    pwdCriteria.hasSymbol;

  useEffect(() => {
    apiFetch<SessionUser>('/me')
      .then((me) => {
        if (me && me.id) {
          if (!me.onboardingCompleted) {
            router.replace('/onboarding');
            return;
          }
          router.replace('/app');
        }
      })
      .catch(() => {
        /* not logged in, stay */
      });
  }, [router]);

  const clearFieldError = (field: 'displayName' | 'email' | 'password' | 'termsAccepted') => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (generalError) {
      setGeneralError('');
    }
  };

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (register) {
      const trimmedName = displayName.trim();
      if (!trimmedName) {
        errors.displayName = 'Nama panggilan wajib diisi.';
      } else if (trimmedName.length < 2) {
        errors.displayName = 'Nama panggilan minimal 2 karakter.';
      } else if (trimmedName.length > 40) {
        errors.displayName = 'Nama panggilan maksimal 40 karakter.';
      }

      if (!termsAccepted) {
        errors.termsAccepted = 'Kamu perlu menyetujui Ketentuan dan Kebijakan Privasi.';
      }
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = 'Alamat email wajib diisi.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = 'Format alamat email belum valid (contoh: nama@email.com).';
    }

    if (!password) {
      errors.password = 'Kata sandi wajib diisi.';
    } else if (register) {
      if (password.length < 8) {
        errors.password = 'Kata sandi minimal 8 karakter.';
      } else if (!isPasswordValid) {
        const missing: string[] = [];
        if (!pwdCriteria.hasLetter) missing.push('huruf');
        if (!pwdCriteria.hasNumber) missing.push('angka (0-9)');
        if (!pwdCriteria.hasSymbol) missing.push('simbol (!@#$%^&* dll)');
        errors.password = `Kata sandi belum lengkap: mohon tambahkan ${missing.join(' dan ')}.`;
      }
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      setGeneralError(firstError || 'Mohon lengkapi data yang belum sesuai.');
      return false;
    }

    return true;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setGeneralError('');
    setFieldErrors({});

    if (!validateForm()) {
      return;
    }

    setBusy(true);

    const body = register
      ? {
          displayName: displayName.trim(),
          email: email.trim().toLowerCase(),
          password,
          termsAccepted,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
        }
      : {
          email: email.trim().toLowerCase(),
          password,
        };

    try {
      const session = await authenticate(mode, body);
      if (!session.user.onboardingCompleted) {
        router.push('/onboarding');
        return;
      }
      const next = sessionStorage.getItem('ctj_after_login') ?? '/app';
      sessionStorage.removeItem('ctj_after_login');
      router.push(next);
    } catch (cause: any) {
      const errors: typeof fieldErrors = {};

      if (cause instanceof ApiError && cause.fields && cause.fields.length > 0) {
        cause.fields.forEach((f) => {
          if (f.field === 'email') errors.email = f.messages.join('. ');
          else if (f.field === 'displayName') errors.displayName = f.messages.join('. ');
          else if (f.field === 'password') errors.password = f.messages.join('. ');
          else if (f.field === 'termsAccepted') errors.termsAccepted = f.messages.join('. ');
        });
        setFieldErrors(errors);
        setGeneralError(cause.message || 'Periksa kembali data yang kamu masukkan.');
      } else {
        const msg = cause instanceof Error ? cause.message : 'Belum berhasil masuk.';
        const lower = msg.toLowerCase();
        if (lower.includes('email sudah terdaftar')) {
          errors.email = 'Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akunmu.';
          setFieldErrors(errors);
        } else if (lower.includes('kata sandi')) {
          errors.password = msg;
          setFieldErrors(errors);
        }
        setGeneralError(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page auth-v2">
      <div className="auth-stars" />
      <Link href="/" className="auth-back">
        ← Kembali ke beranda
      </Link>

      <section className="auth-story">
        <span>CONNECTED TO JANNAH</span>
        <h2>
          {register
            ? 'Perjalanan yang indah dimulai dari satu langkah.'
            : 'Selamat datang kembali di perjalananmu.'}
        </h2>
        <p>Jaga amalan dengan tenang, lihat tamanmu bertumbuh, dan saling menguatkan tanpa berlomba.</p>
        <Image src="/images/lea-nan-companions.webp" width={800} height={800} alt="Lea dan Nan" priority />
      </section>

      <section className="auth-card">
        <div className="auth-heading">
          <span>{register ? 'MULAI PERJALANAN' : 'ASSALAMU’ALAIKUM'}</span>
          <h1>{register ? 'Buat akunmu' : 'Masuk kembali'}</h1>
          {!register && (
            <p>Lanjutkan kebaikan kecil yang telah kamu jaga.</p>
          )}
        </div>

        <form onSubmit={submit} noValidate>
          {register && (
            <label>
              Nama panggilan
              <input
                type="text"
                required
                minLength={2}
                maxLength={40}
                name="displayName"
                autoComplete="name"
                placeholder="Nama yang ingin ditampilkan"
                value={displayName}
                className={fieldErrors.displayName ? 'input-has-error' : ''}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  clearFieldError('displayName');
                }}
              />
              {fieldErrors.displayName && (
                <span className="auth-field-error">
                  ⚠ {fieldErrors.displayName}
                </span>
              )}
            </label>
          )}

          <label>
            Alamat email
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="nama@email.com"
              value={email}
              className={fieldErrors.email ? 'input-has-error' : ''}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
            />
            {fieldErrors.email && (
              <span className="auth-field-error">
                ⚠ {fieldErrors.email}
              </span>
            )}
          </label>

          <label>
            Kata sandi
            <div className="password-field">
              <input
                required
                minLength={8}
                type={show ? 'text' : 'password'}
                name="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                placeholder="Minimal 8 karakter"
                value={password}
                className={fieldErrors.password ? 'input-has-error' : ''}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearFieldError('password');
                }}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {show ? '◉' : '○'}
              </button>
            </div>
            {fieldErrors.password && (
              <span className="auth-field-error">
                ⚠ {fieldErrors.password}
              </span>
            )}
          </label>

          {register && (
            <>
              {/* Real-time interactive password criteria checklist */}
              <div className="password-criteria-wrap">
                <span className="password-criteria-title">Syarat Keamanan Kata Sandi</span>
                <div className="password-criteria-grid">
                  <span className={`pwd-crit-item ${pwdCriteria.length ? 'is-valid' : 'is-invalid'}`}>
                    <span className="pwd-crit-icon">{pwdCriteria.length ? '✓' : '○'}</span>
                    Minimal 8 karakter
                  </span>
                  <span className={`pwd-crit-item ${pwdCriteria.hasLetter ? 'is-valid' : 'is-invalid'}`}>
                    <span className="pwd-crit-icon">{pwdCriteria.hasLetter ? '✓' : '○'}</span>
                    Huruf (A-Z / a-z)
                  </span>
                  <span className={`pwd-crit-item ${pwdCriteria.hasNumber ? 'is-valid' : 'is-invalid'}`}>
                    <span className="pwd-crit-icon">{pwdCriteria.hasNumber ? '✓' : '○'}</span>
                    Angka (0-9)
                  </span>
                  <span className={`pwd-crit-item ${pwdCriteria.hasSymbol ? 'is-valid' : 'is-invalid'}`}>
                    <span className="pwd-crit-icon">{pwdCriteria.hasSymbol ? '✓' : '○'}</span>
                    Simbol (!@#$%^&* dll)
                  </span>
                </div>
              </div>

              <label className="terms-check">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    clearFieldError('termsAccepted');
                  }}
                />
                <span>
                  Saya menyetujui <Link href="/#privacy">Ketentuan dan Kebijakan Privasi</Link>.
                </span>
              </label>
              {fieldErrors.termsAccepted && (
                <span className="auth-field-error">
                  ⚠ {fieldErrors.termsAccepted}
                </span>
              )}
            </>
          )}

          {!register && (
            <Link className="forgot-link" href="/forgot-password">
              Lupa kata sandi?
            </Link>
          )}

          {generalError && (
            <div className="auth-error-alert" role="alert">
              <span className="auth-error-alert-icon">⚠</span>
              <div className="auth-error-alert-body">
                <b>Periksa data formulir:</b>
                <p>{generalError}</p>
              </div>
            </div>
          )}

          <button className="auth-submit" disabled={busy}>
            {busy
              ? 'Menyiapkan perjalanan…'
              : register
              ? 'Daftar & Lanjut'
              : 'Masuk ke Aplikasi'}
            <span>→</span>
          </button>
        </form>

        <p className="auth-switch">
          {register ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
          <Link href={register ? '/login' : '/register'}>
            {register ? 'Masuk' : 'Daftar gratis'}
          </Link>
        </p>
      </section>
    </main>
  );
}
