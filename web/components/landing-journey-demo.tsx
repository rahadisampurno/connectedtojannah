'use client';

import { useState } from 'react';

const stages = [
  { day: 1, label: 'Hari 1', title: 'Cahaya pertama', progress: 12, message: 'Satu langkah kecil menyalakan cahaya pertama di perjalananmu.' },
  { day: 7, label: 'Hari 7', title: 'Taman mulai berbunga', progress: 48, message: 'Konsistensi membuat taman terasa semakin hidup dan hangat.' },
  { day: 30, label: 'Hari 30', title: 'Paviliun terbuka', progress: 100, message: 'Perjalanan panjangmu meninggalkan jejak yang tetap bertumbuh.' },
];

export function LandingJourneyDemo() {
  const [selected, setSelected] = useState(0);
  const stage = stages[selected];

  return <div className={`journey-demo stage-${selected + 1}`} aria-label="Demo interaktif perkembangan Journey World">
    <div className="journey-sky"><i /><i /><i /><span>✦</span></div>
    <div className="journey-landscape">
      {selected >= 1 && <span className="journey-pavilion" aria-hidden="true">⌂</span>}
      <span className="journey-path" />
      <span className="journey-plants" aria-hidden="true">
        {Array.from({ length: 3 + selected * 2 }, (_, index) => <i key={index} />)}
      </span>
    </div>
    <div className="journey-panel" aria-live="polite">
      <small>DEMO JOURNEY · {stage.label.toUpperCase()}</small>
      <strong>{stage.title}</strong>
      <p>{stage.message}</p>
      <div className="journey-meter" role="progressbar" aria-label="Perkembangan demo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={stage.progress}><i style={{ width: `${stage.progress}%` }} /></div>
      <div className="stage-tabs" aria-label="Pilih tahap demo">{stages.map((item, index) => <button type="button" key={item.day} className={selected === index ? 'active' : ''} aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.label}</button>)}</div>
    </div>
    <small className="journey-note">Ilustrasi demo — bukan data pengguna dan bukan ukuran pahala atau iman.</small>
  </div>;
}
