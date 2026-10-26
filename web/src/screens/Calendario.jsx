import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ACCENT, COLORS, softOf } from '../lib/theme.js';
import { makeMaps, parse, holidayName } from '../lib/model.js';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

export default function Calendario({ state, openTask, go }) {
  // abre no mês dos prazos do ciclo (mês seguinte ao Dia -1)
  const initial = useMemo(() => {
    const d = parse(state.cycle.cycleTarget || state.today);
    return { y: d.getFullYear(), m: d.getMonth() };
  }, [state]);
  const [cal, setCal] = useState(initial);
  const { catOf } = useMemo(() => makeMaps(state), [state]);
  const todayD = parse(state.today);

  const prev = () => setCal(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setCal(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  const { y, m } = cal;
  const dim = new Date(y, m + 1, 0).getDate();
  let lead = 0;
  for (let d = 1; d <= dim; d++) { const w = new Date(y, m, d).getDay(); if (w !== 0 && w !== 6) { lead = w - 1; break; } }

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push({ empty: true, key: 'e' + i });
  for (let d = 1; d <= dim; d++) {
    const wd = new Date(y, m, d).getDay();
    if (wd === 0 || wd === 6) continue;
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = y === todayD.getFullYear() && m === todayD.getMonth() && d === todayD.getDate();
    const all = state.tasks.filter((t) => t.due === iso);
    const feriado = holidayName(new Date(y, m, d));
    cells.push({ key: 'd' + d, day: d, iso, isToday, feriado, items: all.slice(0, 3), more: Math.max(0, all.length - 3) });
  }

  const iconBtn = { width: 40, height: 40, borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, background: '#fff',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.bodyText };

  return (
    <div style={{ background: '#fff', borderRadius: 18, boxShadow: COLORS.cardShadow, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '22px 20px' }}>
        <button style={iconBtn} onClick={prev}><ChevronLeft size={18} /></button>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: COLORS.titleText, margin: 0, minWidth: 200, textAlign: 'center' }}>{MONTH_NAMES[m]} de {y}</h2>
        <button style={iconBtn} onClick={next}><ChevronRight size={18} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', borderTop: `1px solid ${COLORS.borderSoft}` }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ padding: '12px 8px', textAlign: 'center', fontSize: 12, fontWeight: 700,
            color: COLORS.mutedText, letterSpacing: '0.04em', borderRight: `1px solid ${COLORS.borderSoft}`,
            borderBottom: `1px solid ${COLORS.borderSoft}` }}>{w}</div>
        ))}
        {cells.map((c) => c.empty ? (
          <div key={c.key} style={{ minHeight: 104, borderRight: `1px solid ${COLORS.borderSoft}`,
            borderBottom: `1px solid ${COLORS.borderSoft}`, background: 'oklch(0.985 0.005 260)' }} />
        ) : (
          <div key={c.key} style={{ minHeight: 104, padding: 8, borderRight: `1px solid ${COLORS.borderSoft}`,
            borderBottom: `1px solid ${COLORS.borderSoft}`,
            background: c.isToday ? softOf(ACCENT) : c.feriado ? 'oklch(0.965 0.02 60)' : '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ fontSize: 13, fontWeight: c.isToday ? 700 : 600, width: 26, height: 26, display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: '50%', flexShrink: 0,
                color: c.isToday ? '#fff' : c.feriado ? 'oklch(0.55 0.13 60)' : 'oklch(0.4 0.02 265)',
                background: c.isToday ? ACCENT : 'transparent' }}>{c.day}</div>
              {c.feriado && (
                <span title={c.feriado} style={{ fontSize: 9.5, fontWeight: 700, color: 'oklch(0.5 0.13 60)',
                  textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.feriado}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
              {c.items.map((t) => {
                const cat = catOf(t.cat); const done = t.status === 'done';
                return (
                  <div key={t.id} onClick={() => openTask(t.id)} title={t.title} style={{ fontSize: 11, padding: '2px 7px',
                    borderRadius: 6, color: done ? COLORS.mutedText : cat.color, background: softOf(cat.color), cursor: 'pointer',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: done ? 'line-through' : 'none' }}>{t.title}</div>
                );
              })}
              {c.more > 0 && <div onClick={() => go('tasks')} style={{ fontSize: 11, color: COLORS.mutedText, cursor: 'pointer', paddingLeft: 4 }}>+{c.more} mais</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
