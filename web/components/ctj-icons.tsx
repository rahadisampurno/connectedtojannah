import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  color?: string;
}

// 1. Icon Dzikir Pagi: Fajar Sunrise with Sacred Rays
export function IconFajrSun({ className = '', size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" stroke={color} strokeWidth="2" />
      {/* 8 Divine Rays */}
      <path d="M12 2.5V5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 19V21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M2.5 12H5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 12H21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M5.3 5.3L7.1 7.1" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.9 16.9L18.7 18.7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5.3 18.7L7.1 16.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.9 7.1L18.7 5.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      {/* Inner spark */}
      <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
  );
}

// 2. Icon Dzikir Petang: Twilight Celestial Crescent & Jannah Star
export function IconTwilightMoon({ className = '', size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Crescent Moon */}
      <path
        d="M17.5 13.2C16.8 17.5 13 20.7 8.5 20.4C4.3 20.1 1 16.6 1 12.4C1 7.8 4.6 4.1 9.2 4C9.8 4 10.3 4.1 10.8 4.2C9.4 5.9 8.6 8.1 8.6 10.5C8.6 15.3 12.5 19.2 17.3 19.2C18.4 19.2 19.4 19 20.4 18.6C19.7 17.1 18.6 15 17.5 13.2Z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* 4-Point Celestial Jannah Star */}
      <path
        d="M17.5 3L18.4 6.6L22 7.5L18.4 8.4L17.5 12L16.6 8.4L13 7.5L16.6 6.6L17.5 3Z"
        fill={color}
      />
    </svg>
  );
}

// 3. Icon Ba'da Sholat: Sacred Mihrab & Arabesque Star
export function IconBadaSholat({ className = '', size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Mihrab Islamic Arch */}
      <path
        d="M4 21V11C4 7 7.5 3 12 3C16.5 3 20 7 20 11V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M2.5 21H21.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {/* Inner pointed arch */}
      <path
        d="M7 21V12.5C7 9.8 9.2 7 12 7C14.8 7 17 9.8 17 12.5V21"
        stroke={color}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
      {/* Arabesque 8-point Rub-el-Hizb Star at Center */}
      <rect
        x="10.2"
        y="12.2"
        width="3.6"
        height="3.6"
        fill={color}
        transform="rotate(45 12 14)"
      />
      <rect x="10.5" y="12.5" width="3" height="3" fill={color} />
    </svg>
  );
}

// 4. Icon Sebelum Tidur: Peaceful Night Lamp & Slumber Stars
export function IconSebelumTidur({ className = '', size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Hanging Islamic Lantern (Fanus) */}
      <path d="M12 2V4.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 4.5H15" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M8.5 7.5L9.5 4.5H14.5L15.5 7.5L14 14.5H10L8.5 7.5Z"
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Lantern flame/glow */}
      <circle cx="12" cy="10" r="1.8" fill={color} />
      <path d="M10.5 14.5L12 17L13.5 14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      {/* Floating Gentle Stars */}
      <circle cx="4.5" cy="8.5" r="1" fill={color} />
      <circle cx="19.5" cy="11.5" r="1.2" fill={color} />
      <path d="M18.5 18L19 19.5L20.5 20L19 20.5L18.5 22L18 20.5L16.5 20L18 19.5L18.5 18Z" fill={color} />
    </svg>
  );
}

// 5. Icon Tata Cara Shalat: Sacred Qibla & Kaaba Mihrab Arch
export function IconTataCaraShalat({ className = '', size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Architectural Mosque Dome Arch */}
      <path
        d="M3 21H21M4 21V13C4 8.5 8 5 12 2C16 5 20 8.5 20 13V21"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Kaaba / Sajadah Foundation */}
      <rect
        x="7.5"
        y="12"
        width="9"
        height="9"
        rx="1.5"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.6"
      />
      {/* Golden Kiswah Border */}
      <path d="M7.5 15H16.5" stroke={color} strokeWidth="1.5" />
      {/* Minaret Peak Star */}
      <circle cx="12" cy="7.5" r="1.2" fill={color} />
    </svg>
  );
}

// 6. Icon Tasbih Digital: Sacred Misbaha Dhikr Beads
export function IconTasbihDigital({ className = '', size = 24, color = 'currentColor' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Tasbih Loop Circle */}
      <circle cx="12" cy="10" r="6.5" stroke={color} strokeWidth="1.5" strokeDasharray="1.8 1.8" />
      {/* Key Rosary Beads */}
      <circle cx="12" cy="3.5" r="1.6" fill={color} />
      <circle cx="16.5" cy="5.5" r="1.4" fill={color} />
      <circle cx="18.5" cy="10" r="1.4" fill={color} />
      <circle cx="16.5" cy="14.5" r="1.4" fill={color} />
      <circle cx="7.5" cy="5.5" r="1.4" fill={color} />
      <circle cx="5.5" cy="10" r="1.4" fill={color} />
      <circle cx="7.5" cy="14.5" r="1.4" fill={color} />
      {/* Minaret Finial & Tassel (Syamsah) */}
      <circle cx="12" cy="16.5" r="1.8" fill={color} stroke={color} strokeWidth="0.5" />
      <path d="M12 18.5V22M10.5 22H13.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
