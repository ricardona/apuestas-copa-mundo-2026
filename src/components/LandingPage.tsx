import React from 'react';
import { SignInButton } from '@clerk/clerk-react';

interface Props {
  onOpenInstrucciones: () => void;
}

const STATS = [
  { n: '104', label: 'Partidos' },
  { n: '48',  label: 'Selecciones' },
  { n: '11',  label: 'Logros' },
];

const LandingPage: React.FC<Props> = ({ onOpenInstrucciones }) => (
  <div className="landing-stadium">
    <div className="landing-stadium-bg" />
    <div className="landing-stadium-veil" />

    <div className="landing-stadium-inner">
      <div className="landing-stadium-mark">
        <div className="auth-card__icon" style={{ width: 56, height: 56, fontSize: 28 }}>⚽</div>
        <span className="landing-stadium-eyebrow">
          Polla Mundialista <span className="muted">· 2026</span>
        </span>
      </div>

      <h1 className="landing-stadium-headline">
        El Mundial<br />
        <span className="gold">es tuyo.</span>
      </h1>

      <p className="landing-stadium-sub">
        104 partidos. 48 selecciones. Una sola polla.<br />
        ¿Tienes ojo mundialista para pronosticarlo todo?
      </p>

      <div className="landing-stadium-stats">
        {STATS.map(s => (
          <div className="stat-block" key={s.label}>
            <div className="stat-n">{s.n}</div>
            <div className="stat-l">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="landing-stadium-cta">
        <SignInButton mode="modal">
          <button className="landing-cta-primary">
            Iniciar sesión <span style={{ marginLeft: 8 }}>→</span>
          </button>
        </SignInButton>
        <button className="landing-cta-link" onClick={onOpenInstrucciones}>
          ¿Cómo funciona?
        </button>
      </div>

      <div className="landing-stadium-foot">
        <span className="mark-dot" /> Listos para el pitazo inicial
      </div>
    </div>
  </div>
);

export default LandingPage;
