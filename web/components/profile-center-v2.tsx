'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, logout, SessionUser } from '../lib/api';
import { avatarOptions } from '../lib/avatar-options';
import { calculatePrayerTimes, fetchLivePrayerTimes, getNextPrayer, NextPrayerInfo, PrayerTimes } from '../lib/prayer-times';
import { UserAvatar } from './user-avatar';
import { useConfirm } from './confirm-dialog';

type Overview = {
  circles: { id: string; name: string; type: string }[];
  challenges: { id: string; title: string; joined: boolean }[];
  privacy: { visibility: string };
  preferences: { remindersEnabled: boolean; reducedMotion: boolean; quietStart?: string; quietEnd?: string; categories: { reminders: boolean; circles: boolean; milestones: boolean } };
  location: { timezone: string; language: string; name?: string; latitude?: number; longitude?: number };
};
type Daily = { journey: { activeDays: number; consistencyDays: number }; summary: { completed: number; total: number } };
type Session = { id: string; deviceName: string; lastUsedAt: string; expiresAt: string };
type Section = 'profile'|'amalan'|'notification'|'privacy'|'location'|'accessibility'|'devices'|'data'|'help';

const menu: [Section, string, string][] = [
  ['profile', 'Akun', '👤'],
  ['amalan', 'Ibadah & Amalan', '📖'],
  ['notification', 'Notifikasi', '🔔'],
  ['privacy', 'Privacy & Sharing', '🛡️'],
  ['location', 'Lokasi & Waktu Shalat', '🕌'],
  ['accessibility', 'Accessibility', '👁️'],
  ['devices', 'Devices & Sessions', '📱'],
  ['data', 'Data & Account', '💾'],
  ['help', 'Help & Legal', 'ℹ️'],
];
const validSections: Section[] = ['profile', 'amalan', 'notification', 'privacy', 'location', 'accessibility', 'devices', 'data', 'help'];

function getInitialSection(): Section {
  if (typeof window === 'undefined') return 'profile';
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'profile' && parts[1] && validSections.includes(parts[1] as Section)) {
    return parts[1] as Section;
  }
  const stored = sessionStorage.getItem('ctj_profile_sub') as Section;
  if (stored && validSections.includes(stored)) return stored;
  return 'profile';
}

export function ProfileCenterV2({
  user,
  overview,
  daily,
  reload,
  openAmalan,
}: {
  user: SessionUser;
  overview: Overview;
  daily: Daily;
  reload: () => Promise<void>;
  openAmalan: () => void;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [section, setSectionState] = useState<Section>(getInitialSection);
  const [message, setMessage] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [avatar, setAvatar] = useState(user.avatar);
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<string>('default');

  useEffect(() => {
    setAvatar(user.avatar);
  }, [user.avatar]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserNotificationStatus(Notification.permission);
    }
  }, []);

  const setSection = (s: Section) => {
    setSectionState(s);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ctj_profile_sub', s);
      const targetHash = `#profile/${s}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    }
  };

  useEffect(() => {
    const syncHash = () => {
      const parts = window.location.hash.replace(/^#\/?/, '').split('/');
      if (parts[0] === 'profile' && parts[1] && validSections.includes(parts[1] as Section)) {
        setSectionState(parts[1] as Section);
        sessionStorage.setItem('ctj_profile_sub', parts[1]);
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const notify = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3500);
  };

  const handleSubnavClick = (s: Section) => {
    setSection(s);
  };

  useEffect(() => {
    if (section === 'devices') {
      setSessionsLoading(true);
      apiFetch<Session[]>('/account/sessions')
        .then(data => setSessions(data))
        .catch(() => notify('Gagal memuat daftar sesi perangkat.'))
        .finally(() => setSessionsLoading(false));
    }
  }, [section]);

  const preferencePayload = (
    changes: Partial<{
      remindersEnabled: boolean;
      reducedMotion: boolean;
      quietStart: string;
      quietEnd: string;
      reminderNotifications: boolean;
      circleNotifications: boolean;
      milestoneNotifications: boolean;
    }>
  ) => ({
    remindersEnabled: overview.preferences.remindersEnabled,
    reducedMotion: overview.preferences.reducedMotion,
    quietStart: overview.preferences.quietStart || '',
    quietEnd: overview.preferences.quietEnd || '',
    reminderNotifications: overview.preferences.categories?.reminders ?? true,
    circleNotifications: overview.preferences.categories?.circles ?? true,
    milestoneNotifications: overview.preferences.categories?.milestones ?? true,
    ...changes,
  });

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Keluar dari Akun?',
      message: 'Yakin ingin keluar dari akun Connected to Jannah? Kamu bisa masuk kembali kapan saja untuk melanjutkan perjalanan ibadahmu.',
      confirmText: 'Ya, Keluar Akun',
      cancelText: 'Tetap di Sini',
      variant: 'danger',
      mascotSpeech: 'Semoga setiap ikhtiar kebaikanmu senantiasa diberkahi. Sampai berjumpa lagi!',
    });
    if (!confirmed) return;
    try {
      await logout();
      router.replace('/login');
    } catch {
      notify('Gagal keluar sesi. Silakan coba lagi.');
    }
  };

  const saveAccount = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const form = e.currentTarget;
      const data = Object.fromEntries(new FormData(form));
      await apiFetch('/account', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      notify('Profil berhasil diperbarui.');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gagal memperbarui profil.');
    }
  };

  const saveNotifications = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = new FormData(e.currentTarget);
      await apiFetch('/preferences', {
        method: 'PATCH',
        body: JSON.stringify(
          preferencePayload({
            remindersEnabled: data.get('remindersEnabled') === 'on',
            quietStart: String(data.get('quietStart') || ''),
            quietEnd: String(data.get('quietEnd') || ''),
            reminderNotifications: data.get('reminderNotifications') === 'on',
            circleNotifications: data.get('circleNotifications') === 'on',
            milestoneNotifications: data.get('milestoneNotifications') === 'on',
          })
        ),
      });
      notify('Pengaturan notifikasi berhasil disimpan.');
      await reload();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Gagal menyimpan notifikasi.');
    }
  };

  const useLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      notify('Browser atau perangkat ini tidak mendukung deteksi lokasi.');
      return;
    }
    notify('Mendeteksi lokasi perangkat…');
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          await apiFetch('/account', {
            method: 'PATCH',
            body: JSON.stringify({
              displayName: user.displayName,
              timezone: overview.location.timezone || user.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta',
              language: overview.location.language || user.language || 'id',
              locationName: 'Lokasi perangkat',
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }),
          });
          notify('Lokasi dan jadwal shalat presisi berhasil disimpan.');
          await reload();
        } catch (error) {
          notify(error instanceof Error ? error.message : 'Gagal menyimpan koordinat lokasi.');
        }
      },
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          notify('Izin lokasi tidak diberikan. Aktifkan izin lokasi di browser.');
        } else {
          notify('Gagal membaca koordinat perangkat.');
        }
      },
      { timeout: 12000, maximumAge: 60000 }
    );
  };

  const download = async () => {
    try {
      notify('Menyiapkan file ekspor data…');
      const data = await apiFetch('/account/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `connected-to-jannah-${user.displayName.toLowerCase().replace(/\s+/g, '-')}-data.json`;
      link.click();
      URL.revokeObjectURL(url);
      notify('Data akun berhasil diunduh.');
    } catch {
      notify('Gagal mengunduh data.');
    }
  };

  const requestBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      notify('Browser ini tidak mendukung notifikasi push web.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotificationStatus(permission);
      if (permission === 'granted') {
        notify('✓ Izin notifikasi browser aktif.');
      } else if (permission === 'denied') {
        notify('Izin notifikasi diblokir di setelan browser.');
      } else {
        notify('Izin notifikasi belum diberikan.');
      }
    } catch {
      notify('Gagal meminta izin notifikasi browser.');
    }
  };

  return (
    <div className="app-screen profile-screen">
      <header className="app-head">
        <div>
          <span>RUANG PRIBADIMU</span>
          <h1>Profil & Pengaturan</h1>
          <p>Kelola akun, privasi, perangkat, dan kenyamanan perjalanan ibadahmu.</p>
        </div>
      </header>

      <div className="settings-layout">
        <nav className="settings-menu" aria-label="Menu Pengaturan">
          {menu.map(([id, label, icon]) => (
            <button
              className={section === id ? 'active' : ''}
              key={id}
              onClick={() => setSection(id)}
              type="button"
            >
              <span className="menu-btn-content">
                <i className="menu-item-icon">{icon}</i>
                <span className="menu-item-label">{label}</span>
              </span>
              <span className="menu-chevron" aria-hidden="true">›</span>
            </button>
          ))}
          <hr className="settings-divider" />
          <button type="button" className="settings-menu-logout" onClick={handleLogout}>
            <i>⎋</i>
            <span>Keluar dari Akun</span>
          </button>
        </nav>

        <section className="settings-pane" role="region" aria-live="polite">
          {/* SECTION 1: AKUN */}
          {section === 'profile' && (
            <div className="settings-section-block">
              <div className="profile-identity">
                <UserAvatar avatar={avatar} name={user.displayName} className="profile-user-avatar" />
                <div>
                  <span className="settings-kicker">IDENTITAS PERJALANAN</span>
                  <h2>Akun</h2>
                  <p>Avatar dan nama ini tampil sebagai profilmu di seluruh amalan dan Circle.</p>
                </div>
              </div>

              <form onSubmit={saveAccount} className="settings-form">
                <fieldset className="profile-avatar-field">
                  <legend>Pilih avatar</legend>
                  <div className="profile-avatar-picker">
                    {avatarOptions.map(item => (
                      <button
                        type="button"
                        key={item.key}
                        title={`${item.name} — ${item.trait}`}
                        className={avatar === item.key ? 'active' : ''}
                        onClick={() => setAvatar(item.key)}
                      >
                        <UserAvatar avatar={item.key} name={item.name} />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="avatar" value={avatar} />
                </fieldset>

                <div className="form-fields-grid">
                  <label>
                    Nama panggilan
                    <input name="displayName" defaultValue={user.displayName} required minLength={2} maxLength={40} />
                  </label>

                  <label>
                    Email
                    <input value={user.email} disabled />
                  </label>
                </div>

                <div className="email-status-pill">
                  <span className="check-icon">✓</span> Email akun terverifikasi
                </div>

                <div className="form-fields-grid">
                  <label>
                    Bahasa aplikasi
                    <select name="language" defaultValue={overview.location.language || user.language || 'id'}>
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </label>

                  <label>
                    Zona waktu
                    <input name="timezone" defaultValue={overview.location.timezone || user.timezone || 'Asia/Jakarta'} required />
                  </label>
                </div>

                <button type="submit" className="save-settings-btn">Simpan Perubahan Profil</button>
              </form>

              <div className="profile-metrics-card">
                <span className="metrics-card-title">STATISTIK PERJALANANMU</span>
                <div className="profile-metrics">
                  <b>{daily.journey.activeDays}<small>Hari perjalanan</small></b>
                  <b>{daily.journey.consistencyDays}<small>Streak saat ini</small></b>
                  <b>{overview.circles.length}<small>Circle diikuti</small></b>
                </div>
              </div>

              <PasswordForm notify={notify} />
            </div>
          )}

          {/* SECTION 2: IBADAH & AMALAN */}
          {section === 'amalan' && (
            <div className="settings-section-block">
              <span className="settings-kicker">KENDALI AMALAN</span>
              <h2>Ibadah & Amalan</h2>
              <p>Kelola rutinitas harian, program 30 hari, penyesuaian target, penambahan amalan kustom, dan histori konsistensi.</p>

              <div className="amalan-quick-overview-box">
                <div className="overview-mini-stat">
                  <span>Hari Ini</span>
                  <b>{daily.summary.completed} / {daily.summary.total} Selesai</b>
                </div>
                <div className="overview-mini-stat">
                  <span>Tantangan 30 Hari</span>
                  <b>{overview.challenges?.filter(c => c.joined).length ?? 0} Fokus Aktif</b>
                </div>
              </div>

              <div className="settings-amalan-subtabs-grid">
                <button type="button" className="settings-subtab-card" onClick={() => { if (typeof window !== 'undefined') window.location.hash = '#amalan/today'; openAmalan(); }}>
                  <span className="subtab-icon">☀️</span>
                  <div>
                    <b>Daftar Hari Ini</b>
                    <small>Catat checklist amalan wajib & sunnah harianmu.</small>
                  </div>
                  <i className="subtab-arrow">→</i>
                </button>

                <button type="button" className="settings-subtab-card" onClick={() => { if (typeof window !== 'undefined') window.location.hash = '#amalan/challenges'; openAmalan(); }}>
                  <span className="subtab-icon">🎯</span>
                  <div>
                    <b>Tantangan 30 Hari</b>
                    <small>Fokus pembiasaan Dhuha, Istighfar, Qur&apos;an tanpa reset streak.</small>
                  </div>
                  <i className="subtab-arrow">→</i>
                </button>

                <button type="button" className="settings-subtab-card" onClick={() => { if (typeof window !== 'undefined') window.location.hash = '#amalan/mine'; openAmalan(); }}>
                  <span className="subtab-icon">⚙️</span>
                  <div>
                    <b>Amalan Saya</b>
                    <small>Ubah target hitungan dan istirahatkan amalan dari rutinitas.</small>
                  </div>
                  <i className="subtab-arrow">→</i>
                </button>

                <button type="button" className="settings-subtab-card" onClick={() => { if (typeof window !== 'undefined') window.location.hash = '#amalan/explore'; openAmalan(); }}>
                  <span className="subtab-icon">✨</span>
                  <div>
                    <b>Jelajahi & Tambah Pribadi</b>
                    <small>Pilih dari katalog sunnah atau buat catatan amalanmu sendiri.</small>
                  </div>
                  <i className="subtab-arrow">→</i>
                </button>

                <button type="button" className="settings-subtab-card" onClick={() => { if (typeof window !== 'undefined') window.location.hash = '#amalan/history'; openAmalan(); }}>
                  <span className="subtab-icon">📊</span>
                  <div>
                    <b>Riwayat 30 Hari</b>
                    <small>Laporan evaluasi diri dan grafik istiqamah bulanan.</small>
                  </div>
                  <i className="subtab-arrow">→</i>
                </button>
              </div>

              <div className="open-amalan-cta-wrap">
                <button type="button" className="save-settings-btn" onClick={openAmalan}>
                  Buka Menu Amalan Lengkap →
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: NOTIFIKASI */}
          {section === 'notification' && (
            <div className="settings-section-block">
              <span className="settings-kicker">PREFERENSI PENGINGAT</span>
              <h2>Notifikasi</h2>
              <p>Atur pengingat lembut agar hari-harimu selalu ditemani niat kebaikan tanpa merasa terbebani.</p>

              <form onSubmit={saveNotifications} className="settings-form">
                <div className="notification-toggles-card">
                  <Check
                    name="remindersEnabled"
                    label="Pengingat Lembut Utama"
                    desc="Aktifkan pesan penyemangat dan pengingat lembut di dalam aplikasi."
                    initial={overview.preferences.remindersEnabled}
                  />
                  <Check
                    name="reminderNotifications"
                    label="Pengingat Waktu Amalan"
                    desc="Notifikasi amalan harian (pagi, siang, sore, malam)."
                    initial={overview.preferences.categories?.reminders ?? true}
                  />
                  <Check
                    name="circleNotifications"
                    label="Aktivitas Circle & Kebersamaan"
                    desc="Notifikasi saat anggota circle berbagi pesan semangat atau amalan baru."
                    initial={overview.preferences.categories?.circles ?? true}
                  />
                  <Check
                    name="milestoneNotifications"
                    label="Pencapaian & Milestone Journey"
                    desc="Pemberitahuan saat taman berkembang dan tantangan 30 hari terselesaikan."
                    initial={overview.preferences.categories?.milestones ?? true}
                  />
                </div>

                <div className="quiet-hours-card">
                  <header>
                    <b>Jam Hening (Quiet Hours)</b>
                    <small>Notifikasi akan disenyapkan selama jam istirahat agar tidur dan ibadah malammu tidak terganggu.</small>
                  </header>
                  <div className="quiet-grid">
                    <label>
                      Mulai senyap
                      <input type="time" name="quietStart" defaultValue={overview.preferences.quietStart?.slice(0, 5) ?? '22:00'} />
                    </label>
                    <label>
                      Selesai senyap
                      <input type="time" name="quietEnd" defaultValue={overview.preferences.quietEnd?.slice(0, 5) ?? '04:00'} />
                    </label>
                  </div>
                </div>

                <button type="submit" className="save-settings-btn">Simpan Preferensi Notifikasi</button>
              </form>

              <div className="browser-push-card">
                <div>
                  <b>Izin Notifikasi Web Browser</b>
                  <p>Izinkan browser menampilkan pemberitahuan bahkan saat tab sedang tidak aktif.</p>
                  <div className="push-status-badge">
                    Status saat ini: {browserNotificationStatus === 'granted' ? (
                      <span className="granted">✓ Aktif (Diizinkan)</span>
                    ) : browserNotificationStatus === 'denied' ? (
                      <span className="denied">✕ Diblokir di setelan browser</span>
                    ) : (
                      <span className="pending">○ Belum diminta</span>
                    )}
                  </div>
                </div>
                {browserNotificationStatus !== 'granted' && (
                  <button type="button" className="secondary-setting" onClick={requestBrowserPush}>
                    Aktifkan Izin Notifikasi Browser
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SECTION 4: PRIVACY & SHARING */}
          {section === 'privacy' && <Privacy overview={overview} notify={notify} />}

          {/* SECTION 5: LOKASI & WAKTU SHALAT */}
          {section === 'location' && (
            <div className="settings-section-block">
              <span className="settings-kicker">PRESISI IBADAH</span>
              <h2>Lokasi & Waktu Shalat</h2>
              <p>Lokasi digunakan untuk menentukan koordinat lintang-bujur dan menghitung jadwal shalat harian secara presisi berdasarkan standar Kementerian Agama RI (Kemenag).</p>
              <PrayerTimesDetail location={overview.location} timezone={overview.location.timezone || user.timezone} useLocation={useLocation} />
            </div>
          )}

          {/* SECTION 6: ACCESSIBILITY */}
          {section === 'accessibility' && (
            <div className="settings-section-block">
              <span className="settings-kicker">KENYAMANAN VISUAL</span>
              <h2>Accessibility</h2>
              <p>Sesuaikan antarmuka aplikasi agar nyaman di mata dan ramah penggunaan daya perangkat.</p>

              <div className="accessibility-card">
                <div className="accessibility-item">
                  <div>
                    <b>Kurangi Animasi (Reduce Motion)</b>
                    <p>Menonaktifkan pergerakan mengambang, efek partikel, dan transisi cepat untuk kenyamanan penglihatan dan menghemat baterai.</p>
                  </div>
                  <button
                    type="button"
                    className={`modern-toggle-btn ${overview.preferences.reducedMotion ? 'active' : ''}`}
                    onClick={async () => {
                      try {
                        const next = !overview.preferences.reducedMotion;
                        await apiFetch('/preferences', {
                          method: 'PATCH',
                          body: JSON.stringify(preferencePayload({ reducedMotion: next })),
                        });
                        notify(next ? 'Mode kurangi animasi diaktifkan.' : 'Animasi visual normal diaktifkan.');
                        await reload();
                      } catch {
                        notify('Gagal memperbarui preferensi animasi.');
                      }
                    }}
                    aria-pressed={overview.preferences.reducedMotion}
                  >
                    <span className="toggle-slider" />
                    <span className="toggle-text">{overview.preferences.reducedMotion ? 'Aktif' : 'Non-aktif'}</span>
                  </button>
                </div>

                <div className="accessibility-info-note">
                  <span className="info-icon">ℹ</span>
                  <p>Antarmuka Connected to Jannah dirancang dengan kontras warna <strong>Deep Midnight Navy & Celestial Gold</strong> yang memenuhi standar aksesibilitas WCAG AA untuk kenyamanan membaca dalam ruangan redup.</p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: DEVICES & SESSIONS */}
          {section === 'devices' && (
            <div className="settings-section-block">
              <span className="settings-kicker">KEAMANAN AKUN</span>
              <h2>Devices & Sessions</h2>
              <p>Daftar perangkat yang saat ini memiliki sesi aktif ke akunmu. Cabut sesi yang tidak kamu kenali demi keamanan.</p>

              {sessionsLoading ? (
                <div className="loading-sessions-panel">Memuat sesi aktif…</div>
              ) : sessions.length === 0 ? (
                <div className="empty-sessions-panel">
                  <span className="empty-icon">🛡️</span>
                  <b>Hanya satu sesi aktif</b>
                  <p>Hanya perangkat ini yang saat ini terhubung ke akun Connected to Jannah milikmu.</p>
                </div>
              ) : (
                <div className="session-list">
                  {sessions.map((item, index) => {
                    const sessionKey = item.id || `session-${index}-${item.lastUsedAt || index}`;
                    return (
                      <article key={sessionKey} className="session-item-card">
                        <div className="session-icon">📱</div>
                        <div className="session-info">
                          <b>{item.deviceName || 'Perangkat Browser'}</b>
                          <small>
                            Terakhir aktif: {new Date(item.lastUsedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                          </small>
                        </div>
                        <button
                          type="button"
                          className="revoke-session-btn"
                          onClick={async () => {
                            const sessionId = item.id || sessionKey;
                            const confirmed = await confirm({
                              title: 'Cabut Sesi Perangkat?',
                              message: `Cabut akses untuk "${item.deviceName || 'Perangkat ini'}"? Perangkat tersebut akan langsung keluar dari akun Connected to Jannah demi keamanan.`,
                              confirmText: 'Cabut Sesi',
                              cancelText: 'Batal',
                              variant: 'danger',
                              mascotSpeech: 'Sesi perangkat ini akan segera dihentikan dari sistem.',
                            });
                            if (!confirmed) return;
                            try {
                              await apiFetch(`/account/sessions/${sessionId}/revoke`, { method: 'POST' });
                              setSessions(current => current.filter(s => (s.id || sessionKey) !== sessionId));
                              notify('Sesi perangkat berhasil dicabut.');
                            } catch {
                              notify('Gagal mencabut sesi perangkat.');
                            }
                          }}
                        >
                          Cabut Sesi
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 8: DATA & ACCOUNT */}
          {section === 'data' && (
            <div className="settings-section-block">
              <span className="settings-kicker">KEDAULATAN DATA</span>
              <h2>Data & Account</h2>
              <p>Kamu memiliki kendali penuh atas data ibadah dan akunmu. Unduh salinan data kapan saja atau hapus akun jika diperlukan.</p>

              <div className="data-export-card">
                <div>
                  <b>Cadangkan & Ekspor Data Pribadi</b>
                  <p>Unduh seluruh data amalan, riwayat konsistensi, keanggotaan Circle, dan preferensi akun dalam file JSON terenkripsi.</p>
                </div>
                <button type="button" className="save-settings-btn export-btn" onClick={download}>
                  📥 Unduh Salinan Data Saya (.json)
                </button>
              </div>

              <DeleteAccount router={router} notify={notify} />
            </div>
          )}

          {/* SECTION 9: HELP & LEGAL */}
          {section === 'help' && (
            <div className="settings-section-block">
              <span className="settings-kicker">INFORMASI RESMI</span>
              <h2>Help & Legal</h2>
              <p>Prinsip transparansi, keamanan data, dan batas tanggung jawab aplikasi Connected to Jannah.</p>

              <div className="app-version-badge">
                <b>Connected to Jannah Web</b>
                <span>Versi 1.0.0 (Release Candidate)</span>
              </div>

              <div className="help-accordions-group">
                <details className="help-accordion" open>
                  <summary>
                    <span>Tentang Aplikasi & Pendamping Ibadah</span>
                    <i className="acc-chevron">›</i>
                  </summary>
                  <div className="acc-body">
                    <p>Connected to Jannah adalah aplikasi pendamping kebiasaan spiritual dan sarana kebersamaan ibadah (Circle). Aplikasi ini <strong>bukan penilai pahala, bukan penilai keimanan</strong>, dan bukan pengganti bimbingan guru agama atau ulama.</p>
                  </div>
                </details>

                <details className="help-accordion">
                  <summary>
                    <span>Kebijakan Privasi & Perlindungan Data</span>
                    <i className="acc-chevron">›</i>
                  </summary>
                  <div className="acc-body">
                    <p>Seluruh catatan amalan pribadimu bersifat rahasia secara default. Data hanya dibagikan ke Circle sesuai tingkat izin yang kamu pilih pada menu <em>Privacy & Sharing</em>. Kami tidak pernah menjual data pribadi kepada pihak ketiga mana pun.</p>
                  </div>
                </details>

                <details className="help-accordion">
                  <summary>
                    <span>Ketentuan Penggunaan & Adab Circle</span>
                    <i className="acc-chevron">›</i>
                  </summary>
                  <div className="acc-body">
                    <p>Gunakan aplikasi ini dengan niat tulus dan adab yang baik. Saling menjaga rasa aman anggota Circle, tidak menyebarkan kebencian, dan selalu memverifikasi rujukan fikih khusus kepada ahli ilmu terpercaya.</p>
                  </div>
                </details>

                <details className="help-accordion">
                  <summary>
                    <span>Metode Perhitungan Waktu Shalat</span>
                    <i className="acc-chevron">›</i>
                  </summary>
                  <div className="acc-body">
                    <p>Jadwal shalat dihitung menggunakan standar resmi Kementerian Agama Republik Indonesia (Kemenag RI) dengan parameter sudut fajar Subuh 20°, sudut Isya 18°, bayangan Ashar standar Syafi&apos;i (1:1), serta ihtiyat pengaman 2 menit.</p>
                  </div>
                </details>
              </div>

              <div className="support-contact-card">
                <div>
                  <b>Butuh bantuan atau ingin memberi masukan?</b>
                  <p>Tim pengembang siap mendengarkan saran dan membantu kendala akunmu.</p>
                </div>
                <a href="mailto:support@connectedtojannah.id" className="support-email-btn">
                  ✉️ Hubungi Bantuan (Email)
                </a>
              </div>
            </div>
          )}

          {/* Floating Toast Message */}
          {message && (
            <div className="settings-toast-banner" role="status" aria-live="assertive">
              <span>{message}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Check({
  name,
  label,
  desc,
  initial,
}: {
  name: string;
  label: string;
  desc?: string;
  initial: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  return (
    <label className={`modern-check-row ${checked ? 'is-checked' : ''}`}>
      <div className="check-text-wrap">
        <b>{label}</b>
        {desc && <small>{desc}</small>}
      </div>
      <div className="toggle-switch-ui">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
        />
        <span className="slider" />
      </div>
    </label>
  );
}

function PasswordForm({ notify }: { notify: (message: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const currentPassword = String(data.currentPassword || '');
    const newPassword = String(data.newPassword || '');
    const confirmPassword = String(data.confirmPassword || '');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Kata sandi baru minimal 8 karakter.');
      return;
    }

    const hasLetter = /[A-Za-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z\d]/.test(newPassword);

    if (!hasLetter || !hasNumber || !hasSymbol) {
      setErrorMessage('Kata sandi baru wajib memuat kombinasi huruf, angka, dan simbol (misal: @, #, !, dll).');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiFetch('/account/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      form.reset();
      notify('Kata sandi berhasil diperbarui. Sesi perangkat lain otomatis dicabut.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Gagal memperbarui kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="password-change-card" onSubmit={handleSubmit}>
      <header>
        <b>Ubah Kata Sandi</b>
        <p>Minimal 8 karakter, wajib kombinasi huruf, angka, dan simbol.</p>
      </header>

      {errorMessage && (
        <div className="password-error-alert" role="alert">
          <span>⚠</span> {errorMessage}
        </div>
      )}

      <div className="form-fields-grid">
        <label>
          Kata sandi saat ini
          <input type="password" name="currentPassword" required autoComplete="current-password" />
        </label>
      </div>

      <div className="form-fields-grid">
        <label>
          Kata sandi baru
          <input
            type="password"
            name="newPassword"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
          />
        </label>

        <label>
          Konfirmasi kata sandi baru
          <input
            type="password"
            name="confirmPassword"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="Ulangi kata sandi baru"
          />
        </label>
      </div>

      <button type="submit" className="save-settings-btn" disabled={isSubmitting}>
        {isSubmitting ? 'Memperbarui…' : 'Perbarui Kata Sandi'}
      </button>
    </form>
  );
}

function Privacy({ overview, notify }: { overview: Overview; notify: (message: string) => void }) {
  const [value, setValue] = useState(overview.privacy.visibility);
  const [isUpdating, setIsUpdating] = useState(false);

  const options: [string, string, string, string][] = [
    [
      'PRIVATE',
      'Hanya Saya (Pribadi)',
      'Seluruh amalan dan progres 100% rahasia. Circle hanya melihat namamu tanpa progres apa pun.',
      '🔒',
    ],
    [
      'COMPLETION_ONLY',
      'Status Selesai Saja',
      'Anggota Circle hanya melihat tanda selesai tanpa detail angka, target, atau durasi.',
      '✓',
    ],
    [
      'PERCENTAGE',
      'Ringkasan Persentase',
      'Anggota Circle melihat ringkasan persentase keseluruhan (contoh: 80% hari ini).',
      '📊',
    ],
    [
      'DETAIL',
      'Detail Terbuka',
      'Anggota Circle dapat melihat nama dan progres amalan yang kamu jalankan.',
      '👁️',
    ],
  ];

  const handleSelect = async (id: string) => {
    const prev = value;
    setValue(id);
    setIsUpdating(true);
    try {
      await apiFetch('/privacy', {
        method: 'PATCH',
        body: JSON.stringify({ visibility: id }),
      });
      notify('Tingkat privasi Circle berhasil diperbarui.');
    } catch {
      setValue(prev);
      notify('Gagal memperbarui privasi. Silakan coba lagi.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="settings-section-block">
      <span className="settings-kicker">KEAMANAN & ADAB</span>
      <h2>Privacy & Sharing</h2>
      <p>Tentukan batas maksimum informasi ibadahmu yang terlihat oleh anggota Circle. Detail amalan tetap pribadi secara default.</p>

      <div className="privacy-options-cards-grid">
        {options.map(([id, title, desc, icon]) => {
          const isSelected = value === id;
          return (
            <button
              type="button"
              className={`privacy-option-card ${isSelected ? 'active' : ''}`}
              key={id}
              onClick={() => handleSelect(id)}
              disabled={isUpdating}
            >
              <div className="card-top-row">
                <span className="privacy-icon">{icon}</span>
                <span className="radio-indicator">{isSelected ? '●' : '○'}</span>
              </div>
              <b>{title}</b>
              <small>{desc}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DeleteAccount({
  router,
  notify,
}: {
  router: ReturnType<typeof useRouter>;
  notify: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDelete = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    const password = String(new FormData(e.currentTarget).get('password') || '');

    if (!password) {
      setErrorMessage('Masukkan kata sandi untuk konfirmasi.');
      return;
    }

    try {
      setIsDeleting(true);
      await apiFetch('/account/delete', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      await logout();
      router.replace('/');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kata sandi tidak sesuai.');
      notify('Gagal menghapus akun. Periksa kembali kata sandi.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="danger-zone-card">
      <header>
        <b>Zona Berbahaya: Hapus Akun</b>
        <p>Tindakan ini menghapus akun dan seluruh catatan ibadahmu secara permanen dari server.</p>
      </header>

      {!open ? (
        <button type="button" className="danger-setting-btn" onClick={() => setOpen(true)}>
          🗑 Hapus Akun Saya Permanen…
        </button>
      ) : (
        <form className="delete-confirmation-box" onSubmit={handleDelete}>
          <div className="danger-warning-pill">
            <span>⚠ PERINGATAN:</span> Seluruh riwayat amalan, progres Journey, keanggotaan Circle, dan data profil akan dihapus selamanya dan tidak dapat dipulihkan.
          </div>

          {errorMessage && (
            <div className="delete-error-message" role="alert">
              {errorMessage}
            </div>
          )}

          <label>
            Masukkan kata sandi untuk konfirmasi
            <input
              type="password"
              name="password"
              placeholder="Kata sandi akunmu"
              required
              autoComplete="current-password"
            />
          </label>

          <div className="delete-actions-row">
            <button
              type="button"
              className="cancel-delete-btn"
              onClick={() => {
                setOpen(false);
                setErrorMessage('');
              }}
              disabled={isDeleting}
            >
              Batal
            </button>
            <button type="submit" className="confirm-delete-btn" disabled={isDeleting}>
              {isDeleting ? 'Menghapus Akun…' : 'Ya, Hapus Akun Permanen'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function PrayerTimesDetail({
  location,
  timezone,
  useLocation,
}: {
  location: Overview['location'];
  timezone: string;
  useLocation: () => void;
}) {
  const lat = location.latitude ?? -6.2088;
  const lon = location.longitude ?? 106.8456;
  const hasLocation = location.latitude != null && location.longitude != null;

  const [times, setTimes] = useState<PrayerTimes>(() => calculatePrayerTimes(lat, lon));
  const [nextPrayer, setNextPrayer] = useState<NextPrayerInfo>(() => getNextPrayer(calculatePrayerTimes(lat, lon)));

  useEffect(() => {
    const initial = calculatePrayerTimes(lat, lon);
    setTimes(initial);
    setNextPrayer(getNextPrayer(initial));

    const controller = new AbortController();
    fetchLivePrayerTimes(lat, lon, controller.signal).then(live => {
      setTimes(live);
      setNextPrayer(getNextPrayer(live));
    });

    return () => controller.abort();
  }, [lat, lon]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNextPrayer(getNextPrayer(times));
    }, 30000);
    return () => clearInterval(interval);
  }, [times]);

  const prayerItems: { key: keyof PrayerTimes; label: string; icon: string; sub: string }[] = [
    { key: 'imsak', label: 'Imsak', icon: '⏳', sub: 'Mulai Menahan' },
    { key: 'subuh', label: 'Subuh', icon: '☀', sub: 'Fajar Shidiq' },
    { key: 'terbit', label: 'Syuruq', icon: '🌅', sub: 'Terbit Matahari' },
    { key: 'dzuhur', label: 'Dzuhur', icon: '☼', sub: 'Tergelincir' },
    { key: 'ashar', label: 'Ashar', icon: '🌤', sub: 'Bayangan 1:1' },
    { key: 'maghrib', label: 'Maghrib', icon: '🌇', sub: 'Terbenam' },
    { key: 'isya', label: 'Isya', icon: '☾', sub: 'Syafaq Merah' },
  ];

  const formatCountdown = (mins: number) => {
    if (mins <= 0) return 'sekarang';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h} jam ${m} mnt lagi`;
    return `${m} mnt lagi`;
  };

  return (
    <div className="prayer-times-detail-wrap">
      <div className="location-action-bar">
        <button type="button" className="get-location-btn" onClick={useLocation}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
          </svg>
          {hasLocation ? 'Perbarui Lokasi Perangkat' : 'Gunakan Lokasi Perangkat'}
        </button>
        {hasLocation ? (
          <div className="location-info-pill">
            <span className="location-dot">●</span>
            <b>{location.name ?? 'Lokasi Perangkat'}</b>
            <small>({Number(location.latitude).toFixed(3)}, {Number(location.longitude).toFixed(3)} · {timezone || 'Asia/Jakarta'})</small>
          </div>
        ) : (
          <div className="location-info-pill warning">
            <span>⚠</span> Menampilkan estimasi zona Jakarta / WIB (Klik tombol untuk menyesuaikan lokasi)
          </div>
        )}
      </div>

      <div className="prayer-schedule-card">
        <header className="prayer-schedule-header">
          <div>
            <span className="prayer-card-kicker">WAKTU SHALAT HARI INI</span>
            <h3>Jadwal Shalat Presisi</h3>
            <p>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Koordinat {Number(lat).toFixed(3)}, {Number(lon).toFixed(3)}</p>
          </div>
          {nextPrayer && (
            <div className="next-prayer-badge">
              <span className="next-tag">BERIKUTNYA</span>
              <b>{nextPrayer.label}</b>
              <time>{nextPrayer.time}</time>
              <small>({formatCountdown(nextPrayer.remainingMinutes)})</small>
            </div>
          )}
        </header>

        <div className="prayer-grid-cards">
          {prayerItems.map(item => {
            const isNext = nextPrayer?.key === item.key;
            return (
              <article key={item.key} className={`prayer-item-card ${isNext ? 'is-next-prayer' : ''}`}>
                <div className="prayer-item-top">
                  <span className="prayer-item-icon">{item.icon}</span>
                  {isNext && <span className="next-prayer-indicator">Berikutnya</span>}
                </div>
                <b className="prayer-item-label">{item.label}</b>
                <time className="prayer-item-time">{times[item.key]}</time>
                <small className="prayer-item-desc">{item.sub}</small>
              </article>
            );
          })}
        </div>

        <footer className="prayer-schedule-footer">
          <div className="method-note">
            <span>Standar Perhitungan:</span> Kementerian Agama Republik Indonesia (Kemenag) · Sudut Subuh 20°, Isya 18°, Ihtiyat 2 menit.
          </div>
          <p>Waktu shalat dapat memiliki selisih 1–2 menit tergantung elevasi dan jadwal masjid setempat.</p>
        </footer>
      </div>
    </div>
  );
}

