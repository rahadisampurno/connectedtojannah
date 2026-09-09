'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

const messages = [
  { text: 'Amalan yang paling Allah cintai adalah yang rutin, walau sedikit.', source: 'HR. Bukhari no. 6464', href: 'https://sunnah.com/bukhari:6464' },
  { text: 'Pilih amalan sesuai kemampuanmu agar dapat terus dijaga.', source: 'HR. Bukhari no. 6465', href: 'https://sunnah.com/bukhari:6465' },
  { text: 'Katakan, “Aku beriman kepada Allah,” lalu istiqamahlah.', source: 'HR. Muslim no. 38', href: 'https://sunnah.com/muslim:38' },
  { text: 'Berbuatlah dengan benar, ikhlas, dan pertengahan.', source: 'HR. Bukhari no. 6464', href: 'https://sunnah.com/bukhari:6464' },
  { text: 'Bersemangatlah pada yang bermanfaat, minta pertolongan Allah, dan jangan menyerah.', source: 'HR. Muslim no. 2664', href: 'https://sunnah.com/muslim:2664' },
  { text: 'Jaga shalat pada waktunya; itulah salah satu amalan yang paling Allah cintai.', source: 'HR. Bukhari no. 527', href: 'https://sunnah.com/bukhari:527' },
  { text: 'Saat sakit atau bepergian, amal rutin seorang hamba tetap dicatat seperti biasanya.', source: 'HR. Bukhari no. 2996', href: 'https://sunnah.com/bukhari:2996' },
  { text: 'Satu kebaikan yang kamu mulai dapat mengajak orang lain ikut berbuat baik.', source: 'HR. Muslim no. 1017', href: 'https://sunnah.com/muslim:1017' },
  { text: 'Luruskan niat; nilai amal bergantung pada niatnya.', source: 'HR. Bukhari no. 1', href: 'https://sunnah.com/bukhari:1' },
  { text: 'Dua rakaat Dhuha dapat mencukupi sedekah bagi seluruh persendian pada pagi hari.', source: 'HR. Muslim no. 720', href: 'https://sunnah.com/muslim:720' },
];

export function MascotGuide() {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const autoCollapsed = useRef(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % messages.length), 9000);
    return () => window.clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (window.matchMedia('(max-width: 760px)').matches) setOpen(false);

    const compactAfterHero = () => {
      if (!autoCollapsed.current && window.scrollY > window.innerHeight * 0.6) {
        autoCollapsed.current = true;
        setOpen(false);
      }
    };
    window.addEventListener('scroll', compactAfterHero, { passive: true });
    return () => window.removeEventListener('scroll', compactAfterHero);
  }, []);

  const message = messages[index];
  const move = (step: number) => setIndex((current) => (current + step + messages.length) % messages.length);

  return <aside className={`mascot-guide ${open ? 'is-open' : ''}`} aria-label="Pesan istiqamah dari Lea dan Nan" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    {open && <div className="npc-bubble" aria-live="polite">
      <div className="npc-bubble-head"><span><i /> PESAN ISTIQAMAH</span><button type="button" onClick={() => setOpen(false)} aria-label="Tutup pesan">×</button></div>
      <p>{message.text}</p>
      <div className="npc-bubble-foot">
        <a href={message.href} target="_blank" rel="noreferrer" title="Buka sumber hadis">{message.source} ↗</a>
        <span><button type="button" onClick={() => move(-1)} aria-label="Pesan sebelumnya">‹</button><b>{String(index + 1).padStart(2, '0')} / {messages.length}</b><button type="button" onClick={() => move(1)} aria-label="Pesan berikutnya">›</button></span>
      </div>
    </div>}
    <button className="npc-mascots" type="button" onClick={() => open ? move(1) : setOpen(true)} aria-label={open ? 'Tampilkan pesan berikutnya' : 'Buka pesan istiqamah'}>
      <Image src="/images/lea-nan-companions.webp" width={1536} height={1024} alt="Lea dan Nan" />
      {!open && <span>✦</span>}
    </button>
  </aside>;
}
