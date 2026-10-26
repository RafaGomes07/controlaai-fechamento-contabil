// Design tokens do ControlaAí (verde da marca). Valores finais do handoff.
export const ACCENT = 'oklch(0.55 0.16 145)'; // verde da marca (#2F9E46 aprox.)

export const COLORS = {
  appBg: 'oklch(0.97 0.008 260)',
  card: '#ffffff',
  border: 'oklch(0.93 0.01 260)',
  borderSoft: 'oklch(0.95 0.01 260)',
  inputBorder: 'oklch(0.9 0.01 260)',
  titleText: 'oklch(0.25 0.03 265)',
  bodyText: 'oklch(0.38 0.02 265)',
  mutedText: 'oklch(0.55 0.02 265)',
  hoverBg: 'oklch(0.98 0.01 265)',
  cardShadow: '0 2px 8px oklch(0.5 0.05 265 / 0.06)',
};

export const STATUS_COLORS = {
  concluida: 'oklch(0.5 0.13 150)',
  andamento: ACCENT,
  revisao: 'oklch(0.55 0.16 300)',
  atrasada: 'oklch(0.55 0.18 25)',
  pendente: 'oklch(0.83 0.02 260)',
  amber: 'oklch(0.6 0.13 78)',
};

export const STATUS_META = {
  pendente: { label: 'Pendente', color: 'oklch(0.5 0.02 265)' },
  andamento: { label: 'Em andamento', color: ACCENT },
  revisao: { label: 'Em revisão', color: 'oklch(0.55 0.16 300)' },
  atrasada: { label: 'Atrasada', color: 'oklch(0.5 0.18 25)' },
  concluida: { label: 'Concluída', color: 'oklch(0.5 0.13 150)' },
};

export const ROLE_META = {
  dev: { label: 'Desenvolvedor', color: 'oklch(0.55 0.16 300)' },
  gestor: { label: 'Gestor', color: ACCENT },
  usuario: { label: 'Usuário', color: 'oklch(0.5 0.02 265)' },
};

export function priMeta(p) {
  if (p === 'alta') return { label: 'Alta', color: 'oklch(0.5 0.18 25)' };
  if (p === 'baixa') return { label: 'Baixa', color: 'oklch(0.5 0.02 265)' };
  return { label: 'Média', color: 'oklch(0.55 0.13 80)' };
}

// Converte uma cor em sua variante "soft" (alpha ~0.13).
export function softOf(color) {
  if (!color) return 'oklch(0.5 0.02 265 / 0.13)';
  if (color[0] === '#') {
    const hx = color.slice(1);
    const f = hx.length === 3 ? hx.split('').map((c) => c + c).join('') : hx;
    const n = parseInt(f, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0.14)`;
  }
  return color.replace(')', ' / 0.13)');
}

export function chip(color, soft) {
  return {
    fontSize: '11.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
    color, background: soft || softOf(color), whiteSpace: 'nowrap', display: 'inline-block',
  };
}

export function avatarStyle(color, size = 32, font = 11.5) {
  return {
    width: size + 'px', height: size + 'px', borderRadius: '50%', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: font + 'px', flexShrink: 0, background: color,
  };
}

export const cardStyle = {
  background: COLORS.card, borderRadius: '18px', padding: '20px 22px', boxShadow: COLORS.cardShadow,
};

export const inputStyle = {
  width: '100%', padding: '11px 14px', borderRadius: '11px',
  border: `1px solid ${COLORS.inputBorder}`, fontSize: '14px',
};

export const primaryBtn = {
  background: ACCENT, color: '#fff', border: 'none', padding: '10px 18px',
  borderRadius: '11px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};

export const ghostBtn = {
  background: '#fff', color: COLORS.bodyText, border: `1px solid ${COLORS.inputBorder}`,
  padding: '9px 16px', borderRadius: '11px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
};

export const sectionTitle = {
  fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
  color: COLORS.mutedText, marginBottom: '14px',
};
