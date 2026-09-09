'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, SessionUser } from '../lib/api';
import { HeroAtmosphere } from './hero-atmosphere';
import { LandingJourneyDemo } from './landing-journey-demo';
import { MascotGuide } from './mascot-guide';

const faqs = [
  ['Apakah aplikasi ini menghitung pahala?', 'Tidak. Connected to Jannah hanya merepresentasikan aktivitas dan konsistensi di dalam aplikasi. Tidak ada poin pahala, ranking kesalehan, atau klaim nilai amal seseorang.'],
  ['Apakah detail amalan saya terlihat anggota lain?', 'Kamu mengendalikan tingkat privasi: Private, status selesai saja, persentase, atau detail. Default-nya privacy-safe dan akses divalidasi oleh backend.'],
  ['Apakah hanya untuk pasangan?', 'Tidak. Aplikasi mendukung penggunaan pribadi, pasangan, keluarga, sahabat, grup kajian, komunitas, serta Circle custom.'],
  ['Apakah Journey World adalah gambaran Jannah?', 'Bukan. Journey World adalah lingkungan fantasi simbolis untuk merepresentasikan perjalanan di aplikasi, bukan visualisasi literal Jannah.'],
  ['Apakah bisa digunakan di ponsel dan komputer?', 'Ya. Versi web dibangun mobile-first dan beradaptasi untuk ponsel, tablet, laptop, serta desktop.'],
];

function Brand({ compact = false }: { compact?: boolean }) {
  return <span className={`brand-lockup ${compact ? 'compact' : ''}`} aria-hidden="true"><span className="brand-dome-crop"><Image src="/images/ctj-logo.webp" width={1254} height={1254} alt="" priority={compact} /></span><span className="brand-wordmark-crop"><Image src="/images/ctj-logo.webp" width={1254} height={1254} alt="" priority={compact} /></span></span>;
}

export function LandingPage() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [hasStoredToken, setHasStoredToken] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('ctj_access_token')) {
      setHasStoredToken(true);
    }
    apiFetch<SessionUser>('/me')
      .then(me => {
        if (me && me.id) {
          setUser(me);
          setHasStoredToken(true);
        } else {
          setUser(null);
          setHasStoredToken(false);
        }
      })
      .catch(() => {
        setUser(null);
        setHasStoredToken(false);
      });
  }, []);

  const isAuth = !!user || hasStoredToken;

  return <div className="landing landing-v2">
    <header className="site-header">
      <Link href="#beranda" className="site-brand" aria-label="Connected to Jannah — kembali ke beranda"><Brand compact /></Link>
      <nav className="site-nav" aria-label="Navigasi landing page"><a href="#cara-kerja">Cara Kerja</a><a href="#journey">Journey</a><a href="#privacy">Privacy</a><a href="#faq">FAQ</a></nav>
      {isAuth ? (
        <div className="header-actions authenticated">
          {user && <span className="user-greeting">Assalamu’alaikum, <b>{user.displayName}</b></span>}
          <Link className="small-cta app-cta" href="/app">Buka Aplikasi <span>→</span></Link>
        </div>
      ) : (
        <div className="header-actions">
          <Link className="text-link" href="/login">Masuk</Link>
          <Link className="small-cta" href="/register">Mulai Sekarang</Link>
        </div>
      )}
    </header>

    <main>
      <section className="landing-hero" id="beranda">
        <HeroAtmosphere />
        <div className="hero-copy">
          <Image className="hero-logo" src="/images/ctj-logo.webp" width={1254} height={1254} priority alt="Connected to Jannah" />
          <div className="eyebrow"><i /> SOCIAL WORSHIP COMPANION</div>
          <h1><span className="hero-title-main">Jaga langkah baikmu.</span><span>Rasakan indahnya bertumbuh bersama.</span></h1>
          <p className="hero-lead">Satu ruang yang tenang untuk menjaga amalan, membangun konsistensi, dan saling menguatkan bersama orang-orang terdekat.</p>
          <div className="hero-actions">
            {isAuth ? (
              <Link href="/app" className="landing-primary app-primary-cta">Lanjutkan ke Aplikasi <span>→</span></Link>
            ) : (
              <Link href="/register" className="landing-primary">Mulai Perjalanan <span>→</span></Link>
            )}
            <a href="#demo-journey" className="landing-secondary">Lihat Demo</a>
          </div>
          <div className="hero-note"><span>✓</span> Gratis untuk memulai <span>·</span> Privacy-first <span>·</span> Tanpa ranking kesalehan</div>
        </div>
        <MascotGuide />
        <a className="scroll-cue" href="#tentang">Jelajahi perjalanan <span>↓</span></a>
      </section>

      <section className="trust-strip" aria-label="Nilai utama"><span>PRIVACY-SAFE</span><i /><span>BERSAMA TANPA BERLOMBA</span><i /><span>SYARIAH-AWARE</span><i /><span>MOBILE-FIRST</span></section>

      <section className="landing-section intro" id="tentang">
        <div><div className="eyebrow dark"><i /> MULAI DARI YANG RINGAN</div><h2>Tidak perlu menunggu sempurna untuk memulai.</h2></div>
        <div className="intro-copy"><p>Satu shalat tepat waktu. Beberapa ayat yang dibaca. Satu kebaikan kecil yang dilakukan dengan tulus.</p><p>Connected to Jannah membantu menjaga langkah-langkah itu tetap terasa dekat, pribadi, dan menyenangkan—sendiri maupun bersama orang yang kita sayangi.</p></div>
      </section>

      <section className="how-it-works" id="cara-kerja" aria-labelledby="how-it-works-title">
        <div className="how-copy"><span className="kicker light">BAGAIMANA CARANYA</span><h2 id="how-it-works-title">Tiga langkah untuk menjaga perjalananmu.</h2><p>Mulai dari yang mampu kamu jaga. Aplikasi memberi arah dan ruang untuk kembali, tanpa membuat ibadah terasa seperti perlombaan.</p><a className="demo-jump" href="#demo-journey">Lihat perubahan Journey <span>↓</span></a></div>
        <div className="how-steps">
          <article><span>01</span><i>☀</i><div><h3>Pilih langkahmu</h3><p>Tentukan amalan yang ingin dijaga—tidak perlu memulai semuanya sekaligus.</p></div></article>
          <article><span>02</span><i>✓</i><div><h3>Catat dengan tenang</h3><p>Tandai setelah dilakukan. Detail tetap pribadi dan tidak menjadi ranking.</p></div></article>
          <article><span>03</span><i>✦</i><div><h3>Lihat perjalanan tumbuh</h3><p>Journey berkembang dari aktivitasmu, sementara Circle hadir untuk saling menguatkan.</p></div></article>
        </div>
      </section>

      <section className="journey-demo-section" id="demo-journey" aria-labelledby="journey-demo-title">
        <div className="demo-copy"><span className="kicker light">COBA JOURNEY WORLD</span><h2 id="journey-demo-title">Lihat bagaimana langkah kecil meninggalkan jejak.</h2><p>Pilih Hari 1, Hari 7, atau Hari 30 untuk melihat contoh perkembangan visual. Demo ini hanya ilustrasi dan tidak menyimpan data.</p><div className="demo-principle"><span>◇</span><p><b>Journey bukan ukuran pahala.</b> Dunia visual hanya merepresentasikan aktivitas di dalam aplikasi—bukan tingkat iman, nilai ibadah, atau gambaran literal Jannah.</p></div><Link className="landing-primary demo-register" href={isAuth ? "/app" : "/register"}>{isAuth ? "Buka aplikasimu" : "Mulai perjalananmu"} <span>→</span></Link></div>
        <LandingJourneyDemo />
      </section>

      <section className="world-showcase" id="journey">
        <div className="world-copy"><span className="kicker light">JOURNEY WORLD</span><h2>Duniamu ikut bertumbuh.</h2><p>Setiap konsistensi menghadirkan perubahan halus: bunga bermekaran, lentera menyala, aliran air muncul, dan area baru terbuka.</p><ul><li><span>01</span><div><b>Hari pertama</b><small>Taman sederhana dan satu cahaya kecil.</small></div></li><li><span>07</span><div><b>Tujuh hari konsisten</b><small>Lebih banyak bunga dan lentera.</small></div></li><li><span>30</span><div><b>Tiga puluh hari perjalanan</b><small>Pavilion dan area taman baru.</small></div></li></ul><small className="world-disclaimer">Journey World adalah representasi aktivitas di aplikasi, bukan gambaran literal Jannah.</small></div>
        <div className="garden-card"><span>OUR GARDEN</span><strong>Taman Keberkahan</strong><p>Dirawat bersama Keluarga Kami</p><div><b>Tanaman <em>12 tumbuh</em></b><b>Bangunan <em>4 terbuka</em></b><b>Dekorasi <em>6 ditemukan</em></b></div></div>
      </section>

      <section className="privacy-section" id="privacy"><div className="privacy-card"><span className="shield">◇</span><div><span className="kicker light">PRIVACY BY DESIGN</span><h2>Ibadahmu tetap milikmu.</h2><p>Kamu memilih informasi yang boleh terlihat oleh setiap Circle. Tidak ada ranking kesalehan dan detail amalan tidak dibuka tanpa izin.</p><div className="privacy-levels"><b><i>●</i> Private</b><b><i>●</i> Selesai saja</b><b><i>●</i> Persentase</b><b><i>●</i> Detail</b></div><small>Default: completion-only atau pengaturan setara yang privacy-safe.</small></div></div></section>

      <section className="values-section" id="lebih-lanjut"><div className="section-heading centered"><span className="kicker light">DIBANGUN DENGAN HATI-HATI</span><h2>Tenang, menghormati, dan tetap bermakna.</h2></div><div className="values-grid"><article><span>01</span><h3>Syariah-aware</h3><p>Tidak memvisualisasikan Allah atau para Nabi dan konten agama melewati proses review.</p></article><article><span>02</span><h3>Tanpa gamifikasi pahala</h3><p>Tidak ada poin pahala, level kesalehan, ranking ibadah, atau mekanisme menghakimi.</p></article><article><span>03</span><h3>Dukungan positif</h3><p>Encouragement dibuat untuk menguatkan, bukan mempermalukan atau menyoroti kegagalan.</p></article><article><span>04</span><h3>Akses di mana saja</h3><p>Mobile-first dan responsif di ponsel, tablet, laptop, serta desktop.</p></article></div></section>

      <section className="landing-section faq-section" id="faq"><div className="section-heading"><span className="kicker">PERTANYAAN UMUM</span><h2>Kenali aplikasinya dengan tenang.</h2></div><div className="faq-list">{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>

      <section className="final-cta"><div><Image className="cta-logo" src="/images/ctj-logo.webp" width={1254} height={1254} alt="" /><span className="kicker light">PERJALANANMU BISA DIMULAI HARI INI</span><h2>Satu langkah kebaikan,<br />bersama menuju Jannah.</h2><p>Mulai dari yang mampu kamu jaga. Connected to Jannah akan menemani perjalananmu.</p><div><Link className="landing-primary" href={isAuth ? "/app" : "/register"}>{isAuth ? "Lanjut ke Aplikasi" : "Daftar Sekarang"} <span>→</span></Link><a className="landing-secondary light-button" href="#demo-journey">Lihat Demo Journey</a></div></div></section>
    </main>

    <footer className="site-footer"><div className="footer-brand"><Link href="#beranda" className="site-brand"><Brand /></Link><p>Social worship companion dan shared spiritual journey.</p><small>Bersama di dunia, menuju Jannah.</small></div><div><b>Produk</b><a href="#demo-journey">Demo Journey</a><a href="#journey">Journey World</a><a href="#privacy">Privacy</a></div><div><b>Informasi</b><a href="#tentang">Tentang</a><a href="#faq">FAQ</a>{isAuth ? <Link href="/app">Buka Aplikasi</Link> : <><Link href="/login">Masuk</Link><Link href="/register">Daftar</Link></>}</div><div><b>Prinsip</b><span>Privacy-first</span><span>Syariah-aware</span><span>Tanpa ranking</span><span>Accessibility</span></div><p className="footer-bottom">© 2026 Connected to Jannah. Progress dalam aplikasi bukan ukuran pahala atau tingkat iman.</p></footer>
  </div>;
}
