import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Profile, RecurrenceType, TaskSchedule, TaskScheduleInsert } from '@/types';
import { createTaskTemplate, getTaskTemplate, updateTaskTemplate } from '@/services/tasks';
import { createTaskSchedule, deleteTaskSchedule, getSchedulesForTemplate } from '@/services/schedules';
import { rescheduleAllNotifications } from '@/services/notifications';
import { getAllProfiles } from '@/services/profiles';
import { useAuthContext } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Spinner, SpinnerDot } from '@/components/ui/Spinner';
import { cn, errorMessage } from '@/lib/utils';

const ICON_OPTIONS = [
  '🧹', '🍽️', '👕', '🚿', '🛒', '🪣', '🌫️', '🗑️', '🧽', '🛏️',
  '🪴', '🐕', '🚗', '🏠', '🍳', '🧺', '💊', '📦', '🔧', '🧴',
];

const XP_TIERS = [
  { xp: 1, label: 'Heel klein', desc: '< 2 min', shortDesc: '< 2min', example: 'Licht uitdoen, iets weggooien' },
  { xp: 2, label: 'Klein', desc: '2–5 min', shortDesc: '2–5min', example: 'Tafel afvegen, afval buitenzetten' },
  { xp: 3, label: 'Gewoon', desc: '5–15 min', shortDesc: '5–15min', example: 'Afwassen, stofzuigen (kamer)' },
  { xp: 5, label: 'Stevig', desc: '15–30 min', shortDesc: '15–30m', example: 'Badkamer kuisen, boodschappen' },
  { xp: 7, label: 'Groot', desc: '30–45 min', shortDesc: '30–45m', example: 'Volledige keuken, ramen kuisen' },
  { xp: 10, label: 'Episch', desc: '45+ min', shortDesc: '45+min', example: 'Grote schoonmaak, verhuizen' },
] as const;

const DAYS_OF_WEEK = [1, 2, 3, 4, 5, 6, 0];
const DAY_NL: Record<number, string> = { 0: 'Zo', 1: 'Ma', 2: 'Di', 3: 'Wo', 4: 'Do', 5: 'Vr', 6: 'Za' };
const NL_MONTHS_SHORT = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  once: 'Eenmalig',
  daily: 'Dagelijks',
  weekly: 'Wekelijks',
  monthly: 'Maandelijks',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function TaskTemplateFormPage() {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const { user } = useAuthContext();
  const { toast } = useUI();
  const isEdit = Boolean(templateId);

  // Template fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(3);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [icon, setIcon] = useState('🧹');
  const [assignedUserId, setAssignedUserId] = useState<string | null>(user?.id ?? null);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Schedule fields
  const [today] = useState(() => new Date());
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('daily');
  const [weekDays, setWeekDays] = useState<Set<number>>(new Set([1]));
  const [monthDay, setMonthDay] = useState(1);
  const [onceDay, setOnceDay] = useState(today.getDate());
  const [onceMonth, setOnceMonth] = useState(today.getMonth());
  const [hour, setHour] = useState(10);
  const [minute, setMinute] = useState(0);
  const [hourText, setHourText] = useState('10');
  const [minuteText, setMinuteText] = useState('00');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [existingSchedules, setExistingSchedules] = useState<TaskSchedule[]>([]);

  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);

  const selectedTier = XP_TIERS.find((t) => t.xp === points) ?? XP_TIERS[2];

  useEffect(() => {
    getAllProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;

    Promise.all([getTaskTemplate(templateId), getSchedulesForTemplate(templateId)])
      .then(([t, schedules]) => {
        if (cancelled) return;
        setName(t.name);
        setDescription(t.description ?? '');
        setPoints(t.points);
        setPhotoRequired(t.photo_required);
        setIcon(t.icon);
        setAssignedUserId(t.user_id ?? null);

        const active = schedules.filter((s) => s.is_active);
        setExistingSchedules(active);
        if (active.length === 0) return;

        const s = active[0];
        setRecurrenceType(s.recurrence_type);
        if (s.recurrence_type === 'weekly') {
          setWeekDays(new Set(active.map((x) => x.recurrence_day ?? 1)));
        } else if (s.recurrence_type === 'monthly') {
          setMonthDay(s.recurrence_day ?? 1);
        } else if (s.recurrence_type === 'once' && s.once_date) {
          const [, m, d] = s.once_date.split('-').map(Number);
          setOnceMonth(m - 1);
          setOnceDay(d);
        }
        const [h, mi] = s.time_of_day.split(':').map(Number);
        setHour(h);
        setHourText(pad(h));
        setMinute(mi);
        setMinuteText(pad(mi));
        setReminderEnabled(s.reminder_enabled);
      })
      .catch((e) => !cancelled && toast('Fout', errorMessage(e, 'Laden mislukt'), 'error'))
      .finally(() => !cancelled && setInitialLoading(false));

    return () => {
      cancelled = true;
    };
  }, [templateId, toast]);

  function commitHour() {
    const n = parseInt(hourText, 10);
    const c = Number.isNaN(n) ? 0 : Math.min(23, Math.max(0, n));
    setHour(c);
    setHourText(pad(c));
  }

  function commitMinute() {
    const n = parseInt(minuteText, 10);
    const c = Number.isNaN(n) ? 0 : Math.min(59, Math.max(0, n));
    setMinute(c);
    setMinuteText(pad(c));
  }

  function toggleWeekDay(day: number) {
    setWeekDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        // Never let the last day be removed — a weekly quest needs a day.
        if (next.size > 1) next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  /** A one-off date that has already passed this year rolls to next year. */
  function buildOnceDate(): string {
    const year = today.getFullYear();
    const d = new Date(year, onceMonth, onceDay);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (d < todayMidnight) d.setFullYear(year + 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  async function saveSchedules(tid: string) {
    const timeOfDay = `${pad(hour)}:${pad(minute)}:00`;

    // Schedules are rewritten wholesale rather than diffed: the form only ever
    // describes one recurrence, so replacing is simpler and always consistent.
    await Promise.all(existingSchedules.map((s) => deleteTaskSchedule(s.id)));

    if (recurrenceType === 'weekly') {
      await Promise.all(
        [...weekDays].map((day) =>
          createTaskSchedule({
            task_template_id: tid,
            recurrence_type: 'weekly',
            recurrence_day: day,
            time_of_day: timeOfDay,
            reminder_enabled: reminderEnabled,
            is_active: true,
          })
        )
      );
      return;
    }

    const payload: TaskScheduleInsert = {
      task_template_id: tid,
      recurrence_type: recurrenceType,
      recurrence_day:
        recurrenceType === 'once' || recurrenceType === 'daily' ? null : monthDay,
      time_of_day: timeOfDay,
      reminder_enabled: reminderEnabled,
      is_active: true,
    };
    if (recurrenceType === 'once') payload.once_date = buildOnceDate();
    await createTaskSchedule(payload);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast('Naam vereist', 'Geef de queeste een naam.', 'error');
      return;
    }

    setSaving(true);
    try {
      const fields = {
        name: trimmedName,
        description: description.trim() || null,
        points,
        photo_required: photoRequired,
        icon,
        user_id: assignedUserId,
      };

      if (isEdit && templateId) {
        await updateTaskTemplate(templateId, fields);
        await saveSchedules(templateId);
      } else {
        const template = await createTaskTemplate(fields);
        await saveSchedules(template.id);
      }

      rescheduleAllNotifications().catch(() => {});
      navigate('/tasks');
    } catch (e2) {
      toast('Fout', errorMessage(e2, 'Opslaan mislukt'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (initialLoading) return <Spinner />;

  return (
    <form onSubmit={handleSubmit} className="pb-8">
      <Link
        to="/tasks"
        className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-primary transition-colors hover:text-primary-light"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Taken
      </Link>

      <h1 className="text-glow mb-6 text-2xl font-black text-ink sm:text-3xl">
        {isEdit ? 'Queeste bewerken' : 'Nieuwe queeste'}
      </h1>

      {/* ── Quest details ─────────────────────────────────────────────── */}
      <h2 className="mb-3 text-xs font-extrabold tracking-[0.25em] text-secondary">
        🐉 QUEESTE DETAILS
      </h2>

      {profiles.length > 0 && (
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
            Toegewezen aan
          </legend>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => {
              const label = p.display_name ?? p.email?.split('@')[0] ?? '?';
              const active = assignedUserId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAssignedUserId(p.id)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 transition-colors',
                    active
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-edge bg-card-elevated text-muted hover:border-edge-deep'
                  )}
                >
                  <Avatar url={p.avatar_url} name={label} size={28} />
                  <span className={cn('text-sm', active ? 'font-extrabold' : 'font-semibold')}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="mb-4">
        <Input
          label="Naam *"
          placeholder="bv. Stofzuigen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
      </div>

      <div className="mb-4">
        <Textarea
          label="Beschrijving (optioneel)"
          placeholder="Kort omschrijven..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Difficulty slider */}
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
          Moeilijkheid
        </legend>

        <div className="mb-4 rounded-md border-2 border-secondary bg-card-elevated p-4">
          <p className="font-extrabold text-accent">{selectedTier.label}</p>
          <p className="mt-0.5 text-xs text-muted">
            {selectedTier.desc} · {selectedTier.example}
          </p>
        </div>

        <div className="relative px-1 py-3">
          <div aria-hidden="true" className="absolute inset-x-6 top-6 h-[3px] rounded bg-edge" />
          <div className="relative flex items-start justify-between">
            {XP_TIERS.map((tier) => {
              const active = points === tier.xp;
              return (
                <button
                  key={tier.xp}
                  type="button"
                  aria-pressed={active}
                  aria-label={`${tier.label}, ${tier.xp} XP, ${tier.desc}`}
                  onClick={() => setPoints(tier.xp)}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      'grid place-items-center rounded-full border-2 transition-all duration-200',
                      active
                        ? 'size-7 border-primary bg-primary shadow-glow'
                        : 'size-5 border-edge bg-card hover:border-primary-light'
                    )}
                  >
                    {active && <span className="size-2.5 rounded-full bg-white" />}
                  </span>
                  <span
                    className={cn(
                      'text-center text-[0.6rem] font-bold',
                      active ? 'text-accent' : 'text-muted'
                    )}
                  >
                    {tier.shortDesc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      <div className="mb-4 flex items-center justify-between gap-4 rounded-md border border-edge bg-card p-4">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-primary-light">
            📷 Bewijs foto vereist
          </p>
          <p className="mt-0.5 text-xs text-muted">Foto nemen om te voltooien</p>
        </div>
        <Switch
          checked={photoRequired}
          onChange={setPhotoRequired}
          label="Bewijs foto vereist"
        />
      </div>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">Icoon</legend>
        <div className="flex flex-wrap gap-2">
          {ICON_OPTIONS.map((ic) => (
            <button
              key={ic}
              type="button"
              aria-label={`Icoon ${ic}`}
              aria-pressed={icon === ic}
              onClick={() => setIcon(ic)}
              className={cn(
                'grid size-12 place-items-center rounded-sm border-2 text-2xl transition-colors',
                icon === ic
                  ? 'border-primary bg-card-elevated shadow-glow'
                  : 'border-edge bg-card hover:border-edge-deep'
              )}
            >
              <span aria-hidden="true">{ic}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <hr className="my-6 border-edge" />

      {/* ── Planning ──────────────────────────────────────────────────── */}
      <h2 className="mb-3 text-xs font-extrabold tracking-[0.25em] text-secondary">📅 PLANNING</h2>

      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
          Hoe vaak?
        </legend>
        <div className="flex gap-1 rounded-md border border-edge bg-card p-1">
          {(['once', 'daily', 'weekly', 'monthly'] as RecurrenceType[]).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={recurrenceType === type}
              onClick={() => setRecurrenceType(type)}
              className={cn(
                'flex-1 rounded-sm py-2.5 text-xs font-bold transition-colors',
                recurrenceType === type ? 'bg-primary text-white' : 'text-muted hover:text-ink'
              )}
            >
              {RECURRENCE_LABELS[type]}
            </button>
          ))}
        </div>
      </fieldset>

      {recurrenceType === 'once' && (
        <>
          <fieldset className="mb-4">
            <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
              Maand
            </legend>
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {NL_MONTHS_SHORT.map((m, i) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={onceMonth === i}
                  onClick={() => setOnceMonth(i)}
                  className={cn(
                    'shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors',
                    onceMonth === i
                      ? 'border-primary bg-primary text-white shadow-glow'
                      : 'border-edge bg-card text-muted hover:border-edge-deep'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <DayGrid label="Dag" value={onceDay} onChange={setOnceDay} />
        </>
      )}

      {recurrenceType === 'weekly' && (
        <fieldset className="mb-4">
          <legend className="mb-1 text-sm font-extrabold tracking-wide text-primary-light">
            Welke dagen?
          </legend>
          <p className="mb-2 text-xs text-muted">Tik op meerdere dagen</p>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={weekDays.has(d)}
                onClick={() => toggleWeekDay(d)}
                className={cn(
                  'min-w-11 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors',
                  weekDays.has(d)
                    ? 'border-primary bg-primary text-white shadow-glow'
                    : 'border-edge bg-card text-muted hover:border-edge-deep'
                )}
              >
                {DAY_NL[d]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {recurrenceType === 'monthly' && (
        <DayGrid label="Dag van de maand" value={monthDay} onChange={setMonthDay} />
      )}

      {/* Time */}
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
          Hoe laat? · {pad(hour)}:{pad(minute)}
        </legend>
        <div className="flex items-center justify-center gap-3">
          <TimeField
            label="uur"
            value={hourText}
            onChange={setHourText}
            onBlur={commitHour}
            aria-label="Uur"
          />
          <span aria-hidden="true" className="mb-6 text-4xl font-black text-secondary">
            :
          </span>
          <TimeField
            label="min"
            value={minuteText}
            onChange={setMinuteText}
            onBlur={commitMinute}
            aria-label="Minuut"
          />
        </div>
      </fieldset>

      <div className="mb-6 flex items-center justify-between gap-4 rounded-md border border-edge bg-card p-4">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-primary-light">
            🔔 Herinnering sturen
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Magische melding op het geplande tijdstip, zolang het Hof open staat
          </p>
        </div>
        <Switch
          checked={reminderEnabled}
          onChange={setReminderEnabled}
          label="Herinnering sturen"
          tone="secondary"
        />
      </div>

      <Button type="submit" size="lg" block disabled={saving}>
        {saving ? <SpinnerDot /> : '🐉 Queeste opslaan'}
      </Button>
    </form>
  );
}

function DayGrid({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (day: number) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="mb-2 text-sm font-extrabold tracking-wide text-primary-light">
        {label}
      </legend>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={cn(
              'aspect-square rounded-sm border-2 text-sm font-bold transition-colors',
              value === d
                ? 'border-primary bg-primary text-white shadow-glow'
                : 'border-edge bg-card text-muted hover:border-edge-deep'
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TimeField({
  label,
  value,
  onChange,
  onBlur,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
} & React.AriaAttributes) {
  return (
    <div className="flex flex-col items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={2}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        onBlur={onBlur}
        onFocus={(e) => e.target.select()}
        className="h-20 w-24 rounded-md border-2 border-secondary bg-card text-center text-4xl font-black text-accent shadow-glow focus:border-primary focus:outline-none"
        {...rest}
      />
      <span className="text-xs font-bold text-muted">{label}</span>
    </div>
  );
}
