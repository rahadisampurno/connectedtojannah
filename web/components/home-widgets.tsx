'use client';
import { useEffect, useMemo, useState } from 'react';
type Entry={id:string;title:string;period:string;status:string};
type Location={name?:string|null;latitude?:number|null;longitude?:number|null};
export function NextBestAction({entries,challenge,openAmalan,openJourney}:{entries:Entry[];challenge?:{title:string;current:number;target:number;status:string};openAmalan:()=>void;openJourney:()=>void}){const next=useMemo(()=>{const hour=new Date().getHours(),period=hour<11?'PAGI':hour<15?'SIANG':hour<19?'SORE':'MALAM';return entries.find(e=>e.status==='PENDING'&&e.period===period)??entries.find(e=>e.status==='PENDING')},[entries]);if(next)return <article className="next-action"><span>LANJUTKAN PERJALANAN</span><div><i>{next.period==='PAGI'?'☀':next.period==='MALAM'?'☾':'✦'}</i><div><small>{next.period.toLowerCase()} ini</small><b>{next.title} belum ditandai.</b></div></div><button onClick={openAmalan}>Buka Amalan →</button></article>;if(challenge?.status==='ACTIVE'&&challenge.current<challenge.target)return <article className="next-action"><span>TANTANGANMU</span><div><i>▤</i><div><small>{challenge.current} dari {challenge.target} hari</small><b>Lanjutkan {challenge.title}</b></div></div><button onClick={openAmalan}>Lanjutkan →</button></article>;return <article className="next-action complete"><span>ALHAMDULILLAH</span><div><i>✦</i><div><small>Hari ini</small><b>Perjalanan hari ini sudah selesai.</b></div></div><button onClick={openJourney}>Lihat Journey →</button></article>}
import { calculatePrayerTimes, fetchLivePrayerTimes, PrayerTimes } from '../lib/prayer-times';

export function PrayerTimesCard({location,configure}:{location:Location;configure:()=>void}){
  const lat = location.latitude;
  const lon = location.longitude;
  const [times, setTimes] = useState<PrayerTimes | null>(() => (lat != null && lon != null ? calculatePrayerTimes(lat, lon) : null));

  useEffect(() => {
    if (lat == null || lon == null) return;
    const initial = calculatePrayerTimes(lat, lon);
    setTimes(initial);
    const controller = new AbortController();
    fetchLivePrayerTimes(lat, lon, controller.signal).then(setTimes);
    return () => controller.abort();
  }, [lat, lon]);

  if (lat == null || lon == null) {
    return (
      <article className="prayer-card empty">
        <span>JADWAL SHALAT</span>
        <h3>Atur lokasi untuk melihat jadwal.</h3>
        <p>Lokasi hanya digunakan setelah kamu menyimpannya dari Profil.</p>
        <button onClick={configure}>Atur lokasi →</button>
      </article>
    );
  }

  const schedule: [keyof PrayerTimes, string][] = [
    ['subuh', 'Subuh'],
    ['dzuhur', 'Dzuhur'],
    ['ashar', 'Ashar'],
    ['maghrib', 'Maghrib'],
    ['isya', 'Isya'],
  ];

  return (
    <article className="prayer-card">
      <span>JADWAL SHALAT · {location.name ?? 'LOKASIMU'}</span>
      {times ? (
        <div>
          {schedule.map(([key, label]) => (
            <p key={key}>
              <b>{label}</b>
              <time>{times[key]}</time>
            </p>
          ))}
        </div>
      ) : (
        <p>Menghitung waktu…</p>
      )}
      <small>Sumber: AlAdhan / Hisab Falakiyah · metode Kemenag RI (20). Periksa jadwal masjid setempat.</small>
      <button onClick={configure}>Ubah lokasi</button>
    </article>
  );
}
