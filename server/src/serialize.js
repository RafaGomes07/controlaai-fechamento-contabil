import { db } from './db.js';
import { partsInTZ } from './rules.js';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// created_at do SQLite vem como 'YYYY-MM-DD HH:MM:SS' em UTC. Convertido para
// APP_TZ explicitamente — não usar getHours()/getDate() do processo Node,
// pois hosts como Azure App Service normalmente rodam com o processo em UTC.
export function whenLabel(sqlTs) {
  if (!sqlTs) return '';
  const d = new Date(sqlTs.replace(' ', 'T') + 'Z');
  const dp = partsInTZ(d);
  const np = partsInTZ(new Date());
  const sameDay = dp.y === np.y && dp.m === np.m && dp.d === np.d;
  const hh = String(dp.hh).padStart(2, '0');
  const mm = String(dp.mm).padStart(2, '0');
  if (sameDay) return `hoje ${hh}:${mm}`;
  return `${dp.d} ${MONTHS[dp.m - 1]}`;
}

export function serializeUser(u, sectorsByUser) {
  return {
    id: u.id, name: u.name, full: u.full, resp: u.resp, setor: u.setor,
    email: u.email, initials: u.initials, color: u.color,
    role: u.role, sectors: sectorsByUser ? (sectorsByUser[u.id] || []) : undefined,
  };
}

export function allSectorsByUser() {
  const map = {};
  for (const r of db.prepare('SELECT user_id, cat_key FROM user_sectors').all()) {
    (map[r.user_id] || (map[r.user_id] = [])).push(r.cat_key);
  }
  return map;
}

export function serializeTask(t) {
  const comments = db.prepare(
    'SELECT c.*, u.name FROM task_comments c LEFT JOIN users u ON u.id=c.by_user WHERE c.task_id=? ORDER BY c.id'
  ).all(t.id).map((c) => ({ by: c.by_user, text: c.text, when: whenLabel(c.created_at) }));

  const evidence = db.prepare(
    'SELECT * FROM task_evidence WHERE task_id=? ORDER BY id'
  ).all(t.id).map((e) => ({ name: e.name, by: e.by_user, when: whenLabel(e.created_at) }));

  const log = db.prepare(
    'SELECT * FROM task_log WHERE task_id=? ORDER BY id'
  ).all(t.id).map((l) => ({ by: l.by_user, text: l.text, when: whenLabel(l.created_at) }));

  const checklist = db.prepare(
    'SELECT * FROM task_checklist WHERE task_id=? ORDER BY ord, id'
  ).all(t.id).map((c) => ({ text: c.text, done: !!c.done }));

  return {
    id: t.id, title: t.title, obs: t.obs || '', empresa: t.empresa || '',
    cat: t.cat, assignee: t.assignee, approver: t.approver || null,
    periodic: t.periodic,
    periodicMonths: t.periodic_months ? t.periodic_months.split(',').map(Number) : [],
    dia: t.dia, due: t.due, entrega: t.entrega || null,
    status: t.status, progress: t.progress, priority: t.priority,
    milestone: !!t.milestone, dependsOn: t.depends_on || null,
    reopenRequest: t.reopen_by ? { by: t.reopen_by, reason: t.reopen_reason, when: whenLabel(t.reopen_when) } : null,
    comments, evidence, log, checklist,
  };
}

export function serializeHistory(row) {
  return {
    cycle: row.cycle, start: row.start, end: row.end,
    daysToClose: row.days_to_close, reopens: row.reopens,
    totals: JSON.parse(row.totals_json || '{}'),
    sectors: JSON.parse(row.sectors_json || '[]'),
  };
}
