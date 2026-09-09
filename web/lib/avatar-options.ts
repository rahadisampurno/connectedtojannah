export const avatarOptions = [
  { key: 'najm', name: 'Najm', trait: 'Si Penuh Semangat', position: '2% 25%' },
  { key: 'nura', name: 'Nura', trait: 'Si Lembut dan Tangguh', position: '26% 25%' },
  { key: 'raihan', name: 'Raihan', trait: 'Si Optimis', position: '50% 25%' },
  { key: 'salma', name: 'Salma', trait: 'Si Penebar Kebaikan', position: '73.5% 25%' },
  { key: 'fawwaz', name: 'Fawwaz', trait: 'Si Pembelajar', position: '97.5% 25%' },
  { key: 'aaliyah', name: 'Aaliyah', trait: 'Si Ceria', position: '2% 73%' },
  { key: 'zayd', name: 'Zayd', trait: 'Si Baik Hati', position: '26% 73%' },
  { key: 'ihsan', name: 'Ihsan', trait: 'Si Penuh Pikir', position: '50% 73%' },
  { key: 'hana', name: 'Hana', trait: 'Si Penuh Harapan', position: '73.5% 73%' },
  { key: 'maira', name: 'Maira', trait: 'Si Pencinta Alam', position: '97.5% 73%' },
] as const;

export type AvatarKey = (typeof avatarOptions)[number]['key'];
export const avatarKeys = avatarOptions.map((avatar) => avatar.key);
export const avatarByKey = (key: string) => avatarOptions.find((avatar) => avatar.key === key);
