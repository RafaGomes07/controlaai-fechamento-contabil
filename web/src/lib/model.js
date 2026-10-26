// Cálculos derivados da UI (status efetivo, previsão, gantt, notificações,
// relatórios, comparativo). Portado do protótipo; consome o estado vindo do
// backend. As datas usam o "today" do servidor para consistência.
import { ACCENT, STATUS_COLORS, STATUS_META, softOf } from './theme.js';

const MONTHS_ABBR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS_ABBR = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

// Periodicidade das tarefas — espelha rules.js do servidor (meses fixos do
// calendário; ponto de partida sugerido no formulário, editável por tarefa).
export { MONTHS_ABBR };
export const PERIODICITIES = ['Mensal', 'Bimestral', 'Trimestral', 'Anual'];
export const DEFAULT_PERIODIC_MONTHS = {
  Bimestral: [2, 4, 6, 8, 10, 12],
  Trimestral: [3, 6, 9, 12],
  Anual: [12],
};
export function periodicLabel(periodic, months) {
  if (!periodic || periodic === 'Mensal') return 'Mensal';
  if (!months || !months.length) return periodic;
  return `${periodic} (${months.map((m) => MONTHS_ABBR[m - 1]).join(', ')})`;
}

export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// Feriados — ESPELHO de `server/src/rules.js` (holidaysOf/isBiz). O servidor é
// a fonte da verdade dos prazos; isto existe para que previsão, gantt e
// calendário contem os mesmos dias úteis. Manter as duas listas em sincronia.
// Nacionais + estadual do Amazonas + municipais de Manaus. Carnaval e Corpus
// Christi são ponto facultativo e não entram.
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const holidayCache = new Map();

export function holidaysOf(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const map = new Map();
  const add = (mm, dd, nome) => map.set(`${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, nome);
  add(1, 1, 'Confraternização Universal');
  add(4, 21, 'Tiradentes');
  add(5, 1, 'Dia do Trabalho');
  add(9, 7, 'Independência');
  add(10, 12, 'N. Sra. Aparecida');
  add(11, 2, 'Finados');
  add(11, 15, 'Proclamação da República');
  add(11, 20, 'Consciência Negra');
  add(12, 25, 'Natal');
  const gf = easterSunday(year); gf.setDate(gf.getDate() - 2);
  map.set(isoOf(gf), 'Sexta-feira Santa');
  add(9, 5, 'Elevação do Amazonas');       // estadual — AM
  add(10, 24, 'Aniversário de Manaus');    // municipal
  add(12, 8, 'N. Sra. da Conceição');      // municipal
  holidayCache.set(year, map);
  return map;
}

export const holidayName = (d) => holidaysOf(d.getFullYear()).get(isoOf(d)) || null;
export const isHoliday = (d) => holidaysOf(d.getFullYear()).has(isoOf(d));
export const isBiz = (d) => { const w = d.getDay(); return w !== 0 && w !== 6 && !isHoliday(d); };

export function bizCount(a, b) {
  let n = 0; const d = new Date(a);
  while (d < b) { d.setDate(d.getDate() + 1); if (isBiz(d)) n++; }
  return n;
}

export const diffDays = (todayD, iso) => (iso ? Math.round((parse(iso) - todayD) / 86400000) : 0);

export function diaFromLabel(lbl) { const m = /Dia (-?\d+)/.exec(lbl || ''); return m ? parseInt(m[1], 10) : 1; }

export function diaToDue(cycleStartISO, n) {
  const d = parse(cycleStartISO);
  if (n > 0) { let k = n; while (k > 0) { d.setDate(d.getDate() + 1); if (isBiz(d)) k--; } }
  else if (n < -1) { let k = -n - 1; while (k > 0) { d.setDate(d.getDate() - 1); if (isBiz(d)) k--; } }
  return isoOf(d);
}

export function effStatus(t, todayD) {
  if (t.status === 'done') return 'concluida';
  if (t.status === 'review') return 'revisao';
  if (t.due && diffDays(todayD, t.due) < 0) return 'atrasada';
  if (t.status === 'doing') return 'andamento';
  return 'pendente';
}

export function dueInfo(t, todayD) {
  if (!t.due || t.status === 'done') {
    return { label: t.status === 'done' ? 'Concluída' : 'Sem prazo', color: 'oklch(0.5 0.02 265)', bg: 'oklch(0.95 0.01 260)' };
  }
  const d = diffDays(todayD, t.due);
  if (d < 0) return { label: 'Atrasada', color: 'oklch(0.5 0.18 25)', bg: 'oklch(0.6 0.18 25 / 0.13)' };
  if (d === 0) return { label: 'Hoje', color: 'oklch(0.5 0.16 45)', bg: 'oklch(0.6 0.16 45 / 0.14)' };
  if (d === 1) return { label: 'Amanhã', color: 'oklch(0.5 0.12 75)', bg: 'oklch(0.62 0.13 75 / 0.16)' };
  const dt = parse(t.due);
  if (d <= 6) return { label: WEEKDAYS_ABBR[dt.getDay()], color: 'oklch(0.45 0.02 265)', bg: 'oklch(0.95 0.01 260)' };
  return { label: dt.getDate() + '/' + (dt.getMonth() + 1), color: 'oklch(0.45 0.02 265)', bg: 'oklch(0.95 0.01 260)' };
}

export function dueFull(iso) {
  const dt = parse(iso);
  return dt.getDate() + ' de ' + MONTHS_ABBR[dt.getMonth()] + ' de ' + dt.getFullYear();
}

export const fmtS = (d) => d.getDate() + ' ' + MONTHS_ABBR[d.getMonth()];
export const diaDueLabel = (iso) => { const dt = parse(iso); return WEEKDAYS_ABBR[dt.getDay()] + ', ' + dt.getDate() + ' ' + MONTHS_ABBR[dt.getMonth()]; };

export function nextCycleLabelFromState(cycleLabel) {
  const [mm, yy] = cycleLabel.split('/').map(Number);
  const nm = mm === 12 ? 1 : mm + 1;
  const ny = mm === 12 ? yy + 1 : yy;
  return String(nm).padStart(2, '0') + '/' + ny;
}

export function isBlocked(t, tasks) {
  if (!t || !t.dependsOn) return false;
  const p = tasks.find((x) => x.id === t.dependsOn);
  return !!p && p.status !== 'done';
}

export function todayLabel(todayD) {
  const wd = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][todayD.getDay()];
  const mn = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'][todayD.getMonth()];
  return `${wd}, ${todayD.getDate()} de ${mn} de ${todayD.getFullYear()}`;
}

// Autorização espelhada no cliente (apenas para exibição; o backend é a fonte).
// Dev não tem bypass por papel aqui — só quem tem vínculo direto com a
// tarefa decide: o aprovador explícito, ou o gestor do setor.
export function canApprove(me, t) {
  if (t.approver === me.id) return true;
  if (me.role === 'gestor') return (me.sectors || []).includes(t.cat) && t.assignee !== me.id;
  return false;
}

export function canManage(me, cat) {
  if (me.role === 'dev') return true;
  if (me.role === 'gestor') return (me.sectors || []).includes(cat);
  return false;
}

// ---------------------------------------------------------------------------
// Painel: setores, gantt, previsão de fechamento.
// ---------------------------------------------------------------------------
const HEALTH = {
  ok: { label: 'No prazo', color: 'oklch(0.5 0.13 150)' },
  atencao: { label: 'Atenção', color: 'oklch(0.6 0.13 78)' },
  critico: { label: 'Impactando', color: 'oklch(0.55 0.18 25)' },
};

export function computePanel(state) {
  const { tasks, sectors, cycle } = state;
  const todayD = parse(state.today);
  const catList = sectors;

  const es = (t) => effStatus(t, todayD);
  const totalAll = tasks.length || 1;
  const doneAll = tasks.filter((t) => es(t) === 'concluida').length;
  const scAnd = tasks.filter((t) => ['andamento', 'revisao'].includes(es(t))).length;
  const scAtr = tasks.filter((t) => es(t) === 'atrasada').length;
  const scPend = tasks.filter((t) => es(t) === 'pendente').length;
  const doneRate = Math.round((doneAll / totalAll) * 100);

  const sectorCards = catList.map((cat) => {
    const list = tasks.filter((t) => t.cat === cat.key);
    const tt = list.length;
    const conc = list.filter((t) => es(t) === 'concluida').length;
    const and = list.filter((t) => ['andamento', 'revisao'].includes(es(t))).length;
    const atr = list.filter((t) => es(t) === 'atrasada').length;
    const pend = list.filter((t) => es(t) === 'pendente').length;
    const pct = tt ? Math.round((conc / tt) * 100) : 0;
    let health = 'ok';
    if (atr >= 3 || pct < 40) health = 'critico';
    else if (atr > 0 || pct < 70) health = 'atencao';
    return {
      key: cat.key, label: cat.label, total: tt, conc, and, atr, pend, pct, health,
      healthLabel: HEALTH[health].label, healthColor: HEALTH[health].color,
      sub: `${atr} atrasadas · ${pend} pendentes · ${and} em andamento`,
    };
  }).filter((s) => s.total > 0).sort((a, b) => b.atr - a.atr || a.pct - b.pct);

  const critSectors = sectorCards.filter((s) => s.health === 'critico');

  // previsão de fechamento (dias úteis)
  const cycleStart = parse(cycle.cycleStart);
  const planned = parse(cycle.cycleTarget);
  const dues = tasks.map((t) => t.due).filter(Boolean).sort();
  const lastDue = parse(dues[dues.length - 1] || state.today);
  const beyondTarget = tasks.filter((t) => t.due && parse(t.due) > planned).length;
  const preCycle = todayD < cycleStart;
  const elapsed = Math.max(1, bizCount(cycleStart, todayD));
  // Ritmo real de conclusão (tarefas/dia útil) — SEM piso artificial. Zero é um
  // valor legítimo (nenhuma tarefa concluída ainda): nesse caso não existe uma
  // data de fechamento calculável (dividiria por zero), então tratamos como
  // "indeterminado" em vez de fabricar uma previsão otimista.
  const throughput = doneAll / elapsed;
  const openCount = totalAll - doneAll;
  const daysLeft = Math.max(0, bizCount(preCycle ? cycleStart : todayD, planned));
  const capacity = throughput * daysLeft;
  let slip = 0;
  const indeterminate = !preCycle && openCount > capacity && throughput === 0;
  if (!preCycle && !indeterminate && openCount > capacity) slip = Math.ceil((openCount - capacity) / throughput);
  const projected = new Date(planned);
  if (slip > 0) { let n = slip; while (n > 0) { projected.setDate(projected.getDate() + 1); if (isBiz(projected)) n--; } }
  const risk = indeterminate ? { label: 'Indeterminado', color: 'oklch(0.55 0.18 25)' }
    : slip <= 0 ? { label: 'No prazo', color: 'oklch(0.5 0.13 150)' }
    : slip <= 2 ? { label: 'Em risco', color: 'oklch(0.6 0.13 78)' }
      : { label: 'Atrasado', color: 'oklch(0.55 0.18 25)' };
  const span = Math.max(1, bizCount(cycleStart, planned));
  const todayPct = Math.min(100, Math.max(0, Math.round((bizCount(cycleStart, todayD) / span) * 100)));

  // gantt
  const ganttEnd = lastDue > planned ? lastDue : planned;
  const gSpan = Math.max(1, bizCount(cycleStart, ganttEnd));
  const gAxis = [];
  { let gi = 0; const gd = new Date(cycleStart);
    while (gi <= gSpan) { if (isBiz(gd)) { gAxis.push({ label: String(gd.getDate()), left: (gi / gSpan) * 100 }); gi++; } gd.setDate(gd.getDate() + 1); } }
  const gTodayPct = Math.min(100, Math.max(0, Math.round((bizCount(cycleStart, todayD) / gSpan) * 100)));
  const gMetaPct = Math.min(100, Math.round((bizCount(cycleStart, planned) / gSpan) * 100));
  const milestones = tasks.filter((t) => t.milestone && t.due).map((t) => ({
    id: t.id, title: t.title.replace('Marco — ', ''), done: t.status === 'done',
    left: Math.min(100, Math.round((bizCount(cycleStart, parse(t.due)) / gSpan) * 100)),
  }));
  const ganttRows = sectorCards.map((s) => {
    const list = tasks.filter((t) => t.cat === s.key && t.due).map((t) => parse(t.due).getTime());
    const mn = Math.min(...list), mx = Math.max(...list);
    const leftPct = (bizCount(cycleStart, new Date(mn)) / gSpan) * 100;
    const widthPct = Math.max(3, (bizCount(new Date(mn), new Date(mx)) / gSpan) * 100);
    const hm = HEALTH[s.health];
    let labelPos = 'inside';
    if (widthPct >= 15) labelPos = 'inside';
    else if (leftPct + widthPct > 85) labelPos = 'left';
    else labelPos = 'right';
    return { label: s.label, pct: s.pct, total: s.total, color: hm.color, leftPct, widthPct, labelPos, open: s.key };
  });

  return {
    sectorCards, critCount: critSectors.length,
    critNames: critSectors.map((s) => s.label).join(' · ') || 'Nenhum setor crítico',
    doneRate, doneAll, totalAll: tasks.length, scAnd, scAtr, scPend, scConc: doneAll,
    projectedLabel: indeterminate ? 'Sem previsão' : fmtS(projected), plannedLabel: fmtS(planned), daysLeft, slip,
    indeterminate, riskLabel: risk.label, riskColor: risk.color, todayPct, beyondTarget,
    startLabel: fmtS(cycleStart), endLabel: fmtS(planned),
    gantt: { axis: gAxis, todayPct: gTodayPct, metaPct: gMetaPct, milestones, rows: ganttRows, hasMilestones: milestones.length > 0 },
  };
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------
export function computeReports(state) {
  const { tasks, sectors } = state;
  const todayD = parse(state.today);
  const es = (t) => effStatus(t, todayD);
  const catsPresent = new Set(tasks.map((t) => t.cat));
  const byCat = sectors.filter((c) => catsPresent.has(c.key)).map((c) => ({
    label: c.label, count: tasks.filter((t) => t.cat === c.key).length, color: c.color,
  })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
  const maxCat = Math.max(1, ...byCat.map((c) => c.count));
  byCat.forEach((c) => { c.barPct = Math.round((c.count / maxCat) * 100); });

  const cConc = tasks.filter((t) => es(t) === 'concluida').length;
  const cAnd = tasks.filter((t) => ['andamento', 'revisao'].includes(es(t))).length;
  const cAtr = tasks.filter((t) => es(t) === 'atrasada').length;
  const cPend = tasks.filter((t) => es(t) === 'pendente').length;
  const tot = tasks.length || 1;
  const g1 = Math.round((cConc / tot) * 360);
  const g2 = g1 + Math.round((cAnd / tot) * 360);
  const g3 = g2 + Math.round((cAtr / tot) * 360);
  const cGreen = 'oklch(0.5 0.13 150)', cRed = 'oklch(0.55 0.18 25)', cGray = 'oklch(0.85 0.02 260)';
  const donut = `conic-gradient(${cGreen} 0deg ${g1}deg, ${ACCENT} ${g1}deg ${g2}deg, ${cRed} ${g2}deg ${g3}deg, ${cGray} ${g3}deg 360deg)`;
  const onTimeCount = tasks.filter((t) => t.status === 'done' && (!t.entrega || !t.due || parse(t.entrega) <= parse(t.due))).length;

  return {
    total: tasks.length, concluida: cConc, andamento: cAnd, atrasada: cAtr, pendente: cPend, byCat, donut,
    doneRate: Math.round((cConc / tot) * 100), onTime: Math.round((onTimeCount / Math.max(1, cConc)) * 100), lateTotal: cAtr,
  };
}

export function computeCompare(state) {
  const hist = state.history || [];
  const prevC = hist.length ? hist[hist.length - 1] : null;
  if (!prevC) return null;
  const todayD = parse(state.today);
  const panel = computePanel(state);
  const curByKey = {};
  panel.sectorCards.forEach((s) => { curByKey[s.key] = s; });
  const doneRate = panel.doneRate;
  const scAtr = panel.scAtr;
  const deltaMeta = (d) => d > 0 ? { label: `▲ +${d} pp`, color: 'oklch(0.45 0.13 150)' }
    : d < 0 ? { label: `▼ ${d} pp`, color: 'oklch(0.5 0.18 25)' }
      : { label: '= igual', color: 'oklch(0.55 0.02 265)' };
  const preCycle = todayD < parse(state.cycle.cycleStart);
  return {
    prevLabel: prevC.cycle, curLabel: state.cycle.cycle,
    prevPct: prevC.totals.pct, curPct: doneRate, prevLate: prevC.totals.late, curLate: scAtr,
    totalDelta: deltaMeta(doneRate - prevC.totals.pct),
    preCycleNote: preCycle ? `O ciclo ${state.cycle.cycle} inicia em ${fmtS(parse(state.cycle.cycleStart))} — os números atuais ainda são a base de partida.` : null,
    rows: prevC.sectors.map((ps) => {
      const cs = curByKey[ps.key];
      const curPct = cs ? cs.pct : 0; const curLate = cs ? cs.atr : 0;
      return { label: ps.label, prevPct: ps.pct, curPct, prevLate: ps.late, curLate,
        lateLabel: `${ps.late} → ${curLate}`, delta: deltaMeta(curPct - ps.pct) };
    }),
  };
}

export function procMetrics(state, reports) {
  const hist = state.history || [];
  const reopens = state.tasks.reduce((n, t) => n + (t.log || []).filter((l) => l.text === 'reabriu a tarefa').length, 0);
  return [
    ...hist.map((h) => ({ cycle: h.cycle, dtc: (h.daysToClose || '—') + ' dias úteis',
      onTime: (h.totals.onTimePct != null ? h.totals.onTimePct : '—') + '%', reopens: h.reopens || 0, isCurrent: false })),
    { cycle: state.cycle.cycle + ' (atual)', dtc: 'em curso', onTime: reports.onTime + '%', reopens, isCurrent: true },
  ];
}

// ---------------------------------------------------------------------------
// Notificações (por usuário)
// ---------------------------------------------------------------------------
export function computeNotifications(state) {
  const { tasks, me, members } = state;
  const todayD = parse(state.today);
  const memberName = (id) => (members.find((m) => m.id === id) || {}).name || '—';
  const out = [];
  const mk = (t, icon, text, color) => ({ id: t.id, icon, text, title: t.title, color });

  tasks.forEach((t) => {
    if (t.status === 'review' && canApprove(me, t)) out.push(mk(t, '✓', 'Aguarda sua aprovação', 'oklch(0.5 0.16 300)'));
    if (t.reopenRequest && canApprove(me, t) && t.reopenRequest.by !== me.id)
      out.push(mk(t, '↺', 'Solicitação de reabertura de ' + memberName(t.reopenRequest.by), 'oklch(0.5 0.16 300)'));
  });
  tasks.filter((t) => t.assignee === me.id).forEach((t) => {
    const lastLog = (t.log || [])[(t.log || []).length - 1];
    if (t.status === 'doing' && lastLog && lastLog.text.indexOf('reprovou') === 0)
      out.push(mk(t, '↩', 'Conclusão reprovada — revise e reenvie', 'oklch(0.5 0.18 25)'));
    if (t.status !== 'done' && t.status !== 'review' && t.dependsOn && !isBlocked(t, tasks)) {
      const p = tasks.find((x) => x.id === t.dependsOn);
      if (p && p.status === 'done') out.push(mk(t, '🔓', 'Antecessora concluída — pode iniciar', 'oklch(0.5 0.13 150)'));
    }
    if (t.status === 'review' && t.approver && t.approver !== me.id)
      out.push(mk(t, '⏳', 'Aguardando aprovação de ' + memberName(t.approver), 'oklch(0.5 0.16 300)'));
    if (t.reopenRequest && t.reopenRequest.by === me.id)
      out.push(mk(t, '⏳', 'Reabertura aguardando aprovação', 'oklch(0.5 0.16 300)'));
    const eff = effStatus(t, todayD);
    if (eff === 'atrasada') out.push(mk(t, '!', 'Atividade atrasada', 'oklch(0.5 0.18 25)'));
    else if (t.status !== 'done' && t.due && diffDays(todayD, t.due) === 0) out.push(mk(t, '●', 'Vence hoje', 'oklch(0.55 0.13 78)'));
  });
  return out;
}

// ---------------------------------------------------------------------------
// Equipe
// ---------------------------------------------------------------------------
// Membros "do meu time" — usado tanto na Equipe quanto no seletor de
// responsável ao criar/editar tarefa. Dev vê todos; gestor vê quem já tem
// tarefa no seu escopo OU cujo perfil aponta pro mesmo setor (cobre um
// usuário recém-criado, ainda sem nenhuma tarefa atribuída); usuário comum
// só a si mesmo.
export function scopedMembers(state, me) {
  const { tasks, members, sectors } = state;
  if (me.role === 'dev') return members;
  if (me.role === 'gestor') {
    const secLabels = (me.sectors || []).map((k) => (sectors.find((c) => c.key === k) || {}).label);
    const scopedIds = new Set(tasks.map((t) => t.assignee));
    return members.filter((m) => secLabels.includes(m.setor) || scopedIds.has(m.id) || m.id === me.id);
  }
  return members.filter((m) => m.id === me.id);
}

export function teamCards(state) {
  const { tasks, me } = state;
  const todayD = parse(state.today);
  const list = scopedMembers(state, me);

  return list.map((m) => {
    const mine = tasks.filter((t) => t.assignee === m.id);
    const cnt = mine.filter((t) => t.status !== 'done').length;
    const dc = mine.filter((t) => t.status === 'done').length;
    const od = mine.filter((t) => t.status !== 'done' && diffDays(todayD, t.due) < 0).length;
    return { ...m, count: cnt, doneCount: dc, overdue: od, loadPct: Math.min(100, Math.round((cnt / 6) * 100)), load: `${cnt}/6` };
  });
}

export function makeMaps(state) {
  const catMap = {};
  state.sectors.forEach((c) => { catMap[c.key] = c; });
  const memMap = {};
  state.members.forEach((m) => { memMap[m.id] = m; });
  return {
    catOf: (k) => catMap[k] || { label: '—', color: 'oklch(0.62 0.02 265)' },
    memberOf: (id) => memMap[id] || { name: 'Sem responsável', initials: '—', color: 'oklch(0.62 0.02 265)', setor: '—' },
  };
}

export { STATUS_COLORS, STATUS_META, softOf };
