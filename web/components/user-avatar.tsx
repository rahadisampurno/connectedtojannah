import { avatarByKey } from '../lib/avatar-options';

export function UserAvatar({ avatar, name, className = '' }: { avatar: string; name: string; className?: string }) {
  const option = avatarByKey(avatar);
  if (!option) return <span className={`user-avatar user-avatar-fallback ${className}`.trim()} aria-label={`Avatar ${name}`}>{avatar.slice(0, 2).toUpperCase()}</span>;
  return <span className={`user-avatar ${className}`.trim()} role="img" aria-label={`${option.name}, avatar ${name}`} style={{ backgroundPosition: option.position }} />;
}
