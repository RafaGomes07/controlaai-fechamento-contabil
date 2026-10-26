// Linha de tarefa reutilizada em Tarefas (e listas do Painel).
import { Diamond, Lock } from 'lucide-react';
import { ACCENT, COLORS, STATUS_META, softOf, chip } from '../lib/theme.js';
import { effStatus, dueInfo, isBlocked, parse } from '../lib/model.js';

export default function TaskRow({ task, tasks, todayISO, catOf, memberOf, onOpen }) {
  const todayD = parse(todayISO);
  const es = effStatus(task, todayD);
  const sm = STATUS_META[es];
  const info = dueInfo(task, todayD);
  const blocked = isBlocked(task, tasks);
  const cat = catOf(task.cat);
  const mem = memberOf(task.assignee);
  const done = task.status === 'done';

  return (
    <div onClick={() => onOpen(task.id)} style={{ display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px', borderBottom: `1px solid ${COLORS.borderSoft}`, cursor: 'pointer' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      <div title={done ? 'Concluída' : 'Não concluída'} style={{ width: 19, height: 19, borderRadius: 6, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        border: done ? `2px solid ${ACCENT}` : '2px solid oklch(0.8 0.01 260)', background: done ? ACCENT : 'transparent' }}>
        {done && <span style={{ color: '#fff', fontSize: 12, fontWeight: 800, lineHeight: 1 }}>✓</span>}
      </div>

      {task.milestone && <Diamond size={13} fill="oklch(0.6 0.13 78)" color="oklch(0.6 0.13 78)" />}
      {blocked && <Lock size={13} color="oklch(0.5 0.02 265)" />}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.28 0.02 265)', overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: done ? 'line-through' : 'none' }}>{task.title}</div>
        <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 2, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.empresa}{task.periodic ? ' · ' + task.periodic : ''}</div>
      </div>

      <span style={{ ...chip(cat.color, softOf(cat.color)) }}>{cat.label}</span>
      <span style={{ ...chip(sm.color, softOf(sm.color)), width: 104, textAlign: 'center' }}>{sm.label}</span>

      <div style={{ width: 90, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ flex: 1, height: 6, background: 'oklch(0.94 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${task.progress}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
        </div>
        <span className="mono" style={{ fontSize: 11, color: COLORS.mutedText, width: 26, textAlign: 'right' }}>{task.progress}%</span>
      </div>

      <div style={{ width: 32, height: 32, borderRadius: '50%', background: mem.color, color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11.5, flexShrink: 0 }}>{mem.initials}</div>

      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20, color: info.color,
        background: info.bg, whiteSpace: 'nowrap', width: 78, textAlign: 'center' }}>{info.label}</span>
    </div>
  );
}
