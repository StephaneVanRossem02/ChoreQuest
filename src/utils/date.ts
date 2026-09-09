export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const NL_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

const NL_MONTHS_LONG = NL_MONTHS;

export function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const m = parseInt(month, 10) - 1;
  return `${NL_MONTHS_LONG[m]} ${year}`;
}

export function formatMonthHeader(year: number, month: number): string {
  return `${NL_MONTHS[month].charAt(0).toUpperCase() + NL_MONTHS[month].slice(1)} ${year}`;
}

export function formatTime(timeOfDay: string): string {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function getPastMonthKeys(count: number = 12): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(getMonthKey(date));
  }
  return keys;
}

export function isToday(dateStr: string): boolean {
  return dateStr === getDateString();
}

export function isPast(dateStr: string): boolean {
  return dateStr < getDateString();
}

const NL_DAYS = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
const NL_DAYS_SHORT = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
// Monday-first order for calendar header
export const NL_DAYS_CALENDAR = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

export function dayOfWeekLabel(day: number): string {
  return NL_DAYS[day] ?? '';
}

export function dayOfWeekShort(day: number): string {
  return NL_DAYS_SHORT[day] ?? '';
}

export function ordinal(n: number): string {
  return `${n}e`;
}

/** Returns hours elapsed since the scheduled time today (negative = not yet reached) */
export function getHoursPastSchedule(timeOfDay: string): number {
  const [schedHour, schedMin] = timeOfDay.split(':').map(Number);
  const now = new Date();
  const scheduled = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedHour, schedMin, 0);
  return (now.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
}
