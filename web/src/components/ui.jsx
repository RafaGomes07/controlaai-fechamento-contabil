// Pequenos componentes visuais reutilizados em várias telas.
import { avatarStyle, chip as chipStyle, softOf } from '../lib/theme.js';

export function Avatar({ member, size = 32, font }) {
  const m = member || { initials: '—', color: 'oklch(0.62 0.02 265)' };
  return <div style={avatarStyle(m.color, size, font || size * 0.36)}>{m.initials}</div>;
}

export function Chip({ color, children, style }) {
  return <span style={{ ...chipStyle(color, softOf(color)), ...style }}>{children}</span>;
}

export function ProgressBar({ pct, color, height = 6 }) {
  return (
    <div style={{ flex: 1, height, background: 'oklch(0.94 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 999 }} />
    </div>
  );
}

// Barra empilhada de status (concluída/andamento/atrasada/pendente)
export function StackedBar({ counts, total, colors, height = 10 }) {
  const seg = (n, c) => ({ width: `${total ? (n / total) * 100 : 0}%`, height: '100%', background: c });
  return (
    <div style={{ display: 'flex', height, borderRadius: 999, overflow: 'hidden', background: 'oklch(0.95 0.01 260)' }}>
      <div style={seg(counts.concluida, colors.concluida)} />
      <div style={seg(counts.andamento, colors.andamento)} />
      <div style={seg(counts.atrasada, colors.atrasada)} />
      <div style={seg(counts.pendente, colors.pendente)} />
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'oklch(0.4 0.02 265)', marginBottom: 7 }}>{label}</label>
      {children}
    </div>
  );
}
