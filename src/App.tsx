import React, { useEffect, useRef, useState } from 'react';
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/clerk-react';
import InstructionsModal from './components/InstructionsModal';

type UserResource = NonNullable<ReturnType<typeof useUser>['user']>;
import { startApp } from './main';
import { syncUser } from './syncUser';

// ─── Data mapping ─────────────────────────────────────────────────────────────
//
// Player JSON files live at  data/bets/{identifier}.json
// where {identifier} is one of the names in data/players.json
// (e.g. "santiago", "mauro", "juan").
//
// Resolution order:
//   1. user.username            → "santiago"   (set in Clerk dashboard)
//   2. email local-part          → "jsmith"     (fallback if no username)
//   3. undefined                 → startApp shows all players, none pre-selected
//
// To guarantee a match, set the Clerk username in the dashboard to exactly the
// same value as the player name in data/players.json.

function resolvePlayerIdentifier(user: UserResource): string | undefined {
  if (user.username) return user.username;
  const email = user.primaryEmailAddress?.emailAddress;
  if (email) return email.split('@')[0];
  return undefined;
}

// ─── Landing (signed-out) ─────────────────────────────────────────────────────

interface LandingPageProps {
  onOpenInstrucciones: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onOpenInstrucciones }) => (
  <div className="auth-overlay">
    <div className="auth-card">
      <div className="auth-card__icon">⚽</div>
      <h1 className="auth-card__title">Polla Mundialista 2026</h1>
      <p className="auth-card__subtitle">
        Sigue las posiciones, apuestas y estadísticas de tu grupo.
      </p>
      <SignInButton mode="modal">
        <button className="auth-card__btn">Iniciar sesión</button>
      </SignInButton>
      <button className="auth-card__instrucciones" onClick={onOpenInstrucciones}>
        Instrucciones
      </button>
    </div>
  </div>
);

// ─── Header bar (signed-in) ───────────────────────────────────────────────────

const ClerkBar: React.FC = () => {
  const { user } = useUser();
  const displayName = user?.firstName ?? user?.username ?? 'jugador';

  return (
    <div className="clerk-bar">
      <span className="clerk-bar__greeting">
        Hola, <strong>{displayName}</strong>
      </span>
      <UserButton />
    </div>
  );
};

// ─── Authenticated shell ──────────────────────────────────────────────────────

const AuthenticatedApp: React.FC = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    // Guard: run once, and only when Clerk has resolved the user object.
    if (initialized.current || !user) return;
    initialized.current = true;
    console.info('User authenticated:', user.id);
    syncUser(user, getToken); // fire-and-forget; never blocks app startup
    const identifier = resolvePlayerIdentifier(user);
    startApp(identifier, getToken);
  }, [user?.id]); // re-initialise only if the logged-in identity actually changes

  return <ClerkBar />;
};

// ─── Root ─────────────────────────────────────────────────────────────────────

declare global {
  interface Window { openInstrucciones?: () => void; }
}

const App: React.FC = () => {
  const [instrOpen, setInstrOpen] = useState(false);

  useEffect(() => {
    window.openInstrucciones = () => setInstrOpen(true);
    return () => { delete window.openInstrucciones; };
  }, []);

  return (
    <>
      <InstructionsModal isOpen={instrOpen} onClose={() => setInstrOpen(false)} />
      <SignedOut>
        <LandingPage onOpenInstrucciones={() => setInstrOpen(true)} />
      </SignedOut>
      <SignedIn>
        <AuthenticatedApp />
      </SignedIn>
    </>
  );
};

export default App;
