// Semeia o banco a partir de `dados.seed.js` (cronograma fictício, ciclo do mês anterior).
// Uso:  node src/seed.js         -> semeia apenas se o banco estiver vazio
//       node src/seed.js --force -> apaga tudo e semeia de novo
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { config } from './config.js';
import { DATA } from './dados.seed.js';
import { diaToDue, diaFromLabel, DEFAULT_PERIODIC_MONTHS } from './rules.js';

// Papéis iniciais (governança) — espelha o protótipo.
const DEV_EMAILS = ['admin@exemplo.com.br'];
const GESTOR_EMAILS = [
  'marina.castro@exemplo.com.br', 'paulo.mendes@exemplo.com.br', 'renata.lopes@exemplo.com.br',
  'tiago.moura@exemplo.com.br', 'carla.nunes@exemplo.com.br',
];

const SEED_COMPANIES = ['Empresa Alfa', 'Empresa Beta', 'Holding Exemplo'];

const wipe = db.transaction(() => {
  for (const t of ['task_log', 'task_comments', 'task_evidence', 'task_checklist', 'tasks',
    'cycle_history', 'cycles', 'user_sectors', 'users', 'sectors', 'companies', 'removed_companies']) {
    db.exec(`DELETE FROM ${t}`);
  }
});

const buildSeed = (force) => db.transaction(() => {
  if (force) wipe();

  // --- setores ---
  const labelToKey = {};
  const insSector = db.prepare('INSERT INTO sectors (key, label, color, ord) VALUES (?,?,?,?)');
  Object.keys(DATA.cats).forEach((key, i) => {
    const c = DATA.cats[key];
    insSector.run(key, c.label, c.color, i);
    labelToKey[c.label] = key;
  });

  // --- usuários ---
  const hash = bcrypt.hashSync(config.seedPassword, 10);
  const insUser = db.prepare(`INSERT INTO users
    (id, name, full, resp, setor, email, initials, color, password_hash, role)
    VALUES (@id,@name,@full,@resp,@setor,@email,@initials,@color,@hash,@role)`);
  const insUserSector = db.prepare('INSERT INTO user_sectors (user_id, cat_key) VALUES (?,?)');

  for (const m of DATA.members) {
    const email = (m.email || '').toLowerCase();
    let role = 'usuario';
    if (DEV_EMAILS.includes(email)) role = 'dev';
    else if (GESTOR_EMAILS.includes(email)) role = 'gestor';
    insUser.run({
      id: m.id, name: m.name, full: m.full || m.name, resp: m.resp || m.name,
      setor: m.setor || '—', email, initials: m.initials, color: m.color, hash, role,
    });
    if (role === 'gestor') {
      const k = labelToKey[m.setor];
      if (k) insUserSector.run(m.id, k);
    }
  }

  // --- empresas ---
  const insCompany = db.prepare('INSERT INTO companies (name, cnpj) VALUES (?,?)');
  for (const name of SEED_COMPANIES) insCompany.run(name, '');

  // --- ciclo ativo ---
  const cycleStart = DATA.cycleStart || '2026-07-31';
  const cycleTarget = DATA.cycleTarget || diaToDue(cycleStart, 5);
  const cycleId = db.prepare(
    `INSERT INTO cycles (cycle, cycle_start, cycle_target, status) VALUES (?,?,?, 'active')`
  ).run(DATA.cycle, cycleStart, cycleTarget).lastInsertRowid;

  // --- tarefas (ids explícitos para preservar depends_on) ---
  const insTask = db.prepare(`INSERT INTO tasks
    (id, cycle_id, title, obs, empresa, cat, assignee, approver, periodic, periodic_months, dia, due,
     entrega, status, progress, priority, milestone, depends_on)
    VALUES (@id,@cycle_id,@title,@obs,@empresa,@cat,@assignee,@approver,@periodic,@periodic_months,@dia,@due,
     @entrega,@status,@progress,@priority,@milestone,@depends_on)`);
  const insLog = db.prepare(
    `INSERT INTO task_log (task_id, by_user, text) VALUES (?,?,?)`
  );
  const seedActor = DEV_EMAILS.length
    ? (DATA.members.find((m) => (m.email || '').toLowerCase() === DEV_EMAILS[0]) || {}).id
    : DATA.members[0].id;

  const memberIds = new Set(DATA.members.map((m) => m.id));
  const validRef = (id) => (id && memberIds.has(id) ? id : null);
  for (const t of DATA.tasks) {
    const n = diaFromLabel(t.dia);
    const periodic = t.periodic || 'Mensal';
    // meses padrão (fim de trimestre/ano) pras não-mensais do seed, a menos
    // que o próprio dado de origem já traga meses explícitos.
    const periodicMonths = periodic === 'Mensal' ? null
      : (t.periodicMonths || DEFAULT_PERIODIC_MONTHS[periodic] || []).join(',') || null;
    insTask.run({
      id: t.id, cycle_id: cycleId, title: t.title, obs: t.obs || '',
      empresa: t.empresa || '', cat: t.cat, assignee: validRef(t.assignee),
      approver: validRef(t.approver), periodic, periodic_months: periodicMonths, dia: t.dia,
      due: diaToDue(cycleStart, n), priority: t.priority || 'media',
      milestone: t.milestone ? 1 : 0, depends_on: t.dependsOn || null,
      entrega: t.entrega || null, status: t.status || 'todo', progress: t.progress || 0,
    });
    insLog.run(t.id, seedActor, 'criou a tarefa');
  }
});

// Semeia o banco. force=true apaga tudo antes. Retorna contagens ou null se
// já havia dados e force=false.
export function runSeed({ force = false } = {}) {
  const already = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (already > 0 && !force) return null;
  buildSeed(force)();
  return {
    usuários: db.prepare('SELECT COUNT(*) n FROM users').get().n,
    setores: db.prepare('SELECT COUNT(*) n FROM sectors').get().n,
    empresas: db.prepare('SELECT COUNT(*) n FROM companies').get().n,
    tarefas: db.prepare('SELECT COUNT(*) n FROM tasks').get().n,
  };
}

// Execução via CLI: `node src/seed.js [--force]`
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/seed.js')) {
  const counts = runSeed({ force: process.argv.includes('--force') });
  if (counts) {
    console.log('Seed concluído:', counts);
    console.log(`Senha padrão dos usuários semeados: "${config.seedPassword}" (usada só no modo password).`);
  } else {
    console.log('Banco já possui dados. Use "npm run reset" para recriar.');
  }
}
