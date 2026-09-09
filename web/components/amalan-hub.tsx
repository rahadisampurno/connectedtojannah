'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Challenge, PersonalChallenges } from './together-hub-v2';
import { useConfirm } from './confirm-dialog';

type CircleOrigin={id:string;name:string;type:string};
type Entry={id:string;amalanId?:string;title:string;note:string;period:string;kind:string;current:number;target:number;unit?:string;completed:boolean;status:'PENDING'|'COMPLETED'|'SKIPPED';sourceLabel?:string;sourceUrl?:string;instructions?:string;bookmarked?:boolean;isPersonal:boolean;circles:CircleOrigin[]};
type Daily={entries:Entry[];summary:{completed:number;total:number;percentage:number};experience:{level:number;totalXp:number;currentXp:number;nextLevelXp:number;percentage:number};journey:{activeDays:number;consistencyDays:number;message:string}};
type CatalogItem={key:string;id?:string;title:string;note:string;category:string;period:string;kind:string;target:number;unit?:string;active:boolean;sourceLabel:string;sourceUrl:string;instructions:string;isCustom?:boolean};
type HistoryDay={date:string;total:number;completed:number;percentage:number;entries:{id:string;title:string;completed:boolean;status:string}[]};

function circleBadges(circles:CircleOrigin[]){const grouped=new Map<string,number>();for(const circle of circles)grouped.set(circle.name,(grouped.get(circle.name)??0)+1);return[...grouped].map(([name,count])=>({name,label:count>1?`${name} · ${count} Circle`:name}))}

type View = 'today' | 'challenges' | 'mine' | 'explore' | 'history';
const validViews: View[] = ['today', 'challenges', 'mine', 'explore', 'history'];

function getInitialAmalanView(): View {
  if (typeof window === 'undefined') return 'today';
  const parts = window.location.hash.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'amalan' && parts[1] && validViews.includes(parts[1] as View)) {
    return parts[1] as View;
  }
  const stored = sessionStorage.getItem('ctj_amalan_sub') as View;
  if (stored && validViews.includes(stored)) return stored;
  return 'today';
}

export function AmalanHub({
  daily,
  challenges = [],
  busy,
  act,
  reload,
}: {
  daily: Daily;
  challenges?: Challenge[];
  busy: string;
  act: (label: string, task: () => Promise<unknown>, message: string) => Promise<void>;
  reload: () => Promise<void>;
}) {
  const confirm = useConfirm();
  const [view,setViewState]=useState<View>(getInitialAmalanView);
  const [period,setPeriod]=useState('SEMUA'),[catalog,setCatalog]=useState<CatalogItem[]>([]),[history,setHistory]=useState<HistoryDay[]>([]),[detail,setDetailState]=useState<Entry|null>(null),[expanded,setExpanded]=useState('');

  const setView=(v:View)=>{
    setViewState(v);
    if(typeof window!=='undefined'){
      sessionStorage.setItem('ctj_amalan_sub',v);
      const targetHash=`#amalan/${v}`;
      if(window.location.hash!==targetHash){
        window.history.replaceState(null,'',targetHash);
      }
    }
  };

  const setDetail=(entry:Entry|null)=>{
    setDetailState(entry);
    if(typeof window!=='undefined'){
      if(entry) sessionStorage.setItem('ctj_amalan_detail',JSON.stringify({id:entry.id,title:entry.title}));
      else sessionStorage.removeItem('ctj_amalan_detail');
    }
  };

  useEffect(()=>{
    const syncHash=()=>{
      const parts=window.location.hash.replace(/^#\/?/,'').split('/');
      if(parts[0]==='amalan'&&parts[1]&&validViews.includes(parts[1] as View)){
        setViewState(parts[1] as View);
        sessionStorage.setItem('ctj_amalan_sub',parts[1]);
      }
    };
    syncHash();
    window.addEventListener('hashchange',syncHash);
    return()=>window.removeEventListener('hashchange',syncHash);
  },[]);

  useEffect(()=>{
    if(!detail && typeof window!=='undefined'){
      const stored=sessionStorage.getItem('ctj_amalan_detail');
      if(!stored) return;
      try{
        const parsed=JSON.parse(stored);
        const match=daily.entries.find(e=>e.id===parsed.id||e.title===parsed.title);
        if(match)setDetailState(match);
      }catch{sessionStorage.removeItem('ctj_amalan_detail')}
    }
  },[daily.entries,detail]);

  const fetchCatalog=()=>apiFetch<CatalogItem[]>('/amalan/catalog').then(setCatalog),fetchHistory=()=>apiFetch<HistoryDay[]>('/daily/history').then(setHistory);
  useEffect(()=>{if(view==='mine'||view==='explore')void fetchCatalog();if(view==='history')void fetchHistory()},[view]);
  const periodRank: Record<string, number> = { PAGI: 1, SIANG: 2, SORE: 3, MALAM: 4 };
  const { pendingItems, completedItems } = useMemo(() => {
    const filtered = daily.entries.filter(entry => period === 'SEMUA' || entry.period === period);
    const sortByPeriod = (a: Entry, b: Entry) => {
      const aPeriod = periodRank[a.period] ?? 5;
      const bPeriod = periodRank[b.period] ?? 5;
      if (aPeriod !== bPeriod) return aPeriod - bPeriod;
      return a.title.localeCompare(b.title, 'id');
    };
    const pending = filtered.filter(e => e.status !== 'COMPLETED' && !e.completed).sort(sortByPeriod);
    const completed = filtered.filter(e => e.status === 'COMPLETED' || e.completed).sort(sortByPeriod);
    return { pendingItems: pending, completedItems: completed };
  }, [daily, period]);
  const toggleActive=async(item:CatalogItem,active:boolean)=>{if(!item.id&&active){await act(`amalan-${item.key}`,()=>apiFetch('/amalan/templates',{method:'POST',body:JSON.stringify({key:item.key})}),'Amalan ditambahkan.')}else if(item.id)await act(`amalan-${item.key}`,()=>apiFetch(`/amalan/${item.id}/active`,{method:'PATCH',body:JSON.stringify({active})}),active?'Amalan diaktifkan.':'Amalan disimpan dari daftar hari ini.');await fetchCatalog();await reload()};
  const activateAllCatalog=async()=>{const inactiveCount=catalog.filter(x=>!x.active&&!x.isCustom).length;if(!inactiveCount)return;const confirmed=await confirm({title:'Aktifkan Semua Amalan?',message:`Ingin mengaktifkan sekaligus ${inactiveCount} amalan katalog ke dalam rutinitas harianmu?`,confirmText:'Aktifkan Semua',cancelText:'Batal',variant:'primary',mascotSpeech:'Alhamdulillah, semoga Allah mudahkan setiap langkah kebaikanmu!'});if(!confirmed)return;await act('activate-all-catalog',()=>apiFetch('/amalan/activate-all',{method:'POST'}),'Semua amalan katalog berhasil diaktifkan.');await fetchCatalog();await reload()};
  const addCustom=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=event.currentTarget,data=Object.fromEntries(new FormData(form));await act('custom-amalan',()=>apiFetch('/amalan/custom',{method:'POST',body:JSON.stringify({...data,target:Number(data.target)})}),'Amalan pribadi ditambahkan.');form.reset();await fetchCatalog();await reload()};
  const deleteAmalan=async(id:string,title:string)=>{
    const confirmed = await confirm({
      title: 'Hapus Amalan Pribadi?',
      message: `Yakin ingin menghapus amalan pribadi "${title}"? Amalan ini tidak lagi muncul di daftar amalan harianmu.`,
      confirmText: 'Hapus Amalan',
      cancelText: 'Simpan Saja',
      variant: 'danger',
      mascotSpeech: 'Amalan kustom yang dihapus bisa kamu buat kembali kapan pun diperlukan.',
    });
    if(!confirmed)return;
    await act(`delete-amalan-${id}`,()=>apiFetch(`/amalan/${id}`,{method:'DELETE'}),`Amalan "${title}" berhasil dihapus.`);
    if(detail?.amalanId===id||detail?.id===id)setDetail(null);
    await fetchCatalog();
    await reload();
  };
  const renderEntry = (entry: Entry) => {
    const periodLabel=entry.period[0]+entry.period.slice(1).toLowerCase();
    const unit=entry.unit??(entry.kind==='DURATION'?'menit':'kali');
    return <article key={entry.id} className={`${entry.status==='COMPLETED'?'done':entry.status==='SKIPPED'?'skipped':''} has-origin amalan-quest-card period-${entry.period.toLowerCase()}`}>
      <span className="amalan-card-glow" aria-hidden="true"/>
      <div className="entry-origin-badges">
        {entry.isPersonal && <span className="personal">PRIBADI</span>}
        {circleBadges(entry.circles).map(circle => <span className="circle" key={circle.name}>♧ {circle.label}</span>)}
      </div>
      <div className="entry-card-main">
        <i className="entry-time-icon"><span>{entry.status==='COMPLETED'?'✓':entry.status==='SKIPPED'?'—':entry.period==='PAGI'?'☀':entry.period==='MALAM'?'☾':'✦'}</span><small>{periodLabel}</small></i>
        <button className="entry-copy" onClick={() => setDetail(entry)}>
          <b>{entry.title}</b>
          <small>{entry.note||'Langkah kebaikan yang kamu pilih.'}</small>
          <span className="entry-quick-meta"><em>{entry.kind==='CHECKLIST'?'Checklist':entry.kind==='DURATION'?'Durasi':'Hitungan'}</em><em>Target {entry.target} {unit}</em></span>
          <strong>Lihat penjelasan & sumber <i>↗</i></strong>
        </button>
      </div>
      <div className="entry-actions">
        <button className="bookmark-action" aria-label={entry.bookmarked?'Hapus dari tersimpan':'Simpan amalan'} title={entry.bookmarked?'Hapus dari tersimpan':'Simpan amalan'} disabled={!entry.amalanId} onClick={() => entry.amalanId && void act(`bookmark-${entry.id}`, () => apiFetch(`/amalan/${entry.amalanId}/bookmark`, { method: 'PATCH', body: JSON.stringify({ bookmarked: !entry.bookmarked }) }), entry.bookmarked ? 'Dihapus dari Tersimpan.' : 'Disimpan untuk dibaca lagi.')}>
          {entry.bookmarked ? '♥' : '♡'}
        </button>
        <button className="complete-action" disabled={entry.status !== 'PENDING' || busy === entry.id} onClick={() => void act(entry.id, () => apiFetch(`/daily/${entry.id}/complete`, { method: 'POST', body: JSON.stringify({ clientMutationId: crypto.randomUUID() }) }), 'Langkah hari ini dicatat dan EXP bertambah.')}>
          {busy===entry.id?'Mencatat…':entry.status === 'COMPLETED' ? '✓ Selesai' : entry.status === 'SKIPPED' ? 'Dilewati' : 'Tandai selesai'}
        </button>
        {entry.status === 'PENDING' && (
          <button className="skip-action" onClick={() => void act(`skip-${entry.id}`, () => apiFetch(`/daily/${entry.id}/skip`, { method: 'POST' }), 'Amalan dilewati untuk hari ini.')}>
            Lewati hari ini
          </button>
        )}
      </div>
    </article>
  };
  return <div className="app-screen amalan-screen"><header className="app-head amalan-head"><div><span>LANGKAH YANG KAMU PILIH</span><h1>Amalan</h1><p>Semua amalan pribadi dan Circle-mu hadir dalam satu daftar tanpa duplikasi.</p></div><div className="personal-exp-card"><span>LEVEL AKUN</span><strong>{daily.experience.level}</strong><div><header><b>{daily.experience.currentXp}/{daily.experience.nextLevelXp} EXP</b><small>{daily.summary.completed}/{daily.summary.total} selesai hari ini</small></header><i><em style={{width:`${daily.experience.percentage}%`}}/></i><small>{daily.experience.totalXp} total langkah tercatat</small></div></div></header><div className="app-tabs amalan-tabs">{[['today','Hari Ini'],['challenges','Tantangan 30 Hari'],['mine','Amalan Saya'],['explore','Jelajahi'],['history','Riwayat']].map(([id,label])=><button key={id} className={view===id?'active':''} onClick={()=>setView(id as typeof view)}>{label}</button>)}</div>
  {view==='today'&&<><div className="amalan-origin-legend"><span><i className="personal"/> Pribadi</span><span><i className="circle"/> Amalan Circle</span><small>Satu amalan yang sama hanya tampil sekali.</small></div><div className="app-filters">{['SEMUA','PAGI','SIANG','SORE','MALAM'].map(x=><button key={x} className={period===x?'active':''} onClick={()=>setPeriod(x)}>{x[0]+x.slice(1).toLowerCase()}</button>)}</div>{pendingItems.length + completedItems.length ? <section className="amalan-list enhanced-list">{pendingItems.map(renderEntry)}{completedItems.length > 0 && <div className={`amalan-completed-divider ${pendingItems.length === 0 ? 'all-done' : ''}`} key="__completed_divider__"><span>{pendingItems.length === 0 ? '✓ Semua Amalan Hari Ini Selesai' : `Amalan Selesai (${completedItems.length})`}</span></div>}{completedItems.map(renderEntry)}</section> : <div className="empty-panel"><b>Belum ada amalan aktif</b><p>Pilih amalan pribadi atau bergabung ke Circle agar muncul di sini.</p><button onClick={()=>setView('explore')}>Jelajahi Amalan</button></div>}</>}
  {view==='challenges'&&<PersonalChallenges challenges={challenges} act={act} reload={reload}/>}
  {view==='mine'&&<section className="manage-amalan"><div className="subhead"><h2>Amalan yang kamu jaga</h2><p>Kelola target, nonaktifkan amalan katalog, atau hapus amalan pribadi.</p></div>{catalog.filter(x=>x.active).length===0?<div className="empty-panel"><b>Tidak ada amalan aktif</b><p>Semua amalan sedang dinonaktifkan atau belum dipilih. Tambahkan dari katalog atau aktifkan amalan di bawah.</p><button type="button" onClick={()=>setView('explore')}>Jelajahi Katalog</button></div>:<div className="manage-amalan-grid">{catalog.filter(x=>x.active).map(item=><article key={item.key} className="manage-card"><div className="manage-card-head"><span className="manage-badge category">{item.category}</span>{item.isCustom?<span className="manage-badge custom">✦ Pribadi</span>:<span className="manage-badge period">{item.period.toLowerCase()}</span>}</div><div className="manage-card-body"><b className="manage-card-title">{item.title}</b>{item.note?<p className="manage-card-note">{item.note}</p>:<p className="manage-card-note empty">Amalan aktif dalam rutinitas harianmu.</p>}</div><div className="manage-card-footer"><div className="manage-target-control"><span className="target-label">Target</span><div className="target-input-box">{item.id&&<input aria-label={`Target ${item.title}`} type="number" min="1" max="10000" defaultValue={item.target} onBlur={e=>void act(`target-${item.key}`,()=>apiFetch(`/amalan/${item.id}/target`,{method:'PATCH',body:JSON.stringify({target:Number(e.target.value)})}),'Target diperbarui.')}/>}<span className="target-unit">{item.unit??'kali'}</span></div></div><div className="manage-card-actions">{item.isCustom&&item.id?<button type="button" className="danger-btn" onClick={()=>void deleteAmalan(item.id!,item.title)}>Hapus</button>:<button type="button" className="deactivate-btn" disabled={busy===`amalan-${item.key}`} onClick={()=>void toggleActive(item,false)}>Nonaktifkan</button>}</div></div></article>)}</div>}{catalog.filter(x=>!x.active&&!x.isCustom).length>0&&<div className="deactivated-amalan-section"><div className="subhead subhead-secondary"><h3>Amalan yang Dinonaktifkan ({catalog.filter(x=>!x.active&&!x.isCustom).length})</h3><p>Amalan yang sementara kamu istirahatkan dari rutinitas harian. Klik untuk mengaktifkan kembali.</p></div><div className="deactivated-amalan-grid">{catalog.filter(x=>!x.active&&!x.isCustom).map(item=><article key={item.key} className="deactivated-grid-card"><div className="deactivated-card-head"><span className="manage-badge category">{item.category}</span><span className="manage-badge period">{item.period.toLowerCase()}</span></div><div className="deactivated-card-body"><b>{item.title}</b><small>Target: {item.target} {item.unit??'kali'}</small></div><button type="button" className="reactivate-btn" disabled={busy===`amalan-${item.key}`} onClick={()=>void toggleActive(item,true)}>＋ Aktifkan Kembali</button></article>)}</div></div>}</section>}
  {view==='explore'&&<><form className="custom-amalan custom-amalan-first" onSubmit={addCustom}><div><span>AMALAN PRIBADI</span><h2>Tambahkan langkahmu sendiri</h2><p>Catatan custom tidak diberi klaim sumber agama oleh aplikasi.</p></div><label>Nama<input name="title" required minLength={2} maxLength={100}/></label><label>Catatan<input name="note" maxLength={240}/></label><label>Waktu<select name="period"><option value="PAGI">Pagi</option><option value="SIANG">Siang</option><option value="SORE">Sore</option><option value="MALAM">Malam</option></select></label><label>Jenis<select name="kind"><option value="CHECKLIST">Checklist</option><option value="COUNTER">Hitungan</option><option value="DURATION">Durasi</option></select></label><label>Target<input name="target" type="number" min="1" defaultValue="1"/></label><label>Satuan<input name="unit" maxLength={24} placeholder="kali / menit"/></label><button>Tambah ke Amalan Saya →</button></form>{catalog.some(x=>x.isCustom)&&<section className="custom-created-section"><div className="custom-created-head"><div><span>AMALAN PRIBADI TERSIMPAN</span><h3>Daftar Amalan Pribadi Buatanmu ({catalog.filter(x=>x.isCustom).length})</h3></div><p>Amalan custom yang kamu buat. Hapus di sini kapan pun agar daftar harian tetap bersih dan rapi.</p></div><div className="custom-created-list">{catalog.filter(x=>x.isCustom).map(item=><article key={item.key} className="custom-created-row"><div className="custom-row-main"><div className="custom-row-title-bar"><span className="custom-row-icon">✦</span><b className="custom-row-title">{item.title}</b><span className="custom-period-chip">{item.period.toLowerCase()}</span><span className="custom-target-chip">Target: {item.target} {item.unit??'kali'}</span></div>{item.note&&<p className="custom-row-note">{item.note}</p>}</div><div className="custom-row-actions">{item.id&&<button type="button" className="custom-row-delete-btn" title={`Hapus ${item.title}`} onClick={()=>void deleteAmalan(item.id!,item.title)}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg> Hapus</button>}</div></article>)}</div></section>}<section className="catalog-section"><div className="catalog-section-head"><div><span>KATALOG AMALAN</span><h3>Pilihan Amalan yang Tersedia ({catalog.filter(x=>!x.active).length})</h3></div>{catalog.filter(x=>!x.active&&!x.isCustom).length>0&&<button type="button" className="activate-all-catalog-btn" disabled={busy==='activate-all-catalog'} onClick={activateAllCatalog}>✓ Aktifkan Semua ({catalog.filter(x=>!x.active&&!x.isCustom).length})</button>}<p>Amalan yang diajarkan dalam sunnah dan rutinitas penunjang ibadah. Tambahkan ke harimu.</p></div>{catalog.filter(x=>!x.active).length>0?<div className="catalog-grid">{catalog.filter(x=>!x.active).map(item=><article key={item.key} className="catalog-card"><div className="catalog-card-top"><span className="catalog-category-tag">{item.category}</span><span className="catalog-period-tag">{item.period.toLowerCase()}</span></div><h3>{item.title}</h3><p>{item.note}</p>{item.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noreferrer" className="catalog-source-link">{item.sourceLabel} ↗</a>}<button type="button" className="catalog-add-btn" disabled={busy===`amalan-${item.key}`} onClick={()=>void toggleActive(item,true)}>{item.id?'＋ Aktifkan Kembali':'＋ Tambahkan'}</button></article>)}</div>:<div className="catalog-all-active"><span className="catalog-all-active-icon">✓</span><b>Semua amalan katalog sudah aktif di rutinitasmu</b><p>Kamu sudah mengaktifkan semua amalan dari katalog. Kamu bisa memantau dan mengaturnya di tab Amalan Saya.</p><button type="button" onClick={()=>setView('mine')}>Buka Amalan Saya →</button></div>}</section></>}
  {view==='history'&&<section className="history-list"><div className="subhead"><h2>30 hari terakhir</h2><p>Detail riwayat hanya terlihat olehmu secara default.</p></div>{history.length?history.map(day=><article key={day.date}><button onClick={()=>setExpanded(expanded===day.date?'':day.date)}><time>{new Date(`${day.date}T00:00:00`).toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'})}</time><span><i style={{width:`${day.percentage}%`}}/></span><b>{day.percentage}%</b></button>{expanded===day.date&&<div>{day.entries.map(entry=><p key={entry.id}><i>{entry.completed?'✓':entry.status==='SKIPPED'?'—':'○'}</i>{entry.title}</p>)}</div>}</article>):<div className="empty-panel"><b>Riwayat belum terbentuk</b><p>Aktivitas yang kamu catat akan muncul di sini.</p></div>}</section>}
  {detail&&<div className="detail-modal" onClick={()=>setDetail(null)}><section onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setDetail(null)}>×</button><span>TENTANG AMALAN</span><h2>{detail.title}</h2><p>{detail.note}</p><dl><div><dt>Waktu</dt><dd>{detail.period.toLowerCase()}</dd></div><div><dt>Targetmu</dt><dd>{detail.target} {detail.unit??'kali'}</dd></div></dl>{detail.sourceUrl?<a href={detail.sourceUrl} target="_blank" rel="noreferrer">Periksa sumber: {detail.sourceLabel} ↗</a>:<small>Ini adalah amalan pribadi yang kamu buat sendiri.</small>}<div className="source-warning">Penjelasan ringkas bukan fatwa. Periksa sumber dan tanyakan kepada ahli ilmu untuk keadaan khusus atau perbedaan pendapat.</div>{detail.amalanId&&detail.isPersonal&&!detail.sourceUrl&&<div className="modal-delete-wrap"><button type="button" className="delete-custom-amalan-btn" onClick={()=>void deleteAmalan(detail.amalanId!,detail.title)}>🗑 Hapus Amalan Pribadi Ini</button></div>}</section></div>}</div>;
}
