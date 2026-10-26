// ---------------------------------------------------------------------------
// Regras de negócio (dias úteis, status efetivo, previsão, snapshot).
// Portado fielmente do protótipo de design, agora executado no servidor —
// a fonte da verdade de datas e autorização é o backend.
//
// Feriados: nacionais + estadual do Amazonas + municipais de Manaus (ver
// `holidaysOf`). Carnaval e Corpus Christi são ponto facultativo e NÃO entram
// — se o grupo passar a parar nesses dias, adicione em `HOLIDAYS`.
// ATENÇÃO: `web/src/lib/model.js` espelha esta lógica para os cálculos de
// exibição — alterações aqui precisam ser refletidas lá.
// ---------------------------------------------------------------------------

// Datas extra, fora do calendário oficial (recesso, ponto facultativo que a
// empresa decidiu parar, etc.). Ex.: HOLIDAYS.add('2026-12-24').
export const HOLIDAYS = new Set();

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher) — base das datas móveis.
function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=mar, 4=abr
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const holidayCache = new Map();

// Feriados de um ano (nacionais e os locais configurados abaixo).
export function holidaysOf(year) {
  if (holidayCache.has(year)) return holidayCache.get(year);
  const map = new Map();
  const add = (mm, dd, nome) => map.set(`${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, nome);
  // Nacionais fixos
  add(1, 1, 'Confraternização Universal');
  add(4, 21, 'Tiradentes');
  add(5, 1, 'Dia do Trabalho');
  add(9, 7, 'Independência');
  add(10, 12, 'N. Sra. Aparecida');
  add(11, 2, 'Finados');
  add(11, 15, 'Proclamação da República');
  add(11, 20, 'Consciência Negra'); // feriado nacional — Lei 14.759/2023
  add(12, 25, 'Natal');
  // Nacional móvel: Sexta-feira Santa = Páscoa − 2
  const gf = easterSunday(year);
  gf.setDate(gf.getDate() - 2);
  map.set(isoOf(gf), 'Sexta-feira Santa');
  // Estadual — Amazonas
  add(9, 5, 'Elevação do Amazonas');
  // Municipais — Manaus
  add(10, 24, 'Aniversário de Manaus');
  add(12, 8, 'N. Sra. da Conceição');
  holidayCache.set(year, map);
  return map;
}

export const holidayName = (d) => holidaysOf(d.getFullYear()).get(isoOf(d)) || null;

export function isHoliday(d) {
  return holidaysOf(d.getFullYear()).has(isoOf(d));
}

// Fuso oficial da empresa para o fechamento contábil. Fixo (sem DST
// no Brasil desde 2019) — usado explicitamente em vez do fuso do processo
// Node, porque hosts como Azure App Service normalmente rodam em UTC.
export const APP_TZ = 'America/Manaus';

// Componentes de data/hora de `date` no fuso `APP_TZ`, independente do fuso
// do processo Node.
export function partsInTZ(date, timeZone = APP_TZ) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    y: Number(p.year), m: Number(p.month), d: Number(p.day),
    hh: p.hour === '24' ? 0 : Number(p.hour), mm: Number(p.minute), ss: Number(p.second),
  };
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoOf(d) {
  return (
    d.getFullYear() +
    '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0')
  );
}

export function isBiz(d) {
  const w = d.getDay();
  if (w === 0 || w === 6) return false;
  if (HOLIDAYS.has(isoOf(d))) return false;
  if (isHoliday(d)) return false;
  return true;
}

// "today" do servidor, normalizado para meia-noite no fuso da aplicação
// (APP_TZ), não no fuso do processo Node.
export function today() {
  const { y, m, d } = partsInTZ(new Date());
  return new Date(y, m - 1, d);
}

export function diffDays(iso, ref = today()) {
  if (!iso) return 0;
  return Math.round((parseISO(iso) - ref) / 86400000);
}

// Conta dias úteis estritamente entre `a` (exclusivo) e `b` (inclusivo).
export function bizCount(a, b) {
  let n = 0;
  const d = new Date(a);
  while (d < b) {
    d.setDate(d.getDate() + 1);
    if (isBiz(d)) n++;
  }
  return n;
}

export function diaFromLabel(lbl) {
  const m = /Dia (-?\d+)/.exec(lbl || '');
  return m ? parseInt(m[1], 10) : 1;
}

// Dia N do ciclo -> data ISO. Dia -1 = cycleStart (último dia útil do mês de
// competência). Dia N>0 = N-ésimo dia útil a partir do cycleStart. Não há Dia 0.
export function diaToDue(cycleStartISO, n) {
  const d = parseISO(cycleStartISO); // Dia -1
  if (n > 0) {
    let k = n;
    while (k > 0) { d.setDate(d.getDate() + 1); if (isBiz(d)) k--; }
  } else if (n < -1) {
    let k = -n - 1;
    while (k > 0) { d.setDate(d.getDate() - 1); if (isBiz(d)) k--; }
  }
  return isoOf(d);
}

// Último dia útil do mês de competência de um ciclo 'MM/AAAA' (= Dia -1).
export function lastBizOfCompetence(cycleLabel) {
  const [mm, yy] = cycleLabel.split('/').map(Number);
  const d = new Date(yy, mm, 0); // último dia do mês mm
  while (!isBiz(d)) d.setDate(d.getDate() - 1);
  return isoOf(d);
}

// Periodicidades válidas e meses-padrão sugeridos (fiscal: fim de trimestre
// e fim de ano) — só um ponto de partida pro formulário; cada tarefa pode
// customizar os meses.
export const PERIODICITIES = ['Mensal', 'Bimestral', 'Trimestral', 'Anual'];
export const DEFAULT_PERIODIC_MONTHS = {
  Bimestral: [2, 4, 6, 8, 10, 12],
  Trimestral: [3, 6, 9, 12],
  Anual: [12],
};

// A tarefa é devida na competência `monthNum` (1-12)? Mensal (ou sem meses
// configurados, p/ compatibilidade com dado antigo) = sempre devida.
export function isDueInMonth(periodic, periodicMonths, monthNum) {
  if (periodic === 'Mensal' || !periodicMonths || !periodicMonths.length) return true;
  return periodicMonths.includes(monthNum);
}

export function nextCycleLabel(cycleLabel) {
  const [mm, yy] = cycleLabel.split('/').map(Number);
  const nm = mm === 12 ? 1 : mm + 1;
  const ny = mm === 12 ? yy + 1 : yy;
  return String(nm).padStart(2, '0') + '/' + ny;
}

// Status efetivo exibido (deriva do status bruto + prazo).
export function effStatus(t, ref = today()) {
  if (t.status === 'done') return 'concluida';
  if (t.status === 'review') return 'revisao';
  if (t.due && diffDays(t.due, ref) < 0) return 'atrasada';
  if (t.status === 'doing') return 'andamento';
  return 'pendente';
}

// Status bruto derivado do progresso (usado ao salvar tarefa).
export function statusFromProgress(p) {
  return p >= 100 ? 'done' : (p > 0 ? 'doing' : 'todo');
}

export function isBlocked(task, allTasks) {
  if (!task || !task.depends_on) return false;
  const p = allTasks.find((x) => x.id === task.depends_on);
  return !!p && p.status !== 'done';
}

export function priMeta(p) {
  if (p === 'alta') return { label: 'Alta', color: 'oklch(0.5 0.18 25)' };
  if (p === 'baixa') return { label: 'Baixa', color: 'oklch(0.5 0.02 265)' };
  return { label: 'Média', color: 'oklch(0.55 0.13 80)' };
}

export const STATUS_META = {
  pendente:  { label: 'Pendente',     color: 'oklch(0.5 0.02 265)' },
  andamento: { label: 'Em andamento', color: 'oklch(0.55 0.16 145)' },
  revisao:   { label: 'Em revisão',   color: 'oklch(0.55 0.16 300)' },
  atrasada:  { label: 'Atrasada',     color: 'oklch(0.5 0.18 25)' },
  concluida: { label: 'Concluída',    color: 'oklch(0.5 0.13 150)' },
};
