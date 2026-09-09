export interface PrayerTimes {
  imsak: string;
  subuh: string;
  terbit: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
}

export interface NextPrayerInfo {
  key: keyof PrayerTimes;
  label: string;
  time: string;
  remainingMinutes: number;
}

const rad = Math.PI / 180;
const deg = 180 / Math.PI;

export function calculatePrayerTimes(
  lat: number,
  lon: number,
  timezoneHours = 7,
  date = new Date()
): PrayerTimes {
  const Y = date.getFullYear();
  const M = date.getMonth();
  const D = date.getDate();

  const jd = Date.UTC(Y, M, D, 12, 0, 0) / 86400000 + 2440587.5;
  const d = jd - 2451545.0;

  const g = (357.529 + 0.98560028 * d) % 360;
  const q = (280.459 + 0.98564736 * d) % 360;
  const L = (q + 1.915 * Math.sin(g * rad) + 0.02 * Math.sin(2 * g * rad)) % 360;

  const e = 23.439 - 0.00000036 * d;
  const RA = (Math.atan2(Math.cos(e * rad) * Math.sin(L * rad), Math.cos(L * rad)) * deg) / 15;
  const D_sun = Math.asin(Math.sin(e * rad) * Math.sin(L * rad)) * deg;

  const RA_h = (RA + 24) % 24;
  const q_h = (q / 15 + 24) % 24;
  let eqT = (q_h - RA_h) * 60;
  if (eqT > 20) eqT -= 1440;
  if (eqT < -20) eqT += 1440;

  const noon = 12 + timezoneHours - lon / 15 - eqT / 60;

  function hourAngle(alpha: number) {
    const cosH =
      (Math.sin(alpha * rad) - Math.sin(lat * rad) * Math.sin(D_sun * rad)) /
      (Math.cos(lat * rad) * Math.cos(D_sun * rad));
    if (cosH > 1 || cosH < -1) return null;
    return (Math.acos(cosH) * deg) / 15;
  }

  // Kemenag RI Standard: Fajr -20 deg, Isha -18 deg, Sunrise/Sunset -0.8333 deg
  const fajrHA = hourAngle(-20) ?? 4;
  const sunriseHA = hourAngle(-0.8333) ?? 6;
  const maghribHA = hourAngle(-0.8333) ?? 6;
  const ishaHA = hourAngle(-18) ?? 4;

  // Asr Shafi'i shadow = 1 + tan(|lat - declination|)
  const asrAlt = Math.atan(1 / (1 + Math.tan(Math.abs(lat - D_sun) * rad))) * deg;
  const asrHA = hourAngle(asrAlt) ?? 3;

  function formatTime(decimalHours: number) {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    const totalMin = h * 60 + m;
    const finalH = (Math.floor(totalMin / 60) + 24) % 24;
    const finalM = (totalMin % 60 + 60) % 60;
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
  }

  // With 2-minute ihtiyat (Kemenag standard buffer)
  return {
    imsak: formatTime(noon - fajrHA - 10 / 60),
    subuh: formatTime(noon - fajrHA + 2 / 60),
    terbit: formatTime(noon - sunriseHA - 2 / 60),
    dzuhur: formatTime(noon + 2 / 60),
    ashar: formatTime(noon + asrHA + 2 / 60),
    maghrib: formatTime(noon + maghribHA + 2 / 60),
    isya: formatTime(noon + ishaHA + 2 / 60),
  };
}

export function getNextPrayer(times: PrayerTimes, now = new Date()): NextPrayerInfo {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const schedule: { key: keyof PrayerTimes; label: string; time: string }[] = [
    { key: 'subuh', label: 'Subuh', time: times.subuh },
    { key: 'terbit', label: 'Syuruq (Terbit)', time: times.terbit },
    { key: 'dzuhur', label: 'Dzuhur', time: times.dzuhur },
    { key: 'ashar', label: 'Ashar', time: times.ashar },
    { key: 'maghrib', label: 'Maghrib', time: times.maghrib },
    { key: 'isya', label: 'Isya', time: times.isya },
  ];

  for (const item of schedule) {
    const [h, m] = item.time.split(':').map(Number);
    const prayerMinutes = h * 60 + m;
    if (prayerMinutes > currentMinutes) {
      return {
        ...item,
        remainingMinutes: prayerMinutes - currentMinutes,
      };
    }
  }

  // After Isha -> next is tomorrow's Subuh
  const [h, m] = times.subuh.split(':').map(Number);
  const subuhTomorrowMinutes = 24 * 60 + h * 60 + m;
  return {
    key: 'subuh',
    label: 'Subuh (Besok)',
    time: times.subuh,
    remainingMinutes: subuhTomorrowMinutes - currentMinutes,
  };
}

export async function fetchLivePrayerTimes(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<PrayerTimes> {
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=20`,
      { signal }
    );
    if (!res.ok) throw new Error('AlAdhan response not ok');
    const json = await res.json();
    const t = json.data?.timings;
    if (t?.Fajr && t?.Dhuhr && t?.Asr && t?.Maghrib && t?.Isha) {
      return {
        imsak: t.Imsak?.replace(/\s\(.+\)/, '') ?? '04:19',
        subuh: t.Fajr?.replace(/\s\(.+\)/, '') ?? '04:31',
        terbit: t.Sunrise?.replace(/\s\(.+\)/, '') ?? '05:44',
        dzuhur: t.Dhuhr?.replace(/\s\(.+\)/, '') ?? '11:49',
        ashar: t.Asr?.replace(/\s\(.+\)/, '') ?? '15:06',
        maghrib: t.Maghrib?.replace(/\s\(.+\)/, '') ?? '17:50',
        isya: t.Isha?.replace(/\s\(.+\)/, '') ?? '18:59',
      };
    }
  } catch {
    // Fallback to local astronomical calculation
  }
  return calculatePrayerTimes(lat, lon);
}
