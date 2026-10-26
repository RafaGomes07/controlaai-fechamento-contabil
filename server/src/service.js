// Operações de negócio sobre tarefas e ciclos. Cada função aplica a regra
// exatamente como o protótipo e valida autorização no servidor.
import { db, getActiveCycle } from './db.js';
import {
  diaToDue, diaFromLabel, effStatus, statusFromProgress, isBlocked,
  bizCount, parseISO, isoOf, today, nextCycleLabel, lastBizOfCompetence,
  PERIODICITIES, isDueInMonth,
} from './rules.js';
import { canManage, canApprove, isOwnTask, scopeFilter } from './authz.js';
import { serializeTask } from './serialize.js';

export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

const getTaskRow = (id) => db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
const cycleTaskRows = (cycleId) => db.prepare('SELECT * FROM tasks WHERE cycle_id = ?').all(cycleId);

const log = (taskId, byUser, text) =>
  db.prepare('INSERT INTO task_log (task_id, by_user, text) VALUES (?,?,?)').run(taskId, byUser, text);
const comment = (taskId, byUser, text) =>
  db.prepare('INSERT INTO task_comments (task_id, by_user, text) VALUES (?,?,?)').run(taskId, byUser, text);

function loadTaskForCtx(ctx, id) {
  const t = getTaskRow(id);
  if (!t) throw new HttpError(404, 'Tarefa não encontrada.');
  if (!scopeFilter(ctx)(t)) throw new HttpError(403, 'Fora do seu escopo.');
  return t;
}

function blockedGuard(t) {
  if (isBlocked(t, cycleTaskRows(t.cycle_id))) {
    throw new HttpError(409, 'Tarefa bloqueada: aguarda a antecessora ser concluída.', 'blocked');
  }
}

// --- mudança de status (usuário e gestor/dev) ---------------------------------
export function setStatus(ctx, id, newStatus, obs) {
  const t = loadTaskForCtx(ctx, id);
  const me = ctx.user.id;

  const authorized = isOwnTask(ctx, t) || canManage(ctx, t.cat);
  if (!authorized) throw new HttpError(403, 'Sem permissão para alterar esta tarefa.');
  if (!['doing', 'done'].includes(newStatus)) throw new HttpError(400, 'Status inválido.');

  if (t.status === 'done') {
    if (newStatus === 'doing') return requestReopen(ctx, id, obs);
    return serializeTask(t);
  }
  blockedGuard(t);

  const wasLate = effStatus(t) === 'atrasada';
  const cleanObs = (obs || '').trim();
  if (wasLate && !cleanObs) throw new HttpError(422, 'Justificativa obrigatória para tarefa atrasada.', 'needObs');

  const tx = db.transaction(() => {
    if (newStatus === 'done') {
      const needsApproval = t.approver && t.approver !== me;
      if (needsApproval) {
        db.prepare("UPDATE tasks SET status='review' WHERE id=?").run(id);
        log(id, me, 'concluiu e enviou para aprovação' + (wasLate ? ' · justificativa: ' + cleanObs : ''));
      } else {
        db.prepare("UPDATE tasks SET status='done', progress=100, entrega=? WHERE id=?").run(isoOf(today()), id);
        log(id, me, 'concluiu a tarefa' + (wasLate ? ' · justificativa: ' + cleanObs : ''));
      }
    } else {
      const p = t.progress >= 100 ? 50 : t.progress;
      db.prepare("UPDATE tasks SET status='doing', progress=? WHERE id=?").run(p, id);
      log(id, me, 'iniciou a tarefa' + (wasLate ? ' · justificativa: ' + cleanObs : ''));
    }
    if (wasLate) comment(id, me, 'Justificativa de atraso: ' + cleanObs);
  });
  tx();
  return serializeTask(getTaskRow(id));
}

// --- aprovação de conclusão ---------------------------------------------------
export function approveTask(ctx, id) {
  const t = loadTaskForCtx(ctx, id);
  if (t.status !== 'review') throw new HttpError(409, 'Tarefa não está em revisão.');
  if (!canApprove(ctx, t)) throw new HttpError(403, 'Você não é o aprovador desta tarefa.');
  const tx = db.transaction(() => {
    db.prepare("UPDATE tasks SET status='done', progress=100, entrega=? WHERE id=?").run(isoOf(today()), id);
    log(id, ctx.user.id, 'aprovou a conclusão');
  });
  tx();
  return serializeTask(getTaskRow(id));
}

export function rejectTask(ctx, id, reason) {
  const t = loadTaskForCtx(ctx, id);
  if (t.status !== 'review') throw new HttpError(409, 'Tarefa não está em revisão.');
  if (!canApprove(ctx, t)) throw new HttpError(403, 'Você não é o aprovador desta tarefa.');
  const r = (reason || '').trim();
  if (!r) throw new HttpError(422, 'Descreva o motivo da reprovação.', 'needObs');
  const tx = db.transaction(() => {
    db.prepare("UPDATE tasks SET status='doing', progress=MIN(progress,80) WHERE id=?").run(id);
    log(id, ctx.user.id, 'reprovou a conclusão: ' + r);
    comment(id, ctx.user.id, 'Reprovação: ' + r);
  });
  tx();
  return serializeTask(getTaskRow(id));
}

// --- reabertura de concluída --------------------------------------------------
export function requestReopen(ctx, id, reason) {
  const t = loadTaskForCtx(ctx, id);
  if (t.status !== 'done') throw new HttpError(409, 'A tarefa não está concluída.');
  const authorized = canManage(ctx, t.cat) || isOwnTask(ctx, t);
  if (!authorized) throw new HttpError(403, 'Sem permissão para reabrir esta tarefa.');
  const r = (reason || '').trim();
  if (!r) throw new HttpError(422, 'Justificativa obrigatória para reabrir tarefa concluída.', 'needObs');
  const me = ctx.user.id;

  const tx = db.transaction(() => {
    if (t.approver && t.approver !== me) {
      // vira solicitação; a tarefa continua done até o aprovador decidir
      db.prepare("UPDATE tasks SET reopen_by=?, reopen_reason=?, reopen_when=datetime('now') WHERE id=?")
        .run(me, r, id);
      log(id, me, 'solicitou reabertura: ' + r);
    } else {
      db.prepare("UPDATE tasks SET status='doing', progress=80, entrega=NULL, reopen_by=NULL, reopen_reason=NULL, reopen_when=NULL WHERE id=?")
        .run(id);
      log(id, me, 'reabriu a tarefa: ' + r);
      comment(id, me, 'Reabertura: ' + r);
    }
  });
  tx();
  return serializeTask(getTaskRow(id));
}

export function approveReopen(ctx, id) {
  const t = loadTaskForCtx(ctx, id);
  if (!t.reopen_by) throw new HttpError(409, 'Não há solicitação de reabertura.');
  if (!canApprove(ctx, t)) throw new HttpError(403, 'Você não pode decidir esta reabertura.');
  const tx = db.transaction(() => {
    db.prepare("UPDATE tasks SET status='doing', progress=80, entrega=NULL, reopen_by=NULL, reopen_reason=NULL, reopen_when=NULL WHERE id=?").run(id);
    log(id, ctx.user.id, 'aprovou a reabertura');
  });
  tx();
  return serializeTask(getTaskRow(id));
}

export function denyReopen(ctx, id) {
  const t = loadTaskForCtx(ctx, id);
  if (!t.reopen_by) throw new HttpError(409, 'Não há solicitação de reabertura.');
  if (!canApprove(ctx, t)) throw new HttpError(403, 'Você não pode decidir esta reabertura.');
  const tx = db.transaction(() => {
    db.prepare("UPDATE tasks SET reopen_by=NULL, reopen_reason=NULL, reopen_when=NULL WHERE id=?").run(id);
    log(id, ctx.user.id, 'negou a reabertura');
  });
  tx();
  return serializeTask(getTaskRow(id));
}

// --- comentários / evidências / checklist ------------------------------------
export function addComment(ctx, id, text) {
  const t = loadTaskForCtx(ctx, id);
  const txt = (text || '').trim();
  if (!txt) throw new HttpError(422, 'Comentário vazio.');
  comment(id, ctx.user.id, txt);
  return serializeTask(t);
}

export function addEvidence(ctx, id, name) {
  const t = loadTaskForCtx(ctx, id);
  const canAdd = ctx.user.role !== 'usuario' || isOwnTask(ctx, t);
  if (!canAdd) throw new HttpError(403, 'Sem permissão para anexar evidência.');
  const nm = (name || '').trim();
  if (!nm) throw new HttpError(422, 'Informe o nome do arquivo ou link.');
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO task_evidence (task_id, name, by_user) VALUES (?,?,?)').run(id, nm, ctx.user.id);
    log(id, ctx.user.id, 'anexou evidência: ' + nm);
  });
  tx();
  return serializeTask(getTaskRow(id));
}

export function toggleChecklist(ctx, id, idx) {
  const t = loadTaskForCtx(ctx, id);
  if (!(canManage(ctx, t.cat) || isOwnTask(ctx, t))) throw new HttpError(403, 'Sem permissão.');
  const items = db.prepare('SELECT * FROM task_checklist WHERE task_id=? ORDER BY ord, id').all(id);
  const item = items[idx];
  if (item) db.prepare('UPDATE task_checklist SET done=? WHERE id=?').run(item.done ? 0 : 1, item.id);
  return serializeTask(t);
}

// --- criar / editar -----------------------------------------------------------
function normalizeForm(form) {
  const n = Number(form.diaNum) || 1;
  const diaNum = n === 0 ? 1 : Math.max(-5, Math.min(21, n));
  const periodic = PERIODICITIES.includes(form.periodic) ? form.periodic : 'Mensal';
  // null p/ Mensal (não se aplica); array (pode vir vazio — normalizeForm não
  // valida obrigatoriedade, quem chama decide se barra ou não) pras demais.
  const periodicMonths = periodic === 'Mensal' ? null
    : (Array.isArray(form.periodicMonths) ? form.periodicMonths.map(Number).filter((m) => m >= 1 && m <= 12) : []);
  return {
    title: (form.title || '').trim(),
    obs: form.desc || '',
    assignee: form.assignee || null,
    approver: form.approver || null,
    cat: form.cat,
    priority: form.priority || 'media',
    progress: Math.max(0, Math.min(100, Number(form.progress) || 0)),
    diaNum,
    dependsOn: form.dependsOn ? Number(form.dependsOn) : null,
    milestone: form.milestone ? 1 : 0,
    empresa: form.empresa || '',
    periodic,
    periodicMonths,
  };
}

const monthsToCsv = (months) => (months && months.length ? months.slice().sort((a, b) => a - b).join(',') : null);

export function createTask(ctx, form) {
  const cycle = getActiveCycle();
  const f = normalizeForm(form);
  if (!f.title) throw new HttpError(422, 'Informe o título da tarefa.');
  if (!f.cat) throw new HttpError(422, 'Selecione o setor.');
  if (ctx.user.role === 'usuario') throw new HttpError(403, 'Usuário não pode criar tarefas.');
  if (!canManage(ctx, f.cat)) throw new HttpError(403, 'Fora do seu escopo de setores.');
  if (f.periodic !== 'Mensal' && !f.periodicMonths.length) {
    throw new HttpError(422, 'Selecione ao menos um mês para essa periodicidade.');
  }

  const due = diaToDue(cycle.cycle_start, f.diaNum);
  const status = statusFromProgress(f.progress);
  const id = db.prepare(`INSERT INTO tasks
    (cycle_id, title, obs, empresa, cat, assignee, approver, periodic, periodic_months, dia, due, status, progress, priority, milestone, depends_on)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    cycle.id, f.title, f.obs, f.empresa, f.cat, f.assignee, f.approver, f.periodic, monthsToCsv(f.periodicMonths),
    'Dia ' + f.diaNum, due, status, f.progress, f.priority, f.milestone, f.dependsOn
  ).lastInsertRowid;
  log(id, ctx.user.id, 'criou a tarefa');
  return serializeTask(getTaskRow(id));
}

export function editTask(ctx, id, form) {
  const cycle = getActiveCycle();
  const orig = loadTaskForCtx(ctx, id);
  const f = normalizeForm(form);
  if (!f.title) throw new HttpError(422, 'Informe o título da tarefa.');
  if (!canManage(ctx, orig.cat) || !canManage(ctx, f.cat)) throw new HttpError(403, 'Fora do seu escopo.');
  if (f.periodic !== 'Mensal' && !f.periodicMonths.length) {
    throw new HttpError(422, 'Selecione ao menos um mês para essa periodicidade.');
  }

  const me = ctx.user.id;
  const wasLate = effStatus(orig) === 'atrasada';
  const newStatus = statusFromProgress(f.progress);
  const reopening = orig.status === 'done' && newStatus !== 'done';
  const cleanObs = (form.editObs || '').trim();

  if (wasLate && !cleanObs) throw new HttpError(422, 'Justificativa obrigatória para atividade atrasada.', 'needObs');
  if (reopening && !cleanObs) throw new HttpError(422, 'Justificativa obrigatória para reabrir tarefa concluída.', 'needObs');

  const due = diaToDue(cycle.cycle_start, f.diaNum);
  const reopenViaApprover = reopening && orig.approver && orig.approver !== me;

  const tx = db.transaction(() => {
    const base = db.prepare(`UPDATE tasks SET title=?, obs=?, empresa=?, cat=?, assignee=?, approver=?,
      periodic=?, periodic_months=?, dia=?, due=?, priority=?, milestone=?, depends_on=? WHERE id=?`);
    base.run(f.title, f.obs, f.empresa, f.cat, f.assignee, f.approver,
      f.periodic, monthsToCsv(f.periodicMonths), 'Dia ' + f.diaNum, due, f.priority, f.milestone, f.dependsOn, id);

    if (wasLate) comment(id, me, 'Justificativa de atraso: ' + cleanObs);

    if (reopenViaApprover) {
      db.prepare("UPDATE tasks SET status='done', progress=100, reopen_by=?, reopen_reason=?, reopen_when=datetime('now') WHERE id=?")
        .run(me, cleanObs, id);
      log(id, me, 'editou a tarefa e solicitou reabertura: ' + cleanObs);
    } else {
      db.prepare('UPDATE tasks SET status=?, progress=?, entrega=? WHERE id=?')
        .run(newStatus, f.progress, reopening ? null : orig.entrega, id);
      const text = reopening
        ? 'reabriu a tarefa: ' + cleanObs
        : 'editou a tarefa' + (wasLate ? ' · justificativa: ' + cleanObs : '');
      log(id, me, text);
    }
  });
  tx();
  return serializeTask(getTaskRow(id));
}

// --- duplicar (dev/gestor) ----------------------------------------------------
export function duplicateTask(ctx, id) {
  const orig = loadTaskForCtx(ctx, id);
  if (ctx.user.role === 'usuario') throw new HttpError(403, 'Sem permissão para duplicar tarefas.');
  if (!canManage(ctx, orig.cat)) throw new HttpError(403, 'Fora do seu escopo de setores.');

  const newId = db.prepare(`INSERT INTO tasks
    (cycle_id, title, obs, empresa, cat, assignee, approver, periodic, periodic_months, dia, due, status, progress, priority, milestone, depends_on)
    VALUES (?,?,?,?,?,?,?,?,?,?,?, 'todo', 0, ?, ?, ?)`).run(
    orig.cycle_id, orig.title + ' (cópia)', orig.obs, orig.empresa, orig.cat, orig.assignee, orig.approver,
    orig.periodic, orig.periodic_months, orig.dia, orig.due, orig.priority, orig.milestone, orig.depends_on
  ).lastInsertRowid;
  log(newId, ctx.user.id, 'duplicou a tarefa #' + orig.id);
  return serializeTask(getTaskRow(newId));
}

// --- encerramento de ciclo (dev) ---------------------------------------------
export function cycleSnapshot(cycle) {
  const cats = db.prepare('SELECT * FROM sectors ORDER BY ord').all();
  const tasks = cycleTaskRows(cycle.id);
  const secStats = {};
  cats.forEach((c) => { secStats[c.key] = { key: c.key, label: c.label, total: 0, done: 0, onTime: 0, late: 0 }; });
  const tot = { total: 0, done: 0, onTime: 0, late: 0 };
  const end = parseISO(cycle.cycle_target);

  tasks.forEach((t) => {
    const s = secStats[t.cat];
    if (!s) return;
    s.total++; tot.total++;
    const done = t.status === 'done';
    const late = (!done && t.due && parseISO(t.due) < today())
      || (done && t.entrega && t.due && parseISO(t.entrega) > parseISO(t.due));
    if (done) { s.done++; tot.done++; if (!late) { s.onTime++; tot.onTime++; } }
    if (late) { s.late++; tot.late++; }
  });

  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const entregas = tasks.filter((t) => t.status === 'done' && t.entrega).map((t) => t.entrega).sort();
  const lastEnt = entregas.length ? parseISO(entregas[entregas.length - 1]) : end;
  const daysToClose = Math.max(1, bizCount(parseISO(cycle.cycle_start), lastEnt > end ? lastEnt : end));
  const reopens = db.prepare(
    `SELECT COUNT(*) n FROM task_log l JOIN tasks t ON t.id=l.task_id
     WHERE t.cycle_id=? AND l.text='reabriu a tarefa'`
  ).get(cycle.id).n;

  return {
    cycle: cycle.cycle, start: cycle.cycle_start, end: cycle.cycle_target, daysToClose, reopens,
    totals: { total: tot.total, done: tot.done, pct: pct(tot.done, tot.total), onTimePct: pct(tot.onTime, tot.total), late: tot.late },
    sectors: Object.values(secStats).filter((s) => s.total > 0)
      .map((s) => ({ key: s.key, label: s.label, total: s.total, done: s.done, pct: pct(s.done, s.total), onTimePct: pct(s.onTime, s.total), late: s.late })),
  };
}

export function closeCycle(ctx) {
  if (ctx.user.role !== 'dev') throw new HttpError(403, 'Apenas o Desenvolvedor pode encerrar o ciclo.');
  const cycle = getActiveCycle();
  const snap = cycleSnapshot(cycle);
  const nextLabel = nextCycleLabel(cycle.cycle);
  const newStart = lastBizOfCompetence(nextLabel); // Dia -1 do próximo ciclo = último dia útil do mês de competência dele
  const newTarget = diaToDue(newStart, 5);
  const oldTasks = cycleTaskRows(cycle.id);

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO cycle_history (cycle, start, end, days_to_close, reopens, totals_json, sectors_json)
      VALUES (?,?,?,?,?,?,?)`).run(
      snap.cycle, snap.start, snap.end, snap.daysToClose, snap.reopens,
      JSON.stringify(snap.totals), JSON.stringify(snap.sectors));

    db.prepare("UPDATE cycles SET status='closed' WHERE id=?").run(cycle.id);
    const newCycleId = db.prepare(
      `INSERT INTO cycles (cycle, cycle_start, cycle_target, status) VALUES (?,?,?, 'active')`
    ).run(nextLabel, newStart, newTarget).lastInsertRowid;

    // Regenera o cronograma-modelo: mesmas tarefas/responsáveis/dependências/
    // aprovadores/marcos, zerando status/progresso/entregas e recalculando prazos.
    // Tarefa não-mensal só entra se o mês do próximo ciclo está nos meses
    // configurados dela (ex.: trimestral com meses 3,6,9,12 não regenera em
    // qualquer outro mês) — sem isso, toda tarefa "trimestral"/"anual" virava
    // mensal na prática, reaparecendo em todo fechamento.
    const nextMonthNum = Number(nextLabel.split('/')[0]);
    const idMap = {};
    const insTask = db.prepare(`INSERT INTO tasks
      (cycle_id, title, obs, empresa, cat, assignee, approver, periodic, periodic_months, dia, due, status, progress, priority, milestone, depends_on)
      VALUES (?,?,?,?,?,?,?,?,?,?,?, 'todo', 0, ?, ?, NULL)`);
    const seedActor = ctx.user.id;
    for (const t of oldTasks) {
      const monthsArr = t.periodic_months ? t.periodic_months.split(',').map(Number) : [];
      if (!isDueInMonth(t.periodic, monthsArr, nextMonthNum)) continue;
      const due = diaToDue(newStart, diaFromLabel(t.dia));
      const newId = insTask.run(newCycleId, t.title, t.obs, t.empresa, t.cat, t.assignee, t.approver,
        t.periodic, t.periodic_months, t.dia, due, t.priority, t.milestone).lastInsertRowid;
      idMap[t.id] = newId;
      log(newId, seedActor, 'criou a tarefa');
    }
    // remapeia dependências para os novos ids (só entre tarefas que de fato
    // foram regeneradas — uma tarefa cuja antecessora ficou de fora este mês
    // simplesmente nasce sem dependência, em vez de apontar pra um id morto)
    const upd = db.prepare('UPDATE tasks SET depends_on=? WHERE id=?');
    for (const t of oldTasks) {
      if (idMap[t.id] && t.depends_on && idMap[t.depends_on]) upd.run(idMap[t.depends_on], idMap[t.id]);
    }
  });
  tx();
  return { cycle: nextLabel };
}
