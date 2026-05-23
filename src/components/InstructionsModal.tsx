import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const InstructionsModal: React.FC<Props> = ({ isOpen, onClose }) => (
  <div
    className={`modal-overlay${isOpen ? ' open' : ''}`}
    style={{ zIndex: 4000 }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <div className="modal-box">
      <div className="modal-header">
        <span className="modal-title">Instrucciones</span>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">✕</button>
      </div>
      <div className="modal-body">
        <div className="section-label">Cómo participar</div>
        <div className="how-grid">
          <div className="how-card">
            <div className="step-num">1</div>
            <div className="how-text">
              <h3>Inicia sesión</h3>
              <p>Haz clic en <strong>Iniciar sesión</strong> y accede con tu cuenta de Google o GitHub.</p>
            </div>
          </div>
          <div className="how-card">
            <div className="step-num">2</div>
            <div className="how-text">
              <h3>Ingresa tus apuestas</h3>
              <p>Ve a <strong>✏️ Mis Apuestas</strong> y completa el marcador que predices para cada partido disponible. Tus apuestas se guardan automáticamente.</p>
            </div>
          </div>
          <div className="how-card">
            <div className="step-num">3</div>
            <div className="how-text">
              <h3>Apuestas Plus</h3>
              <p>En la misma sección puedes hacer predicciones de largo plazo: posiciones de grupos, top 4 del torneo y equipos que avanzan en eliminatoria.</p>
            </div>
          </div>
          <div className="how-card">
            <div className="step-num">4</div>
            <div className="how-text">
              <h3>Los marcadores se cierran solos</h3>
              <p>Una vez que un partido inicia, ya no puedes editar esa apuesta. ¡Aprovecha antes del pitazo inicial!</p>
            </div>
          </div>
          <div className="how-card">
            <div className="step-num">5</div>
            <div className="how-text">
              <h3>Sigue las posiciones</h3>
              <p>En <strong>Posiciones</strong> ves el ranking en tiempo real. En <strong>Partidos</strong> ves el historial de apuestas. En <strong>Estadísticas</strong> ves logros y gráficas.</p>
            </div>
          </div>
        </div>
        <div className="section-label" style={{ marginTop: '28px' }}>Sistema de puntos</div>
        <div className="pts-panel">
          <div className="pts-box"><div className="pts-n" style={{ color: '#4caf7d' }}>3</div><div className="pts-lbl">Marcador exacto</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#4a9eff' }}>1</div><div className="pts-lbl">Tendencia correcta</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#555' }}>0</div><div className="pts-lbl">Error</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#f0a500' }}>×1/2/3</div><div className="pts-lbl">Multiplicador Normal/Especial/Super</div></div>
        </div>
        <div className="section-label" style={{ marginTop: '28px' }}>Puntos Plus</div>
        <div className="pts-panel">
          <div className="pts-cat">Top 4 al final del torneo</div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#ffd700' }}>8</div><div className="pts-lbl">Campeón</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#c0c0c0' }}>5</div><div className="pts-lbl">Sub-Campeón</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#cd7f32' }}>4</div><div className="pts-lbl">3er Puesto</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#888' }}>3</div><div className="pts-lbl">4to Puesto</div></div>
          <div className="pts-cat">Grupos &amp; Eliminatoria (c/u)</div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#f5c518' }}>1</div><div className="pts-lbl">Convocatoria Colombia (c/u)</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#4a9eff' }}>2</div><div className="pts-lbl">Posición de grupo (c/u)</div></div>
          <div className="pts-box"><div className="pts-n" style={{ color: '#4caf7d' }}>2</div><div className="pts-lbl">Equipo que avanza (c/u)</div></div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="modal-back" onClick={onClose}>← Atrás</button>
      </div>
    </div>
  </div>
);

export default InstructionsModal;
