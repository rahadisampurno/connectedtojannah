'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiFetch } from '../lib/api';
import { UserAvatar } from './user-avatar';
import { useConfirm } from './confirm-dialog';

type Circle={id:string;name:string;type:string;members:number;role:string;icon:string;message:string};
export type Challenge={id:string;title:string;description:string;current:number;target:number;unit:string;joined:boolean;status:string;icon:string;sourceLabel:string;sourceUrl:string};
type Overview={circles:Circle[];challenges:Challenge[]};
type Member={id:string;display_name:string;avatar:string;role:string;status:string;joinedAt:string};
type CircleAmalan={key:string;title:string;category:string;period:string;sourceLabel:string;sourceUrl:string;completedMembers:number;activeMembers:number;isCustom?:boolean;target?:number;unit?:string};
type AmalanOption={key:string;title:string;category:string;period:string;sourceLabel:string;sourceUrl:string};
type CustomAmalanDraft={title:string;note:string;period:string;kind:string;target:number;unit:string};
type ActivityItem={id:string;event_type?:string;message:string;createdAt:string;display_name?:string;avatar?:string};
type DailyContributor={id:string;display_name:string;avatar:string;contributions:number;target:number;progressPercent:number;rank:number};
type DailyProgress={date:string;total:number;members:DailyContributor[]};
type Detail={id:string;name:string;type:string;owner_id:string;role:string;members:Member[];circleAmalan:CircleAmalan[];activity:ActivityItem[];dailyProgress:DailyProgress;sharedJourney:{activeMembers:number;activeDays:number;contributions:number}};
type CircleChallenge=(Challenge&{contributions:number;startedAt:string})|null;
type Act=(label:string,task:()=>Promise<unknown>,message:string)=>Promise<void>;

const encouragements=[['ease','🤲 Semoga Allah mudahkan harimu.'],['continue','✨ Yuk, lanjutkan perjalanan hari ini.'],['little','🌱 Sedikit demi sedikit, tetap berarti.'],['steadfast','💙 Semoga Allah menjaga istiqamah kita.'],['goodness','🌙 Semoga hari ini penuh kebaikan.']];
const roleLabel:Record<string,string>={OWNER:'Pemilik',ADMIN:'Admin',MEMBER:'Anggota'};
const statusLabel:Record<string,string>={ACTIVE:'Aktif',PAUSED:'Dijeda',COMPLETED:'Selesai',NOT_JOINED:'Belum diikuti',PENDING:'Menunggu persetujuan'};
const typeIcon:Record<string,string>={Pribadi:'◇',Pasangan:'♡',Keluarga:'⌂',Sahabat:'♧',Kajian:'✦',Komunitas:'◉'};

function CircleModal({label,close,children}:{label:string;close:()=>void;children:ReactNode}){
  useEffect(()=>{
    const previousOverflow=document.body.style.overflow;
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')close()};
    document.body.style.overflow='hidden';
    window.addEventListener('keydown',onKeyDown);
    return()=>{document.body.style.overflow=previousOverflow;window.removeEventListener('keydown',onKeyDown)};
  },[close]);
  return createPortal(<div className="circle-modal-backdrop" role="presentation" onMouseDown={close}><div className="circle-modal-shell" role="dialog" aria-modal="true" aria-label={label} onMouseDown={event=>event.stopPropagation()}>{children}</div></div>,document.body);
}

type TogetherView = 'overview' | 'circle' | 'challenges' | 'create';
const validTogetherViews: TogetherView[] = ['overview', 'circle', 'challenges', 'create'];

function parseTogetherPath(path: string, fallbackCircle = ''): { view: TogetherView; selected: string } | null {
  const parts = path.replace(/^#\/?/, '').split('/');
  if (parts[0] === 'together') parts.shift();
  const requestedView = parts[0] as TogetherView;
  if (!validTogetherViews.includes(requestedView)) return null;
  if (requestedView === 'circle') {
    const circleId = parts[1] || fallbackCircle;
    return circleId ? { view: 'circle', selected: circleId } : { view: 'overview', selected: '' };
  }
  return { view: requestedView, selected: '' };
}

function getInitialTogether(): { view: TogetherView; selected: string } {
  if (typeof window === 'undefined') return { view: 'overview', selected: '' };
  const storedCircle = sessionStorage.getItem('ctj_together_circle_id') ?? '';
  const fromHash = parseTogetherPath(window.location.hash, storedCircle);
  if (fromHash) return fromHash;
  const storedPath = sessionStorage.getItem('ctj_together_sub') ?? '';
  const fromStorage = parseTogetherPath(storedPath, storedCircle);
  if (fromStorage) return fromStorage;
  return { view: 'overview', selected: '' };
}

export function TogetherHubV2({overview,busy,act,reload}:{overview:Overview;busy:string;act:Act;reload:()=>Promise<void>}){
  const initial = getInitialTogether();
  const [view,setViewState]=useState<TogetherView>(initial.view),[selected,setSelectedState]=useState(initial.selected);
  const refreshedOnEntry=useRef(false);

  const updateTogetherState = (v: TogetherView, circleId = '') => {
    setViewState(v);
    setSelectedState(circleId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('ctj_together_sub', v === 'circle' && circleId ? `circle/${circleId}` : v);
      if (circleId) sessionStorage.setItem('ctj_together_circle_id', circleId);
      else sessionStorage.removeItem('ctj_together_circle_id');

      const targetHash = v === 'circle' && circleId ? `#together/circle/${circleId}` : `#together/${v}`;
      if (window.location.hash !== targetHash) {
        window.history.replaceState(null, '', targetHash);
      }
    }
  };

  useEffect(() => {
    const syncHash = () => {
      if (!window.location.hash.startsWith('#together')) return;
      const restored = parseTogetherPath(window.location.hash, sessionStorage.getItem('ctj_together_circle_id') ?? '');
      if (!restored) return;
      setViewState(restored.view);
      setSelectedState(restored.selected);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(()=>{
    if(refreshedOnEntry.current)return;
    refreshedOnEntry.current=true;
    void reload();
  },[reload]);

  useEffect(()=>{
    if(view!=='circle')return;
    if(!selected||!overview.circles.some(circle=>circle.id===selected))updateTogetherState('overview');
  },[overview.circles,selected,view]);

  useEffect(()=>{window.scrollTo({top:0,behavior:'smooth'})},[view,selected]);
  const openCircle=(id:string)=>{updateTogetherState('circle', id)};
  useEffect(() => {
    if (view === 'challenges') {
      window.location.hash = '#amalan/challenges';
    }
  }, [view]);

  return <div className="app-screen together-v2">
    <header className="app-head together-top"><div><span>BERSAMA TANPA BERLOMBA</span><h1>Together</h1><p>Ruang untuk menjaga perjalanan, melihat taman bersama, dan saling menguatkan.</p></div><button className="pill-action" onClick={()=>updateTogetherState('create')}>＋ Buat Circle</button></header>
    {view==='overview'&&<TogetherOverview circles={overview.circles} openCircle={openCircle} create={()=>updateTogetherState('create')}/>} 
    {view==='circle'&&selected&&<CircleSpace circleId={selected} overview={overview} act={act} reload={reload} back={()=>updateTogetherState('overview')}/>} 
    {view==='create'&&<CreateCircle busy={busy} act={act} done={async()=>{await reload();updateTogetherState('overview')}}/>}
  </div>;
}

function TogetherOverview({circles,openCircle,create}:{circles:Circle[];openCircle:(id:string)=>void;create:()=>void}){
  return <div className="together-overview">
    <section className="together-welcome"><div><span>MULAI DARI SINI</span><h2>Perjalanan terasa lebih ringan ketika dijaga bersama.</h2><p>Pilih Circle untuk melihat kabar hari ini, mengundang orang terdekat, atau menumbuhkan perjalanan bersama—dengan progress yang menyemangati tanpa menilai kualitas ibadah.</p><div><button onClick={circles.length?()=>openCircle(circles[0].id):create}>{circles.length?'Buka Circle terdekat':'Buat Circle pertama'} →</button><small>Privasi setiap anggota tetap menjadi batas utama.</small></div></div><div className="together-orbit" aria-hidden="true"><i>✦</i><b>♧</b><span>⌂</span></div></section>
    {circles.length?<><div className="together-section-title"><div><span>CIRCLE SAYA</span><h2>Pilih ruang yang ingin kamu buka</h2></div><small>{circles.length} Circle aktif</small></div><section className="circle-card-grid">{circles.map((circle,index)=><button key={circle.id} className={`circle-identity tone-${index%4}`} onClick={()=>openCircle(circle.id)}><i>{typeIcon[circle.type]??circle.icon}</i><span><small>{circle.type} · {roleLabel[circle.role]??circle.role}</small><b>{circle.name}</b><em>{circle.members} anggota · Buka perjalanan</em></span><strong>→</strong></button>)}</section><section className="together-next"><i>✦</i><div><span>LANGKAH BERIKUTNYA</span><h3>{circles.some(c=>c.members===1)?'Ajak seseorang ke Circle-mu':'Lihat kabar Circle hari ini'}</h3><p>{circles.some(c=>c.members===1)?'Circle dengan satu anggota akan terasa lebih bermakna setelah orang terdekatmu bergabung.':'Lihat perjalanan bersama atau kirim semangat tanpa membandingkan aktivitas individu.'}</p></div><button onClick={()=>openCircle((circles.find(c=>c.members===1)??circles[0]).id)}>Lanjutkan →</button></section></>:<section className="together-empty"><i>♧</i><h2>Belum ada Circle</h2><p>Buat ruang untuk pasangan, keluarga, sahabat, kajian, atau komunitasmu.</p><button onClick={create}>Buat Circle pertama →</button><small>Sudah mendapat tautan? Buka tautan undangan untuk bergabung.</small></section>}
  </div>;
}

function CircleSpace({circleId,overview,act,reload,back}:{circleId:string;overview:Overview;act:Act;reload:()=>Promise<void>;back:()=>void}){
  const [detail,setDetail]=useState<Detail|null>(null),[challenge,setChallenge]=useState<CircleChallenge>(null),[catalog,setCatalog]=useState<AmalanOption[]>([]),[tab,setTab]=useState<'home'|'journey'|'activity'|'members'>('home'),[activityFocusDate,setActivityFocusDate]=useState(''),[inviteOpen,setInviteOpen]=useState(false),[manageOpen,setManageOpen]=useState(false),[dbMilestones,setDbMilestones]=useState<{level:number;title:string;desc:string;reflection:string}[]>([]),[dbEncouragements,setDbEncouragements]=useState<[string,string][]>([]),[loadError,setLoadError]=useState('');
  const load=async()=>{setLoadError('');try{const[d,c,a,m,e]=await Promise.all([apiFetch<Detail>(`/circles/${circleId}`),apiFetch<{challenge:CircleChallenge}>(`/circles/${circleId}/challenge`),apiFetch<AmalanOption[]>('/amalan/catalog'),apiFetch<{level:number;title:string;desc:string;reflection:string}[]>('/circles/milestones').catch(()=>[]),apiFetch<{key:string;message:string}[]>('/encouragements').catch(()=>[])]);setDetail(d);setChallenge(c.challenge);setCatalog(a);if(m?.length)setDbMilestones(m);if(e?.length)setDbEncouragements(e.map(item=>[item.key,item.message]))}catch(cause){setLoadError(cause instanceof Error?cause.message:'Circle belum dapat dimuat.')}};
  useEffect(()=>{void load()},[circleId]);
  if(!detail)return loadError?<div className="together-load-error"><i>☁</i><h2>Circle belum dapat dibuka</h2><p>{loadError}</p><div><button onClick={()=>void load()}>Coba lagi</button><button className="quiet" onClick={back}>Kembali ke daftar Circle</button></div></div>:<div className="together-loading">✦ Menyiapkan Circle…</div>;
  const activeMembers=detail.members.filter(member=>member.status==='ACTIVE').length,pending=detail.members.filter(member=>member.status==='PENDING').length;
  return <div className="circle-space-v2">
    <button className="circle-back" onClick={back}>← Semua Circle</button>
    {loadError&&<div className="circle-inline-error" role="status">Data terbaru belum dapat dimuat. <button onClick={()=>void load()}>Coba lagi</button></div>}
    <header className={`circle-banner circle-tone-${circleId.charCodeAt(0)%4}`}><div className="circle-symbol">{typeIcon[detail.type]??'♧'}</div><div><span>{detail.type.toUpperCase()}</span><h2>{detail.name}</h2><p>{activeMembers} anggota aktif{pending?` · ${pending} menunggu persetujuan`:''}</p></div><div className="circle-header-actions"><button onClick={()=>{setInviteOpen(true);setTab('home')}}>＋ Undang anggota</button><button aria-label="Pengaturan Circle" className={manageOpen?'active':''} onClick={()=>setManageOpen(!manageOpen)}>•••</button></div></header>
    <nav className="circle-tabs-v2"><button className={tab==='home'?'active':''} onClick={()=>setTab('home')}>Lobby</button><button className={tab==='journey'?'active':''} onClick={()=>setTab('journey')}>Perjalanan</button><button className={tab==='activity'?'active':''} onClick={()=>{setActivityFocusDate('');setTab('activity')}}>Aktivitas</button><button className={tab==='members'?'active':''} onClick={()=>setTab('members')}>Kelola Anggota</button></nav>
    {inviteOpen&&<CircleModal label="Undang anggota" close={()=>setInviteOpen(false)}><InvitePanel circleId={circleId} close={()=>setInviteOpen(false)} act={act}/></CircleModal>}
    {manageOpen&&<CircleModal label="Pengaturan Circle" close={()=>setManageOpen(false)}><CircleManagement detail={detail} circleId={circleId} catalog={catalog} act={act} refresh={async()=>{await reload();await load()}} close={()=>setManageOpen(false)} archived={back}/></CircleModal>} 
    {tab==='home'&&<CircleHome detail={detail} circleId={circleId} challenge={challenge} catalog={overview.challenges} encouragementsList={dbEncouragements} act={act} refresh={load} openInvite={()=>setInviteOpen(true)} openMembers={()=>setTab('members')} openActivity={date=>{setActivityFocusDate(date);setTab('activity')}} openSettings={()=>setManageOpen(true)}/>} 
    {tab==='journey'&&<CollectiveJourney detail={detail} challenge={challenge} customMilestones={dbMilestones}/>} 
    {tab==='activity'&&<CircleActivity detail={detail} focusDate={activityFocusDate}/>} 
    {tab==='members'&&<Members detail={detail} circleId={circleId} act={act} refresh={load} invite={()=>{setInviteOpen(true);setTab('home')}}/>}
  </div>;
}

function CircleHome({detail,circleId,challenge,catalog,encouragementsList,act,refresh,openInvite,openMembers,openActivity,openSettings}:{detail:Detail;circleId:string;challenge:CircleChallenge;catalog:Challenge[];encouragementsList:[string,string][];act:Act;refresh:()=>Promise<void>;openInvite:()=>void;openMembers:()=>void;openActivity:(date:string)=>void;openSettings:()=>void}){
  const encouragementItems = encouragementsList.length ? encouragementsList : encouragements;
  const [message,setMessage]=useState(()=>encouragementItems[0]?.[0]??'continue'),[challengeId,setChallengeId]=useState(catalog[0]?.id??'');
  const circleAmalan=detail.circleAmalan??[],active=detail.members.filter(member=>member.status==='ACTIVE').length,canManage=detail.role==='OWNER'||detail.role==='ADMIN',expPerLevel=20,exp=detail.sharedJourney.contributions,level=Math.floor(exp/expPerLevel)+1,levelExp=exp%expPerLevel,expPercent=Math.round(levelExp/expPerLevel*100);
  return <div className="circle-home-v2">
    <section className="circle-lobby"><header><div><span>LOBBY CIRCLE</span><h3>Tim yang berjalan bersamamu</h3><p>{active} anggota aktif · progress harian menunjukkan kontribusi, bukan nilai amal.</p></div><button onClick={openMembers}>Kelola anggota →</button></header><TeamCarousel members={detail.members.filter(member=>member.status==='ACTIVE')} invite={openInvite}/></section>
    <section className="circle-exp"><div className="circle-level"><small>LEVEL CIRCLE</small><strong>{level}</strong></div><div className="circle-exp-main"><header><div><span>PROGRESS BERSAMA</span><h3>Cahaya kebersamaan</h3></div><b>{levelExp}/{expPerLevel} EXP</b></header><div className="circle-exp-bar" role="progressbar" aria-label="EXP Circle" aria-valuemin={0} aria-valuemax={expPerLevel} aria-valuenow={levelExp}><i style={{width:`${expPercent}%`}}/><em>✦</em></div><p>Setiap amalan Circle yang selesai menambah satu EXP kolektif. Tidak ada pengurangan saat anggota beristirahat.</p></div><div className="circle-exp-stat"><b>{exp}</b><small>Total kontribusi</small></div></section>
    <DailyTopThree progress={detail.dailyProgress} openActivity={openActivity}/>
    <section className="circle-amalan-summary"><header><div><span>AMALAN CIRCLE</span><h3>Fokus yang dipilih ketua</h3><p>Progress ditampilkan sebagai dukungan bersama; identitas mengikuti pengaturan privasi setiap anggota.</p></div>{detail.role==='OWNER'&&<button onClick={openSettings}>{circleAmalan.length?'Atur amalan':'Pilih amalan'} →</button>}</header>{circleAmalan.length?<div>{circleAmalan.map(item=><article key={item.key}><i>{item.period==='PAGI'?'☀':item.period==='MALAM'?'☾':'✦'}</i><span><b>{item.title}{item.isCustom&&<em>CUSTOM</em>}</b><small>{item.category} · {item.completedMembers}/{item.activeMembers} anggota hari ini</small></span>{item.sourceUrl&&<a href={item.sourceUrl} target="_blank" rel="noreferrer" title={item.sourceLabel}>↗</a>}</article>)}</div>:<p className="quiet-copy">Ketua belum memilih amalan untuk Circle ini.</p>}</section>
    <div className="circle-home-grid"><section className="circle-challenge-card"><span>TANTANGAN BERSAMA</span>{challenge?<><h3>{challenge.title}</h3><p>{challenge.description}</p><div className="circle-progress"><i style={{width:`${Math.round(challenge.current/challenge.target*100)}%`}}/></div><small>{challenge.current}/{challenge.target} hari aktif bersama · {challenge.contributions} kontribusi</small></>:<>{canManage?<><h3>Pilih satu fokus bersama</h3><p>Hari terlewat tidak menghapus perkembangan yang sudah tercatat.</p><select value={challengeId} onChange={event=>setChallengeId(event.target.value)}>{catalog.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select><button onClick={async()=>{await act(`circle-challenge-${circleId}`,()=>apiFetch(`/circles/${circleId}/challenge`,{method:'POST',body:JSON.stringify({challengeId})}),'Tantangan bersama dimulai.');await refresh()}}>Mulai bersama →</button></>:<><h3>Belum ada tantangan aktif</h3><p>Pemilik atau Admin dapat memilih fokus bersama.</p></>}</>}</section><section className="encouragement-v2"><span>SALING MENGUATKAN</span><h3>Kirim semangat</h3><p>Pesan lembut tanpa chat bebas dan tanpa melihat detail amalan anggota.</p><select value={message} onChange={event=>setMessage(event.target.value)}>{encouragementItems.map(([id,text])=><option key={id} value={id}>{text}</option>)}</select><button onClick={()=>act(`encourage-${circleId}`,()=>apiFetch(`/circles/${circleId}/encouragements`,{method:'POST',body:JSON.stringify({key:message})}),'Semangat dibagikan.')}>Kirim semangat</button></section></div>
  </div>;
}

function DailyTopThree({progress,openActivity}:{progress:DailyProgress;openActivity:(date:string)=>void}){
  const members=progress?.members??[];
  return <section className="daily-top-card">
    <header><div><span>PROGRESS HARI INI</span><h3>Top 3 kontribusi hari ini</h3><p>Ringkasan amalan Circle yang tercatat hari ini, bukan penilaian kualitas ibadah.</p></div><button onClick={()=>openActivity(progress.date)}>Lihat detail →</button></header>
    {members.length?<div className="daily-top-grid">{members.map(member=><article key={member.id} className={`daily-leader rank-${member.rank}`}><div className="daily-rank"><small>POSISI</small><b>{member.rank}</b></div><UserAvatar avatar={member.avatar} name={member.display_name}/><div className="daily-leader-info"><b>{member.display_name}</b><span>{member.contributions}/{member.target} amalan Circle</span><div role="progressbar" aria-label={`Progress harian ${member.display_name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={member.progressPercent}><i style={{width:`${member.progressPercent}%`}}/></div></div></article>)}</div>:<div className="daily-top-empty"><i>✦</i><div><b>Belum ada kontribusi hari ini</b><p>Progress akan muncul setelah anggota menyelesaikan amalan Circle.</p></div></div>}
  </section>;
}

function TeamCarousel({members,invite}:{members:Member[];invite:()=>void}){const track=useRef<HTMLDivElement>(null),move=(direction:number)=>track.current?.scrollBy({left:direction* Math.max(260,track.current.clientWidth*.75),behavior:'smooth'});return <div className="team-carousel"><button className="carousel-arrow prev" onClick={()=>move(-1)} aria-label="Anggota sebelumnya">‹</button><div className="lobby-roster" ref={track}>{members.map(member=><article key={member.id}><UserAvatar avatar={member.avatar} name={member.display_name}/><b>{member.display_name}</b><small>{roleLabel[member.role]??member.role}</small>{member.role==='OWNER'&&<em>KETUA</em>}</article>)}<button className="lobby-invite" onClick={invite}><i>＋</i><b>Undang</b><small>Tambah anggota</small></button></div><button className="carousel-arrow next" onClick={()=>move(1)} aria-label="Anggota berikutnya">›</button></div>}

function InvitePanel({circleId,close,act}:{circleId:string;close:()=>void;act:Act}){
  const[mode,setMode]=useState<'PRIVATE'|'COMMUNITY'>('PRIVATE'),[url,setUrl]=useState(''),[copied,setCopied]=useState(false);
  const copy=async()=>{if(!url)return;await navigator.clipboard.writeText(url);setCopied(true);await act('copy-invite',async()=>{},'Tautan undangan berhasil disalin!');setTimeout(()=>setCopied(false),2500)};
  return <section className="invite-panel-v2" id="circle-invite">
    <button className="panel-close" onClick={close}>×</button>
    <span>UNDANG ANGGOTA</span>
    <h3>Pilih jenis tautan yang aman</h3>
    <div className="invite-choice">
      <button className={mode==='PRIVATE'?'active':''} onClick={()=>setMode('PRIVATE')}><b>Pribadi</b><small>Sekali pakai untuk orang terdekat</small></button>
      <button className={mode==='COMMUNITY'?'active':''} onClick={()=>setMode('COMMUNITY')}><b>Komunitas</b><small>Multi-use dengan persetujuan Admin</small></button>
    </div>
    {url?<div className="invite-result"><span>{url}</span><button onClick={copy}>{copied?'Tersalin ✓':'Salin Tautan'}</button></div>:<button className="primary-wide" onClick={async()=>{await act('create-invite',async()=>{const result=await apiFetch<{inviteUrl:string}>(`/circles/${circleId}/invites`,{method:'POST',body:JSON.stringify({mode,maxUses:mode==='PRIVATE'?1:50,expiresInDays:mode==='PRIVATE'?3:7,approvalRequired:mode==='COMMUNITY'})});setUrl(result.inviteUrl)},`Tautan undangan ${mode==='PRIVATE'?'pribadi':'komunitas'} berhasil dibuat.`)}}>Buat tautan {mode==='PRIVATE'?'pribadi':'komunitas'} →</button>}
    <small>Tautan pribadi berlaku 72 jam sekali pakai. Tautan komunitas memerlukan persetujuan pengelola.</small>
  </section>;
}

const collectiveMilestones=[
  {level:1,title:'Lentera Istiqamah',desc:'Cahaya kebersamaan pertama menyala di taman Circle.',reflection:'Satu langkah kecil dapat menjadi awal perjalanan yang panjang.'},
  {level:2,title:'Mata Air Kesejukan',desc:'Mata air jernih hadir sebagai tanda langkah yang terus dijaga.',reflection:'Kebaikan yang dirawat bersama menghadirkan ketenangan.'},
  {level:3,title:'Gerbang Bunga',desc:'Gerbang bunga membuka kawasan baru di taman bersama.',reflection:'Setiap kontribusi membuat ruang bersama semakin hidup.'},
  {level:4,title:'Pohon Lentera',desc:'Pohon rindang bertabur cahaya menjadi tempat bernaung anggota Circle.',reflection:'Kebersamaan menguatkan tanpa perlu membandingkan.'},
  {level:5,title:'Paviliun Biru',desc:'Paviliun pertama berdiri sebagai pusat taman yang bertumbuh.',reflection:'Konsistensi kolektif melahirkan sesuatu yang indah.'},
  {level:7,title:'Jembatan Bulan',desc:'Jembatan bercahaya menghubungkan dua sisi taman Circle.',reflection:'Setiap anggota mengambil bagian dalam perjalanan yang sama.'},
  {level:10,title:'Observatorium Bintang',desc:'Menara pengamatan membuka langit malam yang penuh cahaya.',reflection:'Tetaplah melihat tujuan dengan harapan dan kerendahan hati.'},
  {level:15,title:'Gerbang Cahaya Emas',desc:'Gerbang utama taman terbuka dengan pancaran cahaya hangat.',reflection:'Capaian ini lahir dari banyak langkah yang dilakukan bersama.'},
  {level:20,title:'Perpustakaan Hikmah',desc:'Ruang ilmu dan perenungan melengkapi taman Circle.',reflection:'Ilmu yang bermanfaat menuntun amal agar semakin baik.'},
  {level:30,title:'Taman Agung Bercahaya',desc:'Seluruh kawasan utama taman bersinar sebagai pencapaian tertinggi saat ini.',reflection:'Syukuri perjalanan bersama dan teruslah bertumbuh dengan lembut.'},
];

type WorldHotspot={level:number;x:number;y:number;rx:number;ry:number};
const worldHotspotLayouts:Record<number,WorldHotspot[]>={
  1:[{level:1,x:52,y:28,rx:5,ry:11}],
  2:[{level:1,x:52,y:28,rx:5,ry:11},{level:2,x:81,y:82,rx:10,ry:10}],
  3:[{level:1,x:52,y:28,rx:5,ry:11},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:69,y:41,rx:8,ry:13}],
  4:[{level:1,x:65,y:65,rx:4,ry:9},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:70,y:42,rx:8,ry:13},{level:4,x:86,y:39,rx:10,ry:15}],
  5:[{level:1,x:52,y:28,rx:5,ry:11},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:70,y:41,rx:8,ry:13},{level:4,x:81,y:41,rx:9,ry:14},{level:5,x:92,y:37,rx:8,ry:15}],
  7:[{level:1,x:65,y:67,rx:4,ry:9},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:68,y:41,rx:8,ry:13},{level:4,x:81,y:40,rx:9,ry:14},{level:5,x:92,y:37,rx:8,ry:15},{level:7,x:38,y:57,rx:10,ry:10}],
  10:[{level:1,x:65,y:67,rx:4,ry:9},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:70,y:41,rx:8,ry:13},{level:4,x:81,y:40,rx:9,ry:14},{level:5,x:92,y:37,rx:8,ry:15},{level:7,x:38,y:57,rx:10,ry:10},{level:10,x:53,y:29,rx:8,ry:13}],
  15:[{level:1,x:62,y:77,rx:4,ry:9},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:68,y:40,rx:8,ry:13},{level:4,x:81,y:40,rx:9,ry:14},{level:5,x:92,y:57,rx:8,ry:15},{level:7,x:38,y:57,rx:10,ry:10},{level:10,x:52,y:29,rx:8,ry:13},{level:15,x:66,y:64,rx:8,ry:15}],
  20:[{level:1,x:52,y:28,rx:5,ry:11},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:70,y:41,rx:8,ry:13},{level:4,x:81,y:40,rx:9,ry:14},{level:5,x:92,y:37,rx:8,ry:15},{level:7,x:38,y:57,rx:10,ry:10},{level:10,x:53,y:45,rx:8,ry:13},{level:15,x:66,y:64,rx:8,ry:15},{level:20,x:89,y:66,rx:10,ry:16}],
  30:[{level:1,x:52,y:28,rx:5,ry:11},{level:2,x:81,y:82,rx:10,ry:10},{level:3,x:70,y:41,rx:8,ry:13},{level:4,x:81,y:40,rx:9,ry:14},{level:5,x:92,y:37,rx:8,ry:15},{level:7,x:38,y:57,rx:10,ry:10},{level:10,x:53,y:45,rx:8,ry:13},{level:15,x:66,y:64,rx:8,ry:15},{level:20,x:89,y:66,rx:10,ry:16},{level:30,x:78,y:16,rx:14,ry:16}],
};

function CollectiveJourney({detail,challenge,customMilestones}:{detail:Detail;challenge:CircleChallenge;customMilestones?:{level:number;title:string;desc:string;reflection:string}[]}){
  const milestonesList = customMilestones && customMilestones.length ? customMilestones : collectiveMilestones;
  const days=detail.sharedJourney.activeDays;
  const contributions=detail.sharedJourney.contributions;
  const expPerLevel=20, exp=contributions, level=Math.floor(exp/expPerLevel)+1, levelExp=exp%expPerLevel, expPercent=Math.round(levelExp/expPerLevel*100);
  const stage=level>=15?3:level>=5?2:1;
  const [selectedMilestone,setSelectedMilestone]=useState<number|null>(null);
  const [previewMilestone,setPreviewMilestone]=useState<number|null>(null);
  const stageNames=['Lembah Fajar','Oasis Berbunga','Paviliun Cahaya'];
  const stageDescs=[
    'Benih kebaikan bersemi di bawah fajar yang tenang. Setiap amalan Circle menyalakan lentera harapan.',
    'Bunga-bunga hikmah mekar semerbak. Lentera taman menyala hangat menyinari langkah setiap anggota.',
    'Kubah emas dan paviliun kemuliaan terbuka penuh. Jejak istiqamah bersama menaungi taman ketenangan.'
  ];
  const activeMilestone=milestonesList.find(m=>m.level===selectedMilestone);
  const activeMilestoneIndex=activeMilestone?milestonesList.findIndex(m=>m.level===activeMilestone.level):-1;
  const sceneMilestoneLevels=[1,2,3,4,5,7,10,15,20,30];
  const sceneLevel=sceneMilestoneLevels.reduce((current,milestoneLevel)=>level>=milestoneLevel?milestoneLevel:current,1);
  const sceneImage=`/images/circle-scenes/circle-scene-lv${sceneLevel}.webp`;
  const sceneHotspots=worldHotspotLayouts[sceneLevel]??[];
  const previewReward=milestonesList.find(milestone=>milestone.level===previewMilestone);
  const renderWorldHotspots=(variant:'desktop'|'mobile',preserveAspectRatio:string)=><svg className={`world-hotspots ${variant}`} viewBox="0 0 100 56.28" preserveAspectRatio={preserveAspectRatio} aria-label="Item taman Circle yang telah terbuka">
    <defs><radialGradient id={`worldItemGlow-${variant}`}><stop offset="0" stopColor="#fff7bd" stopOpacity=".72"/><stop offset=".42" stopColor="#ffd96c" stopOpacity=".2"/><stop offset="1" stopColor="#ffd96c" stopOpacity="0"/></radialGradient></defs>
    {sceneHotspots.map(hotspot=>{
      const reward=milestonesList.find(milestone=>milestone.level===hotspot.level);
      if(!reward)return null;
      const openReward=()=>setSelectedMilestone(reward.level);
      const y=hotspot.y*.5628, ry=hotspot.ry*.5628;
      return <g key={hotspot.level} className="world-hotspot" role="button" tabIndex={0} aria-label={`${reward.title}. ${reward.desc}`} onPointerEnter={()=>setPreviewMilestone(reward.level)} onPointerLeave={()=>setPreviewMilestone(null)} onFocus={()=>setPreviewMilestone(reward.level)} onBlur={()=>setPreviewMilestone(null)} onClick={openReward} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openReward();}}}>
        <ellipse className="world-hotspot-aura" cx={hotspot.x} cy={y} rx={hotspot.rx} ry={ry} fill={`url(#worldItemGlow-${variant})`}/>
        <ellipse className="world-hotspot-ring" cx={hotspot.x} cy={y} rx={hotspot.rx*.72} ry={ry*.72}/>
        <ellipse className="world-hotspot-hit" cx={hotspot.x} cy={y} rx={Math.max(hotspot.rx,7)} ry={Math.max(ry,4.2)}/>
      </g>;
    })}
  </svg>;

  return <div className="collective-journey-v2">
    <section className={`collective-world-enhanced stage-${stage}`}>
      <div className="world-bg-art" style={{backgroundImage:`url('${sceneImage}')`}} aria-hidden="true"/>
      <div className="world-overlay-gradient"/>
      <div className="world-ambient-particles" aria-hidden="true"><span className="sparkle s1">✦</span><span className="sparkle s2">✧</span><span className="sparkle s3">✦</span><span className="sparkle s4">★</span></div>
      {renderWorldHotspots('desktop','xMidYMid slice')}
      {renderWorldHotspots('mobile','xMidYMin meet')}
      {previewReward&&<aside className="world-reward-preview" role="status"><small>KOLEKSI LEVEL {previewReward.level}</small><b>{previewReward.title}</b><p>{previewReward.desc}</p><span>Klik untuk melihat detail →</span></aside>}
      <div className="world-copy-box">
        <div className="world-stage-pill"><span className="live-dot"/> TAHAP {stage} · {stageNames[stage-1]}</div>
        <h3>{stageNames[stage-1]}</h3>
        <p>{stageDescs[stage-1]}</p>
        <div className="world-live-meta">
          <span><b>{days}</b> hari aktif bersama</span>
          <span>•</span>
          <span><b>{contributions}</b> amalan selesai</span>
          <span>•</span>
          <span><b>Level {level}</b> Circle</span>
        </div>
      </div>
    </section>

    <section className="collective-exp-card">
      <div className="collective-level-badge">
        <small>LEVEL CIRCLE</small>
        <strong>{level}</strong>
      </div>
      <div className="collective-exp-track">
        <header>
          <div><b>Progress Level Circle</b><small>{levelExp} / {expPerLevel} EXP menuju Level {level+1}</small></div>
          <span className="percent-text">{expPercent}%</span>
        </header>
        <div className="exp-progress-shell" role="progressbar" aria-valuenow={expPercent} aria-valuemin={0} aria-valuemax={100}>
          <i style={{width:`${expPercent}%`}}/>
        </div>
        <small className="exp-note">Hanya amalan yang terdaftar dalam Circle ini yang menambah EXP bersama. Amalan pribadi atau circle lain terisolasi secara aman.</small>
      </div>
    </section>

    <section className="collective-roadmap-section">
      <header className="roadmap-header">
        <div><span>PENCAPAIAN LEVEL CIRCLE</span><h3>Roadmap Keindahan Taman</h3><p>Naikkan EXP Circle untuk membuka bagian taman dan koleksi visual baru.</p></div>
        <div className="roadmap-current-badge"><b>Level {level}</b><small>{exp} total EXP</small></div>
      </header>
      <div className="collective-milestones-grid">
        {milestonesList.map((milestone,index)=>{
          const isUnlocked=level>=milestone.level;
          const isNext=!isUnlocked&&milestonesList.find(item=>item.level>level)?.level===milestone.level;
          const isSelected=selectedMilestone===milestone.level;
          return <button key={milestone.level} type="button" className={`milestone-node ${isUnlocked?'unlocked':isNext?'next-target':'locked'} ${isSelected?'selected':''}`} onClick={()=>setSelectedMilestone(selectedMilestone===milestone.level?null:milestone.level)} aria-pressed={isSelected}>
            <div className="milestone-badge"><span className={`milestone-icon reward-${index}`} aria-hidden="true"/><span className="milestone-day">LV.{milestone.level}</span></div>
            <div className="milestone-info"><b>{milestone.title}</b><small>{isUnlocked?'Koleksi terbuka ✓':isNext?'Target Berikutnya':`Terbuka di Level ${milestone.level}`}</small></div>
            <span className="milestone-indicator">{isUnlocked?'★':isNext?'→':'🔒'}</span>
          </button>;
        })}
      </div>
      {activeMilestone&&<div className="milestone-detail-modal" onClick={()=>setSelectedMilestone(null)}>
        <div className="milestone-detail-box" onClick={e=>e.stopPropagation()}>
          <header><div className="detail-icon-wrap"><span className={`milestone-icon reward-${Math.max(0,activeMilestoneIndex)%10}`}/></div><div><small>REWARD LEVEL {activeMilestone.level}</small><h4>{activeMilestone.title}</h4></div><button type="button" className="close-btn" aria-label="Tutup detail reward" onClick={()=>setSelectedMilestone(null)}>×</button></header>
          <p className="detail-desc">{activeMilestone.desc}</p>
          <blockquote className="detail-reflection">“{activeMilestone.reflection}”</blockquote>
          <div className="detail-footer">
            <span className={level>=activeMilestone.level?'status-unlocked':'status-locked'}>{level>=activeMilestone.level?'✓ Sudah Menjadi Koleksi Circle':`${Math.max(0,(activeMilestone.level-1)*expPerLevel-exp)} EXP lagi untuk membukanya`}</span>
            <button type="button" onClick={()=>setSelectedMilestone(null)}>Tutup</button>
          </div>
        </div>
      </div>}
    </section>

    <section className="collective-stats">
      <article><b>{days}</b><small>Hari Aktif Bersama</small></article>
      <article><b>{contributions}</b><small>Amalan Circle Selesai</small></article>
      <article><b>{detail.sharedJourney.activeMembers}</b><small>Anggota Berpartisipasi</small></article>
    </section>

    {challenge&&<section className="journey-focus">
      <span>FOKUS BERSAMA SAAT INI</span>
      <h3>{challenge.title}</h3>
      <div className="circle-progress"><i style={{width:`${Math.round(challenge.current/challenge.target*100)}%`}}/></div>
      <p>{challenge.current}/{challenge.target} hari aktif tercapai bersama. Tidak ada peringkat individu.</p>
    </section>}
    <p className="privacy-reminder">Perkembangan taman adalah pencapaian kolektif. Rincian ibadah pribadi setiap anggota tetap terlindungi privasinya.</p>
  </div>;
}

function Members({detail,circleId,refresh,invite,act}:{detail:Detail;circleId:string;refresh:()=>Promise<void>;invite:()=>void;act:Act}){
  const manage=async(memberId:string,action:string)=>{
    const msg=action==='APPROVE'?'Anggota berhasil disetujui bergabung.':action==='REMOVE'?'Anggota dikeluarkan dari Circle.':`Peran anggota diubah menjadi ${roleLabel[action]??action}.`;
    await act(`manage-${memberId}`,()=>apiFetch(`/circles/${circleId}/members/${memberId}`,{method:'PATCH',body:JSON.stringify({action})}),msg);
    await refresh();
  };

  return <div className="members-v2">
    <header className="members-head">
      <div><span>RUANG KEANGGOTAAN</span><h3>{detail.name}</h3><p>{detail.members.length} anggota bergabung dalam perjalanan ini.</p></div>
      <button className="pill-action" onClick={invite}>＋ Undang</button>
    </header>

    <div className="members-list">
      {detail.members.map(member=><article key={member.id} className="member-item-row">
        <UserAvatar avatar={member.avatar} name={member.display_name} className="member-avatar"/>
        <div className="member-meta"><b>{member.display_name}</b><small>{roleLabel[member.role]??member.role} · {statusLabel[member.status]??member.status}</small></div>
        {detail.role==='OWNER'&&member.role!=='OWNER'&&member.status==='ACTIVE'&&<select className="role-select" value={member.role} onChange={event=>void manage(member.id,event.target.value)} aria-label="Ubah peran"><option value="MEMBER">Anggota</option><option value="ADMIN">Admin</option></select>}
        {(detail.role==='OWNER'||detail.role==='ADMIN')&&member.status==='PENDING'&&<button className="approve-btn" onClick={()=>void manage(member.id,'APPROVE')}>Setujui</button>}
        {(detail.role==='OWNER'||detail.role==='ADMIN')&&member.role!=='OWNER'&&<button className="danger-mini" onClick={()=>void manage(member.id,'REMOVE')}>Keluarkan</button>}
      </article>)}
    </div>
  </div>;
}

function jakartaDateKey(value:string){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
  const get=(type:string)=>parts.find(part=>part.type===type)?.value??'';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function activityDateLabel(date:string,today:string){
  if(date===today)return 'Hari ini';
  const todayDate=new Date(`${today}T00:00:00+07:00`),yesterday=new Date(todayDate.getTime()-86_400_000);
  if(date===jakartaDateKey(yesterday.toISOString()))return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID',{dateStyle:'full',timeZone:'Asia/Jakarta'}).format(new Date(`${date}T12:00:00+07:00`));
}

function ActivityEntry({item}:{item:ActivityItem}){
  const isAmalan=item.event_type==='AMALAN_COMPLETED'||item.message.includes('menyelesaikan');
  const isEncourage=item.event_type==='ENCOURAGEMENT'||item.message.includes('semangat');
  const isChallenge=item.event_type==='CHALLENGE'||item.message.includes('Tantangan');
  return <article className={`activity-entry ${isAmalan?'entry-amalan':isEncourage?'entry-encourage':'entry-default'}`}>
    <div className="activity-actor-avatar">{item.avatar?<UserAvatar avatar={item.avatar} name={item.display_name??''}/>:<i>{isAmalan?'✓':isEncourage?'♡':isChallenge?'▤':'✦'}</i>}</div>
    <div className="activity-content"><div className="activity-header"><span className={`activity-badge ${isAmalan?'badge-amalan':isEncourage?'badge-encourage':'badge-info'}`}>{isAmalan?'AMALAN SELESAI':isEncourage?'SEMANGAT':isChallenge?'TANTANGAN':'INFO'}</span><time>{new Date(item.createdAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})}</time></div><p className="activity-msg">{item.message}</p></div>
  </article>;
}

function CircleActivity({detail,focusDate}:{detail:Detail;focusDate:string}){
  const [filter,setFilter]=useState<'ALL'|'AMALAN'|'OTHER'>('ALL');
  const today=detail.dailyProgress?.date??jakartaDateKey(new Date().toISOString());
  const groups=useMemo(()=>{
    const filtered=(detail.activity??[]).filter(item=>filter==='ALL'||(filter==='AMALAN'?(item.event_type==='AMALAN_COMPLETED'||item.message.includes('menyelesaikan')):(item.event_type!=='AMALAN_COMPLETED'&&!item.message.includes('menyelesaikan'))));
    const grouped=new Map<string,ActivityItem[]>();
    filtered.forEach(item=>{const key=jakartaDateKey(item.createdAt);grouped.set(key,[...(grouped.get(key)??[]),item])});
    return [...grouped.entries()].sort(([left],[right])=>right.localeCompare(left));
  },[detail.activity,filter]);
  useEffect(()=>{if(!focusDate)return;window.requestAnimationFrame(()=>document.getElementById(`circle-activity-${focusDate}`)?.scrollIntoView({behavior:'smooth',block:'start'}))},[focusDate,filter]);
  return <div className="circle-activity-page">
    <header className="activity-page-head"><div><span>RIWAYAT CIRCLE</span><h3>Aktivitas per hari</h3><p>Setiap catatan dikelompokkan menurut tanggal. Identitas anggota yang memilih mode privat tetap disamarkan.</p></div><div className="activity-today-summary"><b>{detail.dailyProgress?.total??0}</b><small>kontribusi hari ini</small></div></header>
    <div className="activity-filter-bar"><button type="button" className={filter==='ALL'?'active':''} onClick={()=>setFilter('ALL')}>Semua aktivitas</button><button type="button" className={filter==='AMALAN'?'active':''} onClick={()=>setFilter('AMALAN')}>Amalan selesai ✓</button><button type="button" className={filter==='OTHER'?'active':''} onClick={()=>setFilter('OTHER')}>Semangat & info</button></div>
    {groups.length?<div className="activity-day-list">{groups.map(([date,items])=><section className="activity-day-group" id={`circle-activity-${date}`} key={date}><header><div><span>{activityDateLabel(date,today)}</span><time>{date}</time></div><b>{items.length} aktivitas</b></header><div className="activity-timeline">{items.map(item=><ActivityEntry item={item} key={item.id}/>)}</div></section>)}</div>:<div className="activity-empty-box"><i>♧</i><b>Belum ada aktivitas pada filter ini</b><p>Ketika anggota menyelesaikan amalan Circle atau berbagi semangat, catatannya akan tersusun di sini per hari.</p></div>}
  </div>;
}

function CircleManagement({detail,circleId,catalog,refresh,close,archived,act}:{detail:Detail;circleId:string;catalog:AmalanOption[];refresh:()=>Promise<void>;close:()=>void;archived:()=>void;act:Act}){
  const confirm = useConfirm();
  const hasCustom=detail.circleAmalan.some(item=>item.isCustom);
  const[nextOwner,setNextOwner]=useState(''),[selected,setSelected]=useState(()=>detail.circleAmalan.filter(item=>!item.isCustom).map(item=>item.key)),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const toggle=(key:string)=>setSelected(items=>items.includes(key)?items.filter(item=>item!==key):[...items,key]);
  return <section className="circle-management-v2"><button className="panel-close" onClick={close}>×</button><span>PENGELOLAAN CIRCLE</span><h3>Atur ruang bersama</h3><p>Owner menentukan fokus Circle. Anggota melihat target yang sama tanpa membuka rincian ibadah pribadi.</p>{detail.role==='OWNER'?<><fieldset className="circle-amalan-picker"><legend>Amalan katalog Circle · pilih hingga 12</legend>{catalog.map(item=><button type="button" key={item.key} className={selected.includes(item.key)?'active':''} onClick={()=>toggle(item.key)}><i>{selected.includes(item.key)?'✓':'○'}</i><span><b>{item.title}</b><small>{item.category} · {item.period.toLowerCase()}</small></span></button>)}</fieldset><button className="save-circle-amalan" disabled={(!selected.length&&!hasCustom)||saving} onClick={async()=>{setSaving(true);setMessage('');try{await act('update-circle-amalan',()=>apiFetch(`/circles/${circleId}/amalan`,{method:'PATCH',body:JSON.stringify({amalanKeys:selected})}),'Amalan Circle berhasil diperbarui.');await refresh();setMessage('Amalan Circle berhasil diperbarui.')}finally{setSaving(false)}}}>{saving?'Menyimpan…':'Simpan amalan Circle'}</button>{message&&<p className="circle-setting-message">✓ {message}</p>}<label>Transfer kepemilikan<select value={nextOwner} onChange={event=>setNextOwner(event.target.value)}><option value="">Pilih anggota aktif</option>{detail.members.filter(member=>member.role!=='OWNER'&&member.status==='ACTIVE').map(member=><option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label><button disabled={!nextOwner} onClick={async()=>{await act('transfer-owner',()=>apiFetch(`/circles/${circleId}/transfer`,{method:'POST',body:JSON.stringify({memberId:nextOwner})}),'Kepemilikan Circle berhasil dialihkan.');await refresh()}}>Transfer kepemilikan</button><button className="danger-setting" onClick={async()=>{const confirmed=await confirm({title:'Arsipkan Circle?',message:'Arsipkan Circle ini? Anggota tidak lagi melihatnya di daftar aktif, namun catatan amalan tetap aman tersimpan.',confirmText:'Arsipkan Circle',cancelText:'Batal',variant:'warning',mascotSpeech:'Circle yang diarsipkan dapat dipulihkan sewaktu-waktu oleh pemilik.'});if(!confirmed)return;await act('archive-circle',()=>apiFetch(`/circles/${circleId}/archive`,{method:'POST'}),'Circle berhasil diarsipkan.');await refresh();archived()}}>Arsipkan Circle</button></>:<button className="danger-setting" onClick={async()=>{const confirmed=await confirm({title:'Keluar dari Circle?',message:'Yakin ingin keluar dari Circle ini? Kamu tidak lagi menerima target bersama dari Circle ini.',confirmText:'Keluar Circle',cancelText:'Tetap Bersama',variant:'danger',mascotSpeech:'Kebaikan dan ukhuwah tetap bisa terus terhubung di mana saja.'});if(!confirmed)return;await act('leave-circle',()=>apiFetch(`/circles/${circleId}/leave`,{method:'POST'}),'Kamu telah keluar dari Circle.');await refresh();archived()}}>Keluar dari Circle</button>}</section>;
}

function CreateCircle({busy,act,done}:{busy:string;act:Act;done:()=>void}){
 const emptyDraft:CustomAmalanDraft={title:'',note:'',period:'PAGI',kind:'CHECKLIST',target:1,unit:''};
 const[catalog,setCatalog]=useState<AmalanOption[]>([]),[selected,setSelected]=useState<string[]>([]),[custom,setCustom]=useState<CustomAmalanDraft[]>([]),[draft,setDraft]=useState<CustomAmalanDraft>(emptyDraft),[customOpen,setCustomOpen]=useState(false);
 useEffect(()=>{void apiFetch<AmalanOption[]>('/amalan/catalog').then(setCatalog)},[]);
 const toggle=(key:string)=>setSelected(items=>items.includes(key)?items.filter(item=>item!==key):[...items,key]);
 const addCustom=()=>{if(draft.title.trim().length<2)return;setCustom(items=>[...items,{...draft,title:draft.title.trim(),note:draft.note.trim()}]);setDraft(emptyDraft);setCustomOpen(false)};
 return <form className="create-circle-card create-circle-v2" onSubmit={async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));await act('create-circle',()=>apiFetch('/circles',{method:'POST',body:JSON.stringify({name:data.name,type:data.type,amalanKeys:selected,customAmalan:custom})}),'Circle dibuat.');done()}}>
  <div className="create-circle-icon">♧</div><span>CIRCLE BARU</span><h2>Buat lobby perjalanan bersama</h2><p>Lengkapi identitas Circle, lalu tentukan fokus bersama dari katalog atau buat amalan custom.</p>
  <section className="create-step"><header><i>1</i><div><b>Identitas Circle</b><small>Nama yang mudah dikenali oleh anggota.</small></div></header><div className="create-circle-fields"><label>Nama Circle<input required name="name" minLength={2} maxLength={60} placeholder="Contoh: Keluarga Sampurna"/></label><label>Jenis Circle<select name="type">{['Pasangan','Keluarga','Sahabat','Kajian','Komunitas','Pribadi'].map(value=><option key={value}>{value}</option>)}</select></label></div></section>
  <section className="create-step"><header><i>2</i><div><b>Pilih amalan Circle</b><small>Pilih dari katalog yang memiliki rujukan.</small></div></header><fieldset className="circle-amalan-picker"><legend>Amalan tersedia</legend>{catalog.map(item=><button type="button" key={item.key} className={selected.includes(item.key)?'active':''} onClick={()=>toggle(item.key)}><i>{selected.includes(item.key)?'✓':'○'}</i><span><b>{item.title}</b><small>{item.category} · {item.period.toLowerCase()}</small></span></button>)}</fieldset></section>
  <section className="create-step custom-circle-step"><header><i>3</i><div><b>Custom Amalan Circle</b><small>Opsional · dicatat sebagai kesepakatan internal, bukan klaim dalil.</small></div><button type="button" onClick={()=>setCustomOpen(value=>!value)}>{customOpen?'Tutup':'＋ Buat custom'}</button></header>{customOpen&&<div className="circle-custom-form"><label>Nama amalan<input value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} minLength={2} maxLength={100} placeholder="Contoh: Membaca bersama 10 menit"/></label><label>Catatan<input value={draft.note} onChange={event=>setDraft({...draft,note:event.target.value})} maxLength={240} placeholder="Kesepakatan untuk Circle"/></label><label>Waktu<select value={draft.period} onChange={event=>setDraft({...draft,period:event.target.value})}><option value="PAGI">Pagi</option><option value="SIANG">Siang</option><option value="SORE">Sore</option><option value="MALAM">Malam</option></select></label><label>Jenis<select value={draft.kind} onChange={event=>setDraft({...draft,kind:event.target.value})}><option value="CHECKLIST">Checklist</option><option value="COUNTER">Hitungan</option><option value="DURATION">Durasi</option></select></label><label>Target<input type="number" min="1" max="10000" value={draft.target} onChange={event=>setDraft({...draft,target:Number(event.target.value)})}/></label><label>Satuan<input value={draft.unit} onChange={event=>setDraft({...draft,unit:event.target.value})} maxLength={24} placeholder="kali / menit"/></label><button type="button" disabled={draft.title.trim().length<2} onClick={addCustom}>Tambahkan custom</button></div>}{custom.length>0&&<div className="custom-circle-list">{custom.map((item,index)=><article key={`${item.title}-${index}`}><i>✦</i><span><b>{item.title}</b><small>{item.period.toLowerCase()} · {item.target} {item.unit||'kali'}</small></span><button type="button" onClick={()=>setCustom(items=>items.filter((_,itemIndex)=>itemIndex!==index))}>×</button></article>)}</div>}</section>
  <div className="create-circle-summary"><b>{selected.length+custom.length} amalan dipilih</b><small>{selected.length} dari katalog · {custom.length} custom</small></div><button disabled={busy==='create-circle'||selected.length+custom.length===0}>{busy==='create-circle'?'Membuat lobby…':'Buat Circle & buka lobby →'}</button>
 </form>
}

export function PersonalChallenges({challenges,act,reload}:{challenges:Challenge[];act:Act;reload:()=>Promise<void>}){
  const confirm = useConfirm();
  const action=async(item:Challenge,status:string)=>{
    await act(
      `challenge-${item.id}`,
      ()=>item.joined?apiFetch(`/challenges/${item.id}/status`,{method:'PATCH',body:JSON.stringify({status})}):apiFetch(`/challenges/${item.id}/join`,{method:'POST'}),
      status==='PAUSED'?'Tantangan dijeda.':status==='LEFT'?'Tantangan ditinggalkan.':'Tantangan dimulai.'
    );
    await reload();
  };

  return (
    <section className="personal-challenges-v2">
      <header>
        <span>TANTANGAN PRIBADI</span>
        <h2>Pilih fokus yang ingin kamu jaga</h2>
        <p>Tantangan ini khusus akun pribadimu untuk membangun kebiasaan istiqamah 30 hari. Tanpa rasa bersalah, hari yang terlewat tidak membatalkan kebaikan yang sudah dicatat.</p>
      </header>

      {/* Panduan Cara Pakai Tantangan Pribadi */}
      <div className="personal-challenge-guide">
        <div className="guide-badge">PANDUAN CARA PAKAI</div>
        <h4>Bagaimana Tantangan Pribadi Bekerja?</h4>
        <div className="guide-steps-grid">
          <div className="guide-step-item">
            <span className="guide-step-num">1</span>
            <div>
              <b>Pilih & Ikuti</b>
              <p>Pilih amalan yang ingin kamu biasakan, lalu klik <strong>"Ikuti"</strong>.</p>
            </div>
          </div>
          <div className="guide-step-item">
            <span className="guide-step-num">2</span>
            <div>
              <b>Jalankan di Menu Amalan</b>
              <p>Cukup centang amalan tersebut setiap hari di tab <strong>Amalan</strong> seperti biasa.</p>
            </div>
          </div>
          <div className="guide-step-item">
            <span className="guide-step-num">3</span>
            <div>
              <b>Progress Otomatis</b>
              <p>Hitungan hari bertambah otomatis. Hari yang terlewat <strong>tidak me-reset</strong> progresmu.</p>
            </div>
          </div>
          <div className="guide-step-item">
            <span className="guide-step-num">4</span>
            <div>
              <b>Jeda Kapan Saja</b>
              <p>Gunakan tombol <strong>"Jeda"</strong> jika sedang udzur/rehat, lalu <strong>"Lanjutkan"</strong> saat siap.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="challenge-app-grid">
        {challenges.map(item => {
          const percent = Math.min(100, Math.round((item.current / item.target) * 100));
          const isDone = item.status === 'COMPLETED' || item.current >= item.target;
          return (
            <article key={item.id} className={`challenge-card ${item.joined ? 'joined' : ''} ${item.status.toLowerCase()}`}>
              <i>{isDone ? '✓' : item.icon}</i>
              <div>
                <div className="challenge-status-row">
                  <small className={`challenge-badge ${item.status.toLowerCase()}`}>
                    {statusLabel[item.status] ?? item.status}
                  </small>
                  {item.joined && (
                    <span className="challenge-joined-hint">Terhubung ke amalan harianmu</span>
                  )}
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {item.sourceUrl && (
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                    {item.sourceLabel} ↗
                  </a>
                )}
                <div className="challenge-progress-box">
                  <div className="challenge-progress-bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <div className="challenge-progress-meta">
                    <span>
                      <b>{item.current}</b> / {item.target} {item.unit}
                    </span>
                    <small>{percent}% tercapai · hari terlewat tidak menghapus progress</small>
                  </div>
                </div>
              </div>

              {!item.joined ? (
                <button type="button" className="btn-challenge-join" onClick={() => void action(item, 'ACTIVE')}>
                  Ikuti Tantangan →
                </button>
              ) : item.status === 'PAUSED' ? (
                <button type="button" className="btn-challenge-resume" onClick={() => void action(item, 'ACTIVE')}>
                  ▶ Lanjutkan
                </button>
              ) : !isDone ? (
                <div className="challenge-actions">
                  <button
                    type="button"
                    className="btn-challenge-pause"
                    onClick={() => void action(item, 'PAUSED')}
                    title="Jeda sementara pengingat tantangan ini"
                  >
                    ⏸ Jeda
                  </button>
                  <button
                    type="button"
                    className="btn-challenge-leave"
                    onClick={async () => {
                      const confirmed = await confirm({
                        title: 'Keluar dari Tantangan?',
                        message: `Yakin ingin keluar dari tantangan "${item.title}"? Setiap hari kebaikan yang sudah kamu jalankan tetap bernilai dan tersimpan.`,
                        confirmText: 'Keluar Tantangan',
                        cancelText: 'Lanjut Istiqamah',
                        variant: 'warning',
                        mascotSpeech: 'Tetap semangat! Kamu selalu bisa bergabung kembali kapan pun merasa siap.',
                      });
                      if (confirmed) {
                        void action(item, 'LEFT');
                      }
                    }}
                    title="Tinggalkan tantangan ini"
                  >
                    ✕ Keluar
                  </button>
                </div>
              ) : (
                <span className="challenge-completed-pill">Alhamdulillah Selesai ✓</span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
