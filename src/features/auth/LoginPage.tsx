import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useUI } from '@/contexts/UIContext';
import { Button } from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Input';
import { SpinnerDot } from '@/components/ui/Spinner';
import { errorMessage } from '@/lib/utils';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useUI();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast('Vereist', 'Vul je e-mail en wachtwoord in.', 'error');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
        toast('Account aangemaakt! 🐉', 'Controleer je e-mail en betreed dan het Hof.', 'success');
        setIsSignUp(false);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      toast('Fout', errorMessage(err, 'Inloggen mislukt'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-bg-deep px-4 py-10">
      {/* Drifting gradient blobs — the web answer to the native full-screen gradient. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 size-[28rem] rounded-full bg-primary/25 blur-[100px]"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-24 size-[32rem] rounded-full bg-secondary/20 blur-[110px]"
          animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute left-1/3 top-1/2 size-72 rounded-full bg-accent2/15 blur-[90px]"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex flex-col items-center gap-2 text-center"
        >
          <span aria-hidden="true" className="text-7xl motion-safe:animate-float">
            🐉
          </span>
          <h1 className="text-glow text-3xl font-black tracking-[0.15em] text-primary sm:text-4xl">
            HOF DER DRAKEN
          </h1>
          <p className="text-sm text-muted">Jouw queestes wachten, ridder</p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: 'easeOut' }}
          className="overflow-hidden rounded-lg border-2 border-primary bg-card/90 shadow-glow-lg backdrop-blur-md"
        >
          <div aria-hidden="true" className="h-[3px] bg-gradient-to-r from-primary to-secondary" />
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <h2 className="text-xl font-extrabold text-ink">
              {isSignUp ? '🌹 Account aanmaken' : '🐉 Betreed het Hof'}
            </h2>

            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="ridder@hofderdraken.be"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <PasswordInput
              label="Wachtwoord"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" size="lg" block disabled={loading} className="mt-1">
              {loading ? (
                <SpinnerDot />
              ) : isSignUp ? (
                'Account aanmaken 🌹'
              ) : (
                'Betreed het Hof 🐉'
              )}
            </Button>

            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="text-center text-sm text-muted transition-colors hover:text-ink"
            >
              {isSignUp ? 'Al een account? ' : 'Nog geen account? '}
              <span className="font-bold text-primary">{isSignUp ? 'Inloggen' : 'Aanmaken'}</span>
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
