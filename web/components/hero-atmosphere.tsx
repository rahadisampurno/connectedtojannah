'use client';

import { useEffect, useRef } from 'react';

export function HeroAtmosphere() {
  const atmosphereRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const atmosphere = atmosphereRef.current;
    const hero = atmosphere?.closest<HTMLElement>('.landing-hero');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const updatePointer = (event: PointerEvent) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;
        hero.style.setProperty('--far-x', `${x * -3}px`);
        hero.style.setProperty('--far-y', `${y * -2}px`);
        hero.style.setProperty('--mid-x', `${x * -6}px`);
        hero.style.setProperty('--mid-y', `${y * -4}px`);
        hero.style.setProperty('--near-x', `${x * -11}px`);
        hero.style.setProperty('--near-y', `${y * -7}px`);
        hero.style.setProperty('--soft-x', `${x * 5}px`);
        hero.style.setProperty('--soft-y', `${y * 3}px`);
      });
    };
    const updateScroll = () => {
      const progress = Math.min(window.scrollY / Math.max(hero.offsetHeight, 1), 1);
      hero.style.setProperty('--sky-scroll', `${progress * -18}px`);
      hero.style.setProperty('--near-scroll', `${progress * -34}px`);
    };

    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('scroll', updateScroll);
    };
  }, []);

  return <div className="hero-atmosphere" ref={atmosphereRef} aria-hidden="true">
    <div className="atmosphere-aurora"><i /><i /></div>
    <div className="star-field stars-far" />
    <div className="star-field stars-mid" />
    <div className="star-field stars-near" />
    <div className="shooting-stars"><i /><i /><i /></div>
    <div className="celestial-lantern celestial-one"><span><b>✦</b><i /></span></div>
    <div className="celestial-lantern celestial-two"><span><b>✦</b><i /></span></div>
    <div className="celestial-lantern celestial-three"><span><b>✦</b><i /></span></div>
    <div className="light-motes">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
    <div className="horizon-glow" />
  </div>;
}
