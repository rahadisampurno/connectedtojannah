'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError, logout, SessionUser } from '../lib/api';
import { AmalanHub } from './amalan-hub';
import { NextBestAction, PrayerTimesCard } from './home-widgets';
import { ProfileCenterV2 } from './profile-center-v2';
import { TogetherHubV2 } from './together-hub-v2';
import { UserAvatar } from './user-avatar';
import { allIslamicModules } from '../lib/islamic-content';
import { IslamicReaderScreen } from './islamic-reader-screen';
import {
  IconFajrSun,
  IconTwilightMoon,
  IconBadaSholat,
  IconSebelumTidur,
  IconTataCaraShalat,
  IconTasbihDigital,
} from './ctj-icons';

type Tab='home'|'amalan'|'together'|'journey'|'profile';
type Entry={id:string;amalanId?:string;title:string;note:string;period:string;kind:string;current:number;target:number;unit?:string;completed:boolean;status:'PENDING'|'COMPLETED'|'SKIPPED';bookmarked?:boolean;sourceLabel?:string;sourceUrl?:string;isPersonal:boolean;circles:{id:string;name:string;type:string}[]};
type Daily={entries:Entry[];summary:{completed:number;total:number;percentage:number};experience:{level:number;totalXp:number;currentXp:number;nextLevelXp:number;percentage:number};journey:{gardenStage:number;consistencyDays:number;activeDays:number;message:string}};
type Circle={id:string;name:string;type:string;members:number;role:string;progress:number;icon:string;message:string;memberNames:string[]};
type Challenge={id:string;title:string;description:string;current:number;target:number;unit:string;daysLeft:number;joined:boolean;status:string;icon:string;sourceLabel:string;sourceUrl:string};
type Overview={circles:Circle[];challenges:Challenge[];garden:{name:string;stage:number;plants:number;buildings:number;decorations:number;activeDays:number;nextMilestone:string;milestoneProgress:number;milestoneTarget:number};privacy:{visibility:string};preferences:{remindersEnabled:boolean;reducedMotion:boolean;quietStart?:string;quietEnd?:string;categories:{reminders:boolean;circles:boolean;milestones:boolean}};location:{timezone:string;language:string;name?:string;latitude?:number;longitude?:number};notifications:{id:string;title:string;message:string;read:boolean;createdAt:string}[]};
const nav:[Tab,string,string][]= [['home','⌂','Home'],['amalan','✓','Amalan'],['together','♧','Together'],['journey','◇','Journey']];
const validTabs: Tab[] = ['home', 'amalan', 'together', 'journey', 'profile'];

function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0] as Tab;
  if (validTabs.includes(hash)) return hash;
  const stored = sessionStorage.getItem('ctj_active_tab') as Tab;
  if (validTabs.includes(stored)) return stored;
  return 'home';
}

export function JourneyApp(){
  const router=useRouter();
  const [tab,setTabState]=useState<Tab>(getInitialTab);
  const [daily,setDaily]=useState<Daily|null>(null),[overview,setOverview]=useState<Overview|null>(null),[user,setUser]=useState<SessionUser|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[filter,setFilter]=useState('SEMUA'),[toast,setToast]=useState(''),[notificationsOpen,setNotificationsOpen]=useState(false),[activeEncouragement,setActiveEncouragement]=useState<{id:string;title:string;message:string}|null>(null);

  const [activeModuleId,setActiveModuleId]=useState<string|null>(()=>{
    if(typeof window==='undefined')return null;
    const parts=window.location.hash.replace(/^#\/?/,'').split('/');
    if(parts[0]==='home'&&parts[1]&&allIslamicModules[parts[1]])return parts[1];
    return null;
  });

  const setTab=(newTab:Tab)=>{
    setActiveModuleId(null);
    setTabState(newTab);
    if(typeof window!=='undefined'){
      sessionStorage.setItem('ctj_active_tab',newTab);
      const parts=window.location.hash.replace(/^#\/?/,'').split('/');
      const currentSub=parts[0]===newTab&&parts[1]?parts.slice(1).join('/'):'';
      const storedSub=sessionStorage.getItem(`ctj_${newTab}_sub`);
      const sub=currentSub||storedSub;
      const targetHash=sub?`#${newTab}/${sub}`:`#${newTab}`;
      if(window.location.hash!==targetHash){
        window.history.replaceState(null,'',targetHash);
      }
    }
  };

  const openIslamicModule=(id:string)=>{
    setActiveModuleId(id);
    if(typeof window!=='undefined'){
      window.history.replaceState(null,'',`#home/${id}`);
      window.scrollTo({top:0,behavior:'smooth'});
    }
  };

  const closeIslamicModule=()=>{
    setActiveModuleId(null);
    if(typeof window!=='undefined'&&window.location.hash.startsWith('#home/')){
      window.history.replaceState(null,'','#home');
    }
  };

  useEffect(()=>{
    const syncFromHash=()=>{
      const parts=window.location.hash.replace(/^#\/?/,'').split('/');
      const raw=parts[0] as Tab;
      if(validTabs.includes(raw)){
        setTabState(raw);
        sessionStorage.setItem('ctj_active_tab',raw);
      }
      if(parts[0]==='home'&&parts[1]&&allIslamicModules[parts[1]]){
        setActiveModuleId(parts[1]);
      } else {
        setActiveModuleId(null);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange',syncFromHash);
    return()=>window.removeEventListener('hashchange',syncFromHash);
  },[]);
  const load=async()=>{try{setError('');const me=await apiFetch<SessionUser>('/me');if(!me.onboardingCompleted){router.replace('/onboarding');return}const[d,o]=await Promise.all([apiFetch<Daily>('/daily'),apiFetch<Overview>('/overview')]);setUser(me);setDaily(d);setOverview(o);const unreadEncouragement=o.notifications.find(n=>!n.read&&n.title.includes('Semangat'));if(unreadEncouragement&&!activeEncouragement){setActiveEncouragement(unreadEncouragement)}}catch(cause){if(cause instanceof ApiError&&cause.status===401){router.replace('/login');return}setError(cause instanceof Error?cause.message:'Perjalanan belum dapat dimuat.')}};
 useEffect(()=>{void load()},[]);
 useEffect(()=>{window.scrollTo({top:0,behavior:overview?.preferences.reducedMotion?'auto':'smooth'})},[tab,activeModuleId]);
 const act=async(label:string,task:()=>Promise<unknown>,message:string)=>{try{setBusy(label);await task();setToast(message);setTimeout(()=>setToast(''),2600);await load()}catch(cause){setToast(cause instanceof Error?cause.message:'Belum berhasil. Coba kembali.')}finally{setBusy('')}};
 const dismissEncouragement=async()=>{if(!activeEncouragement)return;const encId=activeEncouragement.id;setActiveEncouragement(null);try{await apiFetch(`/notifications/${encId}/read`,{method:'POST'});setToast('Semangat hangat diterima! 💙');setTimeout(()=>setToast(''),2600);await load()}catch{/* silent */}};
 if(error&&!daily)return <AppState icon="☁" title="Perjalanan belum terbuka" text={error}><button onClick={()=>void load()}>Coba lagi</button><button className="quiet" onClick={()=>router.push('/login')}>Kembali masuk</button></AppState>;
 if(!daily||!overview||!user)return <AppState icon="✦" title="Menyiapkan perjalananmu" text="Taman, Circle, dan amalanmu sedang disiapkan…" loading/>;
   const screens={home:<Home user={user} daily={daily} overview={overview} go={setTab} openModule={openIslamicModule}/>,amalan:<AmalanHub daily={daily} challenges={overview.challenges} busy={busy} act={act} reload={load}/>,together:<TogetherHubV2 overview={overview} busy={busy} act={act} reload={load}/>,journey:<Journey daily={daily} openAmalan={()=>setTab('amalan')}/>,profile:<ProfileCenterV2 user={user} overview={overview} daily={daily} reload={load} openAmalan={()=>setTab('amalan')}/>};
  const unreadCount=overview.notifications.filter(n=>!n.read).length;
  const activeModule = activeModuleId && allIslamicModules[activeModuleId] ? allIslamicModules[activeModuleId] : null;

  return (
    <main className={`ctj-app ${overview.preferences.reducedMotion?'reduce-motion':''} ${activeModule ? 'islamic-reading-mode' : ''}`}>
      <div className="app-ambient"/>
      <AppNav tab={tab} setTab={(t)=>{ setActiveModuleId(null); setTab(t); }}/>
      <section className="app-canvas">
        <header className="ctj-topbar">
          <div className="topbar-context">
            {activeModule ? (
              <div className="topbar-module-breadcrumb">
                <button type="button" className="topbar-back-pill" onClick={closeIslamicModule} title="Kembali ke Beranda">
                  ← Beranda
                </button>
                <span className="topbar-slash">/</span>
                <span className="topbar-module-name">{activeModule.title}</span>
              </div>
            ) : (
              <span>{tab==='home'?'Beranda':tab==='amalan'?'Amalan Harian':tab==='together'?'Together Circle':tab==='journey'?'Journey World':'Profil & Pengaturan'}</span>
            )}
          </div>
          <div className="topbar-actions">
            <button type="button" className="topbar-notif-btn" onClick={()=>setNotificationsOpen(true)} aria-label={`Notifikasi, ${unreadCount} belum dibaca`} title="Notifikasi">
              <i className="notif-icon-wrap">♢{unreadCount>0&&<b className="notif-badge">{unreadCount}</b>}</i>
            </button>
            <button type="button" className={`topbar-profile-btn ${tab==='profile'?'active':''}`} onClick={()=>{ setActiveModuleId(null); setTab('profile'); }} aria-label="Buka Profil & Pengaturan" title="Profil & Pengaturan">
              <UserAvatar avatar={user.avatar} name={user.displayName} className="topbar-user-avatar"/>
              <span className="topbar-user-name">{user.displayName}</span>
            </button>
          </div>
        </header>

        {activeModule ? (
          <IslamicReaderScreen module={activeModule} onBack={closeIslamicModule}/>
        ) : (
          screens[tab]
        )}
      </section>

      {notificationsOpen&&<NotificationCenter overview={overview} close={()=>setNotificationsOpen(false)} read={(id)=>act(`notification-${id}`,()=>apiFetch(`/notifications/${id}/read`,{method:'POST'}),'Notifikasi ditandai sudah dibaca.')} readAll={()=>act('notifications-all',()=>apiFetch('/notifications/read-all',{method:'POST'}),'Semua notifikasi ditandai dibaca.')}/>}
      {activeEncouragement&&<MascotEncouragementPopup user={user} item={activeEncouragement} onDismiss={dismissEncouragement}/>}
      {toast&&<div className="app-toast" role="status"><span>✓</span>{toast}</div>}
    </main>
  );
}

function MascotEncouragementPopup({user,item,onDismiss}:{user:SessionUser;item:{id:string;title:string;message:string};onDismiss:()=>void}){
 return <div className="mascot-popup-backdrop" role="dialog" aria-modal="true" aria-label="Semangat dari Circle">
  <div className="mascot-popup-card">
   <div className="mascot-popup-halo" aria-hidden="true"/>
   <div className="mascot-popup-image-wrap">
    <Image src="/images/lea-nan-companions.webp" width={380} height={250} alt="Lea dan Nan" priority className="mascot-popup-img"/>
    <span className="mascot-sparkle">✦</span>
   </div>
   <div className="mascot-popup-content">
    <div className="mascot-tag"><i>♡</i> KABAR HANGAT DARI CIRCLE</div>
    <h2>Assalamu’alaikum, {user.displayName}! ✨</h2>
    <p className="mascot-subtext">Lea dan Nan membawakan pesan semangat dari sahabat lingkaranmu:</p>
    <div className="mascot-quote-bubble"><p>{item.message}</p></div>
    <small className="mascot-hadith-reminder">“Seorang mukmin dengan mukmin lainnya bagaikan satu bangunan yang saling menguatkan.” (HR. Bukhari & Muslim)</small>
    <button type="button" className="mascot-popup-btn" onClick={onDismiss}>Alhamdulillah, Terima Kasih! 💙</button>
   </div>
  </div>
 </div>;
}

function AppNav({tab,setTab}:{tab:Tab;setTab:(tab:Tab)=>void}){
  return (
    <nav className="ctj-nav" aria-label="Navigasi aplikasi">
      <div className="ctj-nav-brand">
        <Link href="/app" className="site-brand" aria-label="Connected to Jannah — Beranda">
          <span className="brand-lockup" aria-hidden="true">
            <span className="brand-dome-crop">
              <Image src="/images/ctj-logo.webp" width={1254} height={1254} alt="" priority />
            </span>
            <span className="brand-wordmark-crop">
              <Image src="/images/ctj-logo.webp" width={1254} height={1254} alt="" priority />
            </span>
          </span>
        </Link>
      </div>
      {nav.map(([id,icon,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><i>{icon}</i><span>{label}</span></button>)}
      <small className="nav-disclaimer">Progress bukan nilai amal.</small>
    </nav>
  );
}
function ScreenHead({eyebrow,title,text,action}:{eyebrow:string;title:string;text:string;action?:React.ReactNode}){return <header className="app-head"><div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>{action}</header>}
function Progress({value}:{value:number}){return <div className="ctj-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${value}%`}}/></div>}

function Home({user,daily,overview,go,openModule}:{user:SessionUser;daily:Daily;overview:Overview;go:(tab:Tab)=>void;openModule:(moduleId:string)=>void}){
  const challenge=overview.challenges.find(c=>c.status==='ACTIVE');
  const journeyLevel=daily.experience.level;
  const journeyStage=journeyLevel>=10?3:journeyLevel>=5?2:1;
  const journeyStageName=journeyStage===3?'Puncak Cahaya':journeyStage===2?'Teras Kesejukan':'Lembah Permulaan';
  const nextJourneyReward=personalJourneyMilestones.find(item=>item.level>journeyLevel);
  return <div className="app-screen home-dashboard">
    <ScreenHead eyebrow="ASSALAMU’ALAIKUM" title={user.displayName} text="Satu langkah baik hari ini sudah cukup untuk kembali memulai."/>
    
    {/* Hero Card */}
    <section className="home-hero">
      <div className="home-hero-bg" style={{backgroundImage:`url('/images/journey-scenes/journey-stage-${journeyStage}.webp')`}} aria-hidden="true"/>
      <div className="home-hero-overlay" aria-hidden="true"/>
      <div className="home-hero-copy">
        <span>JOURNEY HARI INI · LEVEL {journeyLevel}</span>
        <strong>{daily.summary.percentage}%</strong>
        <Progress value={daily.summary.percentage}/>
        <p>{daily.summary.completed} dari {daily.summary.total} amalan selesai</p>
        <div className="home-hero-actions"><button onClick={()=>go('amalan')}>Lanjutkan amalan <b>→</b></button><button className="journey-action" onClick={()=>go('journey')}>Lihat Journey</button></div>
      </div>
      <button className="hero-garden-label" onClick={()=>go('journey')} aria-label={`Buka Journey, ${journeyStageName}, Level ${journeyLevel}`}>
        <small>JOURNEY · TAHAP {journeyStage}</small>
        <b>{journeyStageName}</b>
        <span>{daily.experience.currentXp}/{daily.experience.nextLevelXp} EXP{nextJourneyReward?` · Berikutnya: ${nextJourneyReward.title}`:' · Koleksi utama terbuka'}</span>
        <em>Buka Journey →</em>
      </button>
    </section>

    {/* 1. Dua Kartu Dzikir Harian Utama (Pagi & Petang) */}
    <section className="home-dzikir-grid">
      <article className="dzikir-main-card pagi" onClick={()=>openModule('dzikir-pagi')} role="button" tabIndex={0}>
        <div className="dzikir-card-ambient fajar"/>
        <div className="dzikir-card-header">
          <span className="dzikir-time-chip fajar">
            <IconFajrSun size={13} color="currentColor" /> Subuh — Syuruq
          </span>
          <span className="dzikir-source-pill">Sunnah Shahih</span>
        </div>
        <div className="dzikir-card-center">
          <div className="dzikir-icon-graphic fajar">
            <IconFajrSun size={32} color="#f0d185" />
          </div>
          <h3>Dzikir Pagi</h3>
          <p>15 Bacaan perlindungan fajar hingga siang hari.</p>
        </div>
        <div className="dzikir-card-foot">
          <span className="dzikir-btn-cta">Mulai Dzikir Pagi ➔</span>
        </div>
      </article>

      <article className="dzikir-main-card petang" onClick={()=>openModule('dzikir-petang')} role="button" tabIndex={0}>
        <div className="dzikir-card-ambient senja"/>
        <div className="dzikir-card-header">
          <span className="dzikir-time-chip senja">
            <IconTwilightMoon size={13} color="currentColor" /> Ashar — Maghrib
          </span>
          <span className="dzikir-source-pill">Sunnah Shahih</span>
        </div>
        <div className="dzikir-card-center">
          <div className="dzikir-icon-graphic senja">
            <IconTwilightMoon size={32} color="#7dd3fc" />
          </div>
          <h3>Dzikir Petang</h3>
          <p>11 Bacaan benteng malam dari marabahaya.</p>
        </div>
        <div className="dzikir-card-foot">
          <span className="dzikir-btn-cta">Mulai Dzikir Petang ➔</span>
        </div>
      </article>
    </section>

    {/* 2. Menu Amalan Sunnah & Panduan Ibadah */}
    <section className="home-sunnah-section">
      <div className="sunnah-section-head">
        <div>
          <span>AMALAN SUNNAH & PANDUAN IBADAH</span>
          <h3>Dzikir & Fiqih Pilihan</h3>
        </div>
        <small>Sesuai Sunnah, Hadits & Al-Qur'an</small>
      </div>

      <div className="home-sunnah-grid">
        <button type="button" className="sunnah-menu-item" onClick={()=>openModule('bada-sholat')}>
          <div className="sunnah-icon-circle bada">
            <IconBadaSholat size={24} color="#72cec4" />
          </div>
          <div className="sunnah-item-info">
            <b>Ba'da Sholat</b>
            <small>12 Dzikir shalat fardhu</small>
          </div>
          <span className="sunnah-nav-arrow">›</span>
        </button>

        <button type="button" className="sunnah-menu-item" onClick={()=>openModule('sebelum-tidur')}>
          <div className="sunnah-icon-circle tidur">
            <IconSebelumTidur size={24} color="#c4b5fd" />
          </div>
          <div className="sunnah-item-info">
            <b>Sebelum Tidur</b>
            <small>8 Adab & doa malam</small>
          </div>
          <span className="sunnah-nav-arrow">›</span>
        </button>

        <button type="button" className="sunnah-menu-item" onClick={()=>openModule('tata-cara-shalat')}>
          <div className="sunnah-icon-circle shalat">
            <IconTataCaraShalat size={24} color="#7dd3fc" />
          </div>
          <div className="sunnah-item-info">
            <b>Tata Cara Shalat</b>
            <small>15 Sifat shalat Nabi ﷺ</small>
          </div>
          <span className="sunnah-nav-arrow">›</span>
        </button>

        <button type="button" className="sunnah-menu-item" onClick={()=>openModule('bada-sholat')}>
          <div className="sunnah-icon-circle tasbih">
            <IconTasbihDigital size={24} color="#f0d185" />
          </div>
          <div className="sunnah-item-info">
            <b>Tasbih Digital</b>
            <small>Hitung dzikir 33x / 100x</small>
          </div>
          <span className="sunnah-nav-arrow">›</span>
        </button>
      </div>
    </section>

    {/* Jadwal Shalat & Panduan Selanjutnya */}
    <section className="home-guidance">
      <NextBestAction entries={daily.entries} challenge={challenge} openAmalan={()=>go('amalan')} openJourney={()=>go('journey')}/>
      <PrayerTimesCard location={overview.location} configure={()=>go('profile')}/>
    </section>

    {/* Pesan Hari Ini & Milestone */}
    <section className="dashboard-grid">
      <article className="daily-message">
        <span>✦</span>
        <div>
          <small>PESAN HARI INI</small>
          <p>Amalan yang paling dicintai Allah adalah yang dikerjakan terus-menerus meskipun sedikit.</p>
          <cite>Sahih al-Bukhari 6464</cite>
        </div>
      </article>
      <article className="quick-card">
        <small>MILESTONE BERIKUTNYA</small>
        <b>{overview.garden.nextMilestone}</b>
        <Progress value={Math.round(overview.garden.milestoneProgress/overview.garden.milestoneTarget*100)}/>
        <span>{overview.garden.milestoneProgress}/{overview.garden.milestoneTarget} hari aktif</span>
      </article>
    </section>

    {/* Lingkaran Terdekat */}
    <div className="section-row">
      <div>
        <span>LINGKARAN TERDEKAT</span>
        <h2>Tumbuh bersama Circle</h2>
      </div>
      <button onClick={()=>go('together')}>{overview.circles.length?'Lihat semua':'Buat Circle'} →</button>
    </div>
    <div className="circle-grid">
      {overview.circles.length?overview.circles.map(c=><article key={c.id}><i>{c.icon}</i><div><b>{c.name}</b><small>{c.members} anggota · {c.message}</small></div></article>):<button className="empty-circle" onClick={()=>go('together')}><i>＋</i><span><b>Belum ada Circle</b><small>Buat ruang untuk keluarga, sahabat, atau komunitasmu.</small></span></button>}
    </div>
  </div>;
}

function Amalan({daily,filter,setFilter,busy,complete}:{daily:Daily;filter:string;setFilter:(x:string)=>void;busy:string;complete:(id:string)=>void}){const periodRank:Record<string,number>={PAGI:1,SIANG:2,SORE:3,MALAM:4};const items=useMemo(()=>daily.entries.filter(e=>filter==='SEMUA'||e.period===filter).slice().sort((a,b)=>{const aDone=a.completed||a.status==='COMPLETED'?1:0,bDone=b.completed||b.status==='COMPLETED'?1:0;if(aDone!==bDone)return aDone-bDone;const aPeriod=periodRank[a.period]??5,bPeriod=periodRank[b.period]??5;if(aPeriod!==bPeriod)return aPeriod-bPeriod;return a.title.localeCompare(b.title,'id');}),[daily,filter]);return <div className="app-screen amalan-screen"><ScreenHead eyebrow="LANGKAH KECIL HARI INI" title="Amalan Hari Ini" text="Amalan wajib dan sunnah dengan rujukan yang dapat kamu periksa." action={<div className="head-progress"><b>{daily.summary.percentage}%</b><small>{daily.summary.completed}/{daily.summary.total} selesai</small></div>}/><div className="app-filters">{['SEMUA','PAGI','SIANG','SORE','MALAM'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x[0]+x.slice(1).toLowerCase()}</button>)}</div><div className="amalan-layout"><section className="amalan-list">{items.map(e=><article key={e.id} className={e.completed?'done':''}><i>{e.completed?'✓':e.period==='PAGI'?'☀':e.period==='MALAM'?'☾':'✦'}</i><div><b>{e.title}</b><small>{e.note}{e.unit&&!e.completed?` · ${e.current}/${e.target} ${e.unit}`:''}</small>{e.sourceUrl&&<a href={e.sourceUrl} target="_blank" rel="noreferrer">{e.sourceLabel} ↗</a>}</div><button disabled={e.completed||busy===e.id} onClick={()=>complete(e.id)}>{busy===e.id?'…':e.completed?'Selesai':'Tandai'}</button></article>)}</section><aside className="amalan-aside"><span>PROGRESS HARI INI</span><strong>{daily.summary.percentage}%</strong><Progress value={daily.summary.percentage}/><p>Centang hanya mencatat aktivitasmu di aplikasi. Ini bukan pengukuran pahala atau iman.</p><div><b>Mulai dari yang mampu</b><small>Amalan yang berkelanjutan, walaupun sedikit. Sahih al-Bukhari 6464.</small></div></aside></div></div>}

function Together({overview,busy,act}:{overview:Overview;busy:string;act:(label:string,task:()=>Promise<unknown>,message:string)=>Promise<void>}){const [mode,setMode]=useState<'circles'|'challenges'|'invite'|'create'>(overview.circles.length?'circles':'create'),[selectedId,setSelectedId]=useState(overview.circles[0]?.id);const selected=overview.circles.find(c=>c.id===selectedId)??overview.circles[0];const created=()=>setMode('circles');return <div className="app-screen together-screen"><ScreenHead eyebrow="BERSAMA TANPA BERLOMBA" title="Together" text="Buat ruangmu sendiri. Tidak ada anggota atau angka rekaan." action={<button className="pill-action" onClick={()=>setMode(overview.circles.length?'invite':'create')}>{overview.circles.length?'＋ Undang anggota':'＋ Buat Circle'}</button>}/><div className="app-tabs"><button className={mode==='circles'||mode==='create'?'active':''} onClick={()=>setMode(overview.circles.length?'circles':'create')}>My Circles</button><button className={mode==='challenges'?'active':''} onClick={()=>setMode('challenges')}>Tantangan</button>{overview.circles.length>0&&<button className={mode==='invite'?'active':''} onClick={()=>setMode('invite')}>Undangan</button>}</div>{mode==='create'?<CreateCircle busy={busy} act={act} onCreated={created}/>:mode==='circles'&&selected?<div className="together-layout"><section className="circle-list">{overview.circles.map(c=><button key={c.id} className={selected.id===c.id?'active':''} onClick={()=>setSelectedId(c.id)}><i>{c.icon}</i><span><b>{c.name}</b><small>{c.members} anggota</small></span>{c.progress>0&&<strong>{c.progress}%</strong>}</button>)}</section><CircleDetail circle={selected} busy={busy} act={act}/></div>:mode==='challenges'?<ChallengeList overview={overview} busy={busy} act={act}/>:selected?<Invite circle={selected} busy={busy} act={act}/>:<CreateCircle busy={busy} act={act} onCreated={created}/>}</div>}
function CreateCircle({busy,act,onCreated}:{busy:string;act:(label:string,task:()=>Promise<unknown>,message:string)=>Promise<void>;onCreated:()=>void}){const submit=async(event:React.FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.currentTarget));await act('create-circle',()=>apiFetch('/circles',{method:'POST',body:JSON.stringify(data)}),'Circle berhasil dibuat.');onCreated();};return <form className="create-circle-card" onSubmit={submit}><div>＋</div><span>CIRCLE PERTAMAMU</span><h2>Buat ruang untuk bertumbuh bersama</h2><p>Anggota hanya dapat bergabung melalui undanganmu. Pengaturan awal tidak menampilkan detail amalan.</p><label>Nama Circle<input required minLength={2} maxLength={60} name="name" placeholder="Contoh: Keluarga Kami"/></label><label>Jenis Circle<select name="type" defaultValue="Keluarga">{['Pribadi','Pasangan','Keluarga','Sahabat','Kajian','Komunitas'].map(type=><option key={type}>{type}</option>)}</select></label><button disabled={busy==='create-circle'}>{busy==='create-circle'?'Membuat Circle…':'Buat Circle'} <b>→</b></button></form>}
function CircleDetail({circle,busy,act}:{circle:Circle;busy:string;act:(label:string,task:()=>Promise<unknown>,message:string)=>void}){return <section className="circle-detail"><div className="circle-cover"><span>{circle.icon}</span><div><small>{circle.type.toUpperCase()}</small><h2>{circle.name}</h2><p>{circle.message}</p></div></div><div className="circle-score"><b>{circle.members} anggota</b><span>Detail amalan dilindungi pengaturan privasi setiap anggota.</span></div>{circle.memberNames.length>0&&<div className="member-row">{circle.memberNames.map(name=><div key={name}><i>{name[0]}</i><small>{name}</small></div>)}</div>}<blockquote>“Saling menguatkan dengan lembut, tanpa membandingkan kesalehan.”</blockquote><button className="wide-action" disabled={busy===`encourage-${circle.id}`} onClick={()=>act(`encourage-${circle.id}`,()=>apiFetch(`/circles/${circle.id}/encouragements`,{method:'POST'}),'Semangat hangat telah dikirim.')}>♡ Kirim semangat</button></section>}
function ChallengeList({overview,busy,act}:{overview:Overview;busy:string;act:(label:string,task:()=>Promise<unknown>,message:string)=>void}){return <div className="challenge-app-grid">{overview.challenges.map(c=>{const percent=Math.round(c.current/c.target*100);return <article key={c.id}><i>{c.icon}</i><div><small>{c.joined?'SEDANG DIIKUTI':'TANTANGAN PRIBADI'}</small><h3>{c.title}</h3><p>{c.description}</p><a href={c.sourceUrl} target="_blank" rel="noreferrer">{c.sourceLabel} ↗</a><Progress value={percent}/><span>{c.current}/{c.target} {c.unit} · mulai saat kamu siap</span></div><button disabled={c.joined||busy===c.id} onClick={()=>act(c.id,()=>apiFetch(`/challenges/${c.id}/join`,{method:'POST'}),'Tantangan ditambahkan ke perjalananmu.')}>{c.joined?'Diikuti':'Ikuti'}</button></article>})}</div>}
function Invite({circle}:{circle:Circle;busy:string;act:(label:string,task:()=>Promise<unknown>,message:string)=>void}){const[url,setUrl]=useState(''),[loading,setLoading]=useState(false),[copied,setCopied]=useState(false);const create=async()=>{setLoading(true);try{const result=await apiFetch<{inviteUrl:string}>(`/circles/${circle.id}/invites`,{method:'POST'});setUrl(result.inviteUrl)}finally{setLoading(false)}};const copy=async()=>{await navigator.clipboard.writeText(url);setCopied(true)};return <section className="invite-card"><div className="envelope">✦</div><span>UNDANG DENGAN TENANG</span><h2>Ajak mereka dalam perjalanan ini</h2><p>Bagikan tautan kepada orang yang kamu percaya. Tautan akan kedaluwarsa dalam 72 jam dan hanya bisa digunakan sekali.</p><label>Circle<select defaultValue={circle.id}><option value={circle.id}>{circle.name}</option></select></label>{url?<div className="invite-result"><span>{url}</span><button onClick={copy}>{copied?'Tersalin ✓':'Salin'}</button></div>:<button disabled={loading} onClick={create}>{loading?'Membuat tautan…':'Buat tautan undangan'} <b>→</b></button>}</section>}

const personalJourneyMilestones=[
  {level:1,title:'Lentera Awal',type:'Cahaya',description:'Lentera pertama menerangi jalan pulang ke rutinitas baik.',image:'/images/journey-items/lentera-awal.webp'},
  {level:2,title:'Mata Air Teduh',type:'Alam',description:'Mata air jernih hadir dari langkah yang mulai terjaga.',image:'/images/journey-items/mata-air-teduh.webp'},
  {level:3,title:'Gerbang Bunga',type:'Dekorasi',description:'Gerbang menuju teras taman berikutnya mulai terbuka.',image:'/images/journey-items/gerbang-bunga.webp'},
  {level:4,title:'Pohon Lentera',type:'Tanaman',description:'Pohon peneduh bertabur cahaya tumbuh di sisi perjalanan.',image:'/images/journey-items/pohon-lentera.webp'},
  {level:5,title:'Paviliun Biru',type:'Bangunan',description:'Ruang tenang untuk melihat kembali perjalanan yang telah dijaga.',image:'/images/journey-items/paviliun-biru.webp'},
  {level:7,title:'Jembatan Bulan',type:'Bangunan',description:'Jembatan bercahaya menghubungkan taman awal dan teras baru.',image:'/images/journey-items/jembatan-bulan.webp'},
  {level:10,title:'Observatorium Hikmah',type:'Bangunan',description:'Menara kecil untuk merenungi arah perjalanan berikutnya.',image:'/images/journey-items/observatorium-hikmah.webp'},
  {level:15,title:'Perpustakaan Cahaya',type:'Bangunan',description:'Ruang ilmu tumbuh bersama amalan yang terus dijaga.',image:'/images/journey-items/perpustakaan-cahaya.webp'},
  {level:20,title:'Gerbang Ufuk',type:'Keajaiban',description:'Gerbang emas membuka pemandangan menuju kawasan yang lebih luas.',image:'/images/journey-items/gerbang-ufuk.webp'},
  {level:30,title:'Taman Agung Bercahaya',type:'Dunia',description:'Seluruh taman menyala sebagai arsip indah perjalanan pribadimu.',image:'/images/journey-items/taman-agung-bercahaya.webp'},
];

function Journey({daily,openAmalan}:{daily:Daily;openAmalan:()=>void}){
  const {level,totalXp,currentXp,nextLevelXp,percentage}=daily.experience;
  const unlocked=personalJourneyMilestones.filter(item=>level>=item.level);
  const nextReward=personalJourneyMilestones.find(item=>item.level>level);
  const [selectedLevel,setSelectedLevel]=useState(unlocked.at(-1)?.level??1);
  const selected=personalJourneyMilestones.find(item=>item.level===selectedLevel)??personalJourneyMilestones[0];
  const visualStage=level>=10?3:level>=5?2:1;
  const stageName=visualStage===3?'Puncak Cahaya':visualStage===2?'Teras Kesejukan':'Lembah Permulaan';
  const scene=`/images/journey-scenes/journey-stage-${visualStage}.webp`;
  const remaining=nextReward?Math.max(0,(nextReward.level-1)*nextLevelXp-totalXp):0;
  return <div className="app-screen journey-screen journey-v2">
    <ScreenHead eyebrow="KOLEKSI PERJALANAN PRIBADI" title="Journey" text="Setiap amalan yang kamu selesaikan menambah EXP akun dan membuka bagian baru dari taman pribadimu."/>
    <section className="personal-journey-level">
      <div className="journey-level-number"><small>LEVEL AKUN</small><strong>{level}</strong></div>
      <div className="journey-level-progress"><header><div><span>LANGKAH BERIKUTNYA</span><h2>{nextReward?`Menuju ${nextReward.title}`:'Seluruh koleksi utama terbuka'}</h2></div><b>{currentXp}/{nextLevelXp} EXP</b></header><div role="progressbar" aria-label="EXP menuju level akun berikutnya" aria-valuemin={0} aria-valuemax={nextLevelXp} aria-valuenow={currentXp}><i style={{width:`${percentage}%`}}/><em>✦</em></div><p>{nextReward?`${remaining} amalan lagi untuk membuka koleksi Level ${nextReward.level}.`:'Perjalanan tetap berlanjut dan semua koleksimu tersimpan.'}</p></div>
      <button onClick={openAmalan}>Lanjutkan amalan <span>→</span></button>
    </section>
    <section className="personal-journey-world" style={{backgroundImage:`linear-gradient(90deg,rgba(3,20,40,.92) 0%,rgba(4,24,45,.62) 38%,rgba(4,20,38,.1) 72%),linear-gradient(0deg,rgba(3,18,35,.9),transparent 55%),url('${scene}')`}}>
      <div className="journey-world-copy"><span>TAHAP {visualStage} · {stageName.toUpperCase()}</span><h2>{stageName}</h2><p>Dunia ini tumbuh dari total EXP akunmu. Hari yang terlewat tidak menghapus koleksi yang sudah terbuka.</p><div className="journey-counters"><b>{unlocked.length}<small>Koleksi terbuka</small></b><b>{daily.journey.activeDays}<small>Hari perjalanan</small></b></div></div>
      <button className="journey-world-focus" onClick={()=>setSelectedLevel(unlocked.at(-1)?.level??1)} aria-label={`Lihat ${selected.title}`}><i><Image src={selected.image} width={160} height={160} alt=""/></i><span><small>KOLEKSI LEVEL {selected.level}</small><b>{selected.title}</b><em>Sentuh untuk melihat cerita</em></span></button>
    </section>
    <section className={`journey-selected-reward ${level>=selected.level?'unlocked':'locked'}`}><i><Image src={selected.image} width={180} height={180} alt={selected.title}/></i><div><span>{selected.type.toUpperCase()} · LEVEL {selected.level}</span><h3>{selected.title}</h3><p>{selected.description}</p></div><strong>{level>=selected.level?'TERBUKA ✓':`TERKUNCI · LEVEL ${selected.level}`}</strong></section>
    <section className="personal-collection"><header><div><span>ROADMAP LEVEL AKUN</span><h2>Koleksi yang menunggu untuk ditemukan</h2><p>Pilih koleksi untuk melihat ceritanya. Semua reward bersifat visual dan tidak menentukan nilai ibadah.</p></div><b>{unlocked.length}/{personalJourneyMilestones.length} terbuka</b></header><div>{personalJourneyMilestones.map(item=>{const available=level>=item.level;return <button key={item.level} className={`${available?'unlocked':'locked'} ${selectedLevel===item.level?'selected':''}`} onClick={()=>setSelectedLevel(item.level)}><i><Image src={item.image} width={180} height={180} alt=""/></i><span><small>LEVEL {item.level} · {item.type}</small><b>{item.title}</b><em>{available?'Koleksi terbuka':`${Math.max(0,(item.level-1)*nextLevelXp-totalXp)} EXP lagi`}</em></span>{available&&<strong>✦</strong>}</button>})}</div></section>
    <small className="journey-disclaimer">Journey World adalah visual motivasi, bukan gambaran literal Jannah dan bukan ukuran pahala atau iman.</small>
  </div>
}

function Profile({user,overview,daily,onLogout}:{user:SessionUser;overview:Overview;daily:Daily;onLogout:()=>void}){const [visibility,setVisibility]=useState(overview.privacy.visibility),[reminders,setReminders]=useState(overview.preferences.remindersEnabled),[reduced,setReduced]=useState(overview.preferences.reducedMotion);const savePreferences=(nextReminders:boolean,nextReduced:boolean)=>apiFetch('/preferences',{method:'PATCH',body:JSON.stringify({remindersEnabled:nextReminders,reducedMotion:nextReduced})});return <div className={`app-screen profile-screen ${reduced?'reduce-motion':''}`}><ScreenHead eyebrow="RUANG PRIBADIMU" title="Profil & Pengaturan" text="Atur identitas, privasi, dan kenyamanan perjalananmu."/><div className="profile-layout"><section className="profile-card"><div className="profile-avatar">{user.avatar}</div><h2>{user.displayName}</h2><p>{user.email}</p><span>Menjaga langkah sejak {new Date(user.joinedAt).toLocaleDateString('id-ID',{month:'long',year:'numeric'})}</span><div><b>{daily.journey.consistencyDays}<small>Hari beruntun</small></b><b>{overview.circles.length}<small>Circle</small></b><b>{daily.summary.completed}<small>Hari ini</small></b></div></section><section className="settings-card"><h2>Privasi Circle</h2><p>Pilih apa yang dapat dilihat anggota Circle. Detail amalan tetap pribadi secara default.</p><div className="privacy-options">{[['PRIVATE','Private','Hanya kamu'],['COMPLETION_ONLY','Selesai saja','Tanpa detail'],['PERCENTAGE','Persentase','Ringkasan progres'],['DETAIL','Detail','Dengan izinmu']].map(([id,title,note])=><button key={id} className={visibility===id?'active':''} onClick={()=>{setVisibility(id);void apiFetch('/privacy',{method:'PATCH',body:JSON.stringify({visibility:id})})}}><i>{visibility===id?'●':'○'}</i><span><b>{title}</b><small>{note}</small></span></button>)}</div><div className="setting-row"><span><b>Pengingat lembut</b><small>Notifikasi di dalam aplikasi</small></span><button className={`toggle ${reminders?'active':''}`} aria-pressed={reminders} onClick={()=>{const next=!reminders;setReminders(next);void savePreferences(next,reduced)}}><i/></button></div><div className="setting-row"><span><b>Kurangi animasi</b><small>Lebih nyaman dan hemat daya</small></span><button className={`toggle ${reduced?'active':''}`} aria-pressed={reduced} onClick={()=>{const next=!reduced;setReduced(next);void savePreferences(reminders,next)}}><i/></button></div><button className="logout-button" onClick={onLogout}>Keluar dari akun</button></section></div></div>}

function NotificationCenter({overview,close,read,readAll}:{overview:Overview;close:()=>void;read:(id:string)=>void;readAll:()=>void}){const unread=overview.notifications.some(item=>!item.read);return <div className="notification-backdrop" onClick={close}><aside className="notification-panel" onClick={event=>event.stopPropagation()} aria-label="Pusat notifikasi"><header><div><span>KABAR PERJALANAN</span><h2>Notifikasi</h2></div><button onClick={close} aria-label="Tutup notifikasi">×</button></header>{unread&&<button className="mark-all" onClick={readAll}>Tandai semua sudah dibaca</button>}{overview.notifications.length?<div className="notification-list">{overview.notifications.map(item=><button key={item.id} className={item.read?'read':''} onClick={()=>!item.read&&read(item.id)}><i>{item.read?'✓':'✦'}</i><span><b>{item.title}</b><small>{item.message}</small><time>{new Date(item.createdAt).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</time></span></button>)}</div>:<div className="notification-empty"><i>◇</i><b>Belum ada kabar baru</b><small>Pengingat dan aktivitas Circle akan muncul di sini.</small></div>}</aside></div>}

function AppState({icon,title,text,loading,children}:{icon:string;title:string;text:string;loading?:boolean;children?:React.ReactNode}){return <main className="app-state-page"><div className="app-state-stars"/><section><i className={loading?'state-orb loading':'state-orb'}>{icon}</i><h1>{title}</h1><p>{text}</p>{children}</section></main>}
