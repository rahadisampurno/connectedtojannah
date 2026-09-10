export type Period = 'PAGI' | 'SIANG' | 'SORE' | 'MALAM';
export type EntryKind = 'CHECKLIST' | 'COUNTER' | 'QUANTITY' | 'DURATION' | 'CUSTOM';

export interface DailyEntry {
  id: string;
  amalanId?: string;
  title: string;
  note: string;
  period: Period;
  kind: EntryKind;
  current: number;
  target: number;
  unit?: string;
  completed: boolean;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
  bookmarked?: boolean;
  sourceLabel?: string;
  sourceUrl?: string;
  instructions?: string;
  isPersonal: boolean;
  circles: { id: string; name: string; type: string }[];
}

export interface DailyState {
  date: string;
  entries: DailyEntry[];
  summary: { completed: number; total: number; percentage: number };
  experience: { level: number; totalXp: number; currentXp: number; nextLevelXp: number; percentage: number };
  journey: { consistencyDays: number; activeDays: number; energy: number; gardenStage: number; message: string };
}

export const summarize = (entries: DailyEntry[]) => {
  const completed = entries.filter((entry) => entry.completed).length;
  return { completed, total: entries.length, percentage: entries.length ? Math.round(completed / entries.length * 100) : 0 };
};
