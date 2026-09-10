import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, BellOff, ChevronRight, LogOut, Moon, Pencil, Sun } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppContext } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUI } from '@/contexts/UIContext';
import { supabase } from '@/lib/supabase';
import { getOwnProfile, updateAvatarUrl, updateDisplayName } from '@/services/profiles';
import {
  notificationPermission,
  requestNotificationPermissions,
  rescheduleAllNotifications,
} from '@/services/notifications';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SpinnerDot } from '@/components/ui/Spinner';
import { LifetimeTrack } from '@/components/LifetimeTrack';
import { useStreak } from '@/hooks/useStreak';
import { AVATARS, getAvatarByUrl, getTwemojiUrl, type AvatarOption } from './avatars';
import { cn, errorMessage } from '@/lib/utils';

export function ProfilePage() {
  const { lifetime } = useAppContext();
  const { streak } = useStreak();
  const navigate = useNavigate();
  const { user, signOut, setAvatarUrl: setGlobalAvatar } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const { toast, confirm } = useUI();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [showPwdModal, setShowPwdModal] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const [permission, setPermission] = useState(notificationPermission());

  const loadProfile = useCallback(async () => {
    const profile = await getOwnProfile();
    const name = profile?.display_name ?? '';
    setDisplayName(name);
    setNameInput(name);
    const url = profile?.avatar_url ?? null;
    setAvatarUrl(url);
    setGlobalAvatar(url);
  }, [setGlobalAvatar]);

  useEffect(() => {
    loadProfile().catch(() => {});
  }, [loadProfile]);

  async function handleSelectAvatar(option: AvatarOption) {
    if (!user) return;
    const previous = avatarUrl;
    const url = getTwemojiUrl(option.code);

    // Optimistic: the picker closes and the avatar swaps immediately.
    setShowAvatarPicker(false);
    setAvatarUrl(url);
    setGlobalAvatar(url);

    try {
      await updateAvatarUrl(user.id, url);
    } catch (e) {
      setAvatarUrl(previous);
      setGlobalAvatar(previous);
      toast('Fout', errorMessage(e, 'Opslaan mislukt'), 'error');
    }
  }

  async function handleSaveName() {
    if (!user) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast('Fout', 'Naam mag niet leeg zijn.', 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(user.id, trimmed);
      setDisplayName(trimmed);
      setEditingName(false);
    } catch (e) {
      toast('Fout', errorMessage(e, 'Opslaan mislukt'), 'error');
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd.length < 6) {
      toast('Fout', 'Wachtwoord moet minstens 6 tekens zijn.', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast('Fout', 'Wachtwoorden komen niet overeen.', 'error');
      return;
    }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setShowPwdModal(false);
      setNewPwd('');
      setConfirmPwd('');
      toast('Gelukt', 'Wachtwoord is gewijzigd.', 'success');
    } catch (e) {
      toast('Fout', errorMessage(e, 'Wijzigen mislukt'), 'error');
    } finally {
      setSavingPwd(false);
    }
  }

  async function handleEnableNotifications() {
    const granted = await requestNotificationPermissions();
    setPermission(notificationPermission());
    if (granted) {
      rescheduleAllNotifications().catch(() => {});
      toast('Herinneringen aan 🔔', 'De draak fluistert je naam zolang het Hof open staat.', 'success');
    } else {
      toast(
        'Geen toestemming',
        'Meldingen staan uit. Zet ze aan in je browserinstellingen voor deze site.',
        'error'
      );
    }
  }

  async function handleSignOut() {
    const ok = await confirm({
      title: 'Uitloggen',
      message: 'Weet je het zeker?',
      confirmLabel: 'Uitloggen',
      destructive: true,
    });
    if (!ok) return;
    try {
      await signOut();
    } catch {
      toast('Fout', 'Uitloggen mislukt', 'error');
    }
  }

  const selectedAvatar = getAvatarByUrl(avatarUrl);
  const initial = (displayName || user?.email || '?').charAt(0).toUpperCase();

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-glow text-2xl font-black text-ink">Profiel</h1>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Terug
        </Button>
      </div>

      {/* Avatar block */}
      <section className="flex flex-col items-center gap-1.5 py-6">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAvatarPicker(true)}
          aria-label="Klasse kiezen"
          style={selectedAvatar ? { backgroundColor: selectedAvatar.bg } : undefined}
          className={cn(
            'relative grid size-28 place-items-center overflow-hidden rounded-full border-4 shadow-glow-lg transition-transform hover:scale-105',
            selectedAvatar ? 'border-edge' : 'border-primary bg-primary/15'
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-16 object-contain" />
          ) : (
            <span aria-hidden="true" className="text-4xl font-black text-primary">
              {initial}
            </span>
          )}
          <span
            aria-hidden="true"
            className="absolute bottom-1 right-1 grid size-7 place-items-center rounded-full border-2 border-edge bg-card"
          >
            <Pencil className="size-3 text-muted" />
          </span>
        </motion.button>

        {selectedAvatar && (
          <p className="text-sm font-bold tracking-wide text-secondary">{selectedAvatar.label}</p>
        )}
        <p className="text-xs text-muted">Tik om klasse te kiezen</p>
        <p className="mt-1 text-xl font-extrabold text-ink">{displayName || '(geen naam)'}</p>
        <p className="text-sm text-muted">{user?.email}</p>
      </section>

      {/* What carries over from month to month */}
      <h2 className="mb-2 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // JOUW GESCHIEDENIS
      </h2>
      <LifetimeTrack lifetime={lifetime} className="mb-4" />

      {streak.longest > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-edge bg-card p-4">
          <span aria-hidden="true" className="text-2xl">
            🔥
          </span>
          <p className="text-sm text-muted">
            Langste reeks ooit:{' '}
            <strong className="font-bold text-ink">
              {streak.longest} {streak.longest === 1 ? 'dag' : 'dagen'}
            </strong>
            {streak.current > 0 && (
              <span className="text-muted"> — nu {streak.current} op rij</span>
            )}
          </p>
        </div>
      )}

      {/* Display name */}
      <h2 className="mb-2 text-xs font-extrabold tracking-[0.2em] text-secondary">
        // IN-GAME NAAM
      </h2>
      <div className="mb-6 overflow-hidden rounded-md border border-edge bg-card">
        {editingName ? (
          <div className="space-y-3 p-4">
            <Input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Jouw naam in de game"
              maxLength={30}
              autoFocus
              aria-label="In-game naam"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                block
                onClick={() => {
                  setEditingName(false);
                  setNameInput(displayName);
                }}
              >
                Annuleer
              </Button>
              <Button block onClick={handleSaveName} disabled={savingName} className="flex-[2]">
                {savingName ? <SpinnerDot /> : 'Opslaan'}
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingName(true)}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-card-elevated"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-muted">Naam</p>
              <p className="mt-0.5 truncate font-bold text-ink">
                {displayName || '(niet ingesteld)'}
              </p>
            </div>
            <Pencil className="size-4 shrink-0 text-muted" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Preferences */}
      <h2 className="mb-2 text-xs font-extrabold tracking-[0.2em] text-secondary">// VOORKEUREN</h2>
      <div className="mb-6 space-y-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center justify-between gap-3 rounded-md border border-edge bg-card p-4 transition-colors hover:border-primary"
        >
          <span className="flex items-center gap-3 font-bold text-ink">
            {theme === 'dark' ? (
              <Moon className="size-5 text-secondary" aria-hidden="true" />
            ) : (
              <Sun className="size-5 text-accent" aria-hidden="true" />
            )}
            {theme === 'dark' ? 'Nachtelijk Hof' : 'Daglicht Hof'}
          </span>
          <span className="text-sm text-muted">
            Wissel naar {theme === 'dark' ? 'licht' : 'donker'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleEnableNotifications}
          disabled={permission === 'granted' || permission === 'unsupported'}
          className="flex w-full items-center justify-between gap-3 rounded-md border border-edge bg-card p-4 transition-colors hover:border-primary disabled:cursor-default disabled:hover:border-edge"
        >
          <span className="flex items-center gap-3 font-bold text-ink">
            {permission === 'granted' ? (
              <Bell className="size-5 text-success" aria-hidden="true" />
            ) : (
              <BellOff className="size-5 text-muted" aria-hidden="true" />
            )}
            Herinneringen
          </span>
          <span className="text-right text-sm text-muted">
            {permission === 'granted'
              ? 'Aan'
              : permission === 'denied'
                ? 'Geblokkeerd in je browser'
                : permission === 'unsupported'
                  ? 'Niet ondersteund'
                  : 'Inschakelen'}
          </span>
        </button>
      </div>

      {/* Account */}
      <h2 className="mb-2 text-xs font-extrabold tracking-[0.2em] text-secondary">// ACCOUNT</h2>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowPwdModal(true)}
          className="flex w-full items-center justify-between rounded-md border border-edge bg-card p-4 font-bold text-ink transition-colors hover:border-primary"
        >
          Wachtwoord wijzigen
          <ChevronRight className="size-5 text-muted" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-between rounded-md border border-error/40 bg-card p-4 font-bold text-error transition-colors hover:bg-error/10"
        >
          <span className="flex items-center gap-3">
            <LogOut className="size-5" aria-hidden="true" />
            Uitloggen
          </span>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      {/* Avatar picker */}
      <Modal
        open={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        title="Kies je klasse"
      >
        <div className="grid grid-cols-4 gap-2 p-4 pb-10 sm:grid-cols-6">
          {AVATARS.map((option) => {
            const url = getTwemojiUrl(option.code);
            const isSelected = avatarUrl === url;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectAvatar(option)}
                aria-pressed={isSelected}
                style={{ backgroundColor: option.bg }}
                className={cn(
                  'flex aspect-[0.85] flex-col items-center justify-center gap-1 rounded-md border-2 p-1 transition-transform hover:scale-105',
                  isSelected ? 'border-primary shadow-glow' : 'border-transparent'
                )}
              >
                <img src={url} alt="" loading="lazy" className="size-10 object-contain" />
                <span className="line-clamp-1 px-0.5 text-center text-[0.55rem] text-white/70">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Password modal */}
      <Modal
        open={showPwdModal}
        onClose={() => setShowPwdModal(false)}
        title="Wachtwoord wijzigen"
        variant="center"
      >
        <form onSubmit={handleChangePassword} className="space-y-3 p-5">
          <PasswordInput
            label="Nieuw wachtwoord"
            autoComplete="new-password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            hint="Minstens 6 tekens"
            required
          />
          <PasswordInput
            label="Bevestig wachtwoord"
            autoComplete="new-password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            required
          />
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              block
              onClick={() => {
                setShowPwdModal(false);
                setNewPwd('');
                setConfirmPwd('');
              }}
            >
              Annuleer
            </Button>
            <Button type="submit" block disabled={savingPwd} className="flex-[2]">
              {savingPwd ? <SpinnerDot /> : '💾 Opslaan'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
