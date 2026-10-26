import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });

export const db = new Database(config.dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Esquema. O banco central é a fonte da verdade — dados compartilhados entre
// todos os usuários. O `log` das tarefas é append-only (trilha de auditoria).
// ---------------------------------------------------------------------------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  full          TEXT,
  resp          TEXT,
  setor         TEXT,
  email         TEXT NOT NULL UNIQUE,
  initials      TEXT,
  color         TEXT,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'usuario',  -- 'dev' | 'gestor' | 'usuario'
  token_version INTEGER NOT NULL DEFAULT 0,       -- incrementa para invalidar sessões existentes
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Setores de governança de um gestor (relação N:N usuário↔setor)
CREATE TABLE IF NOT EXISTS user_sectors (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cat_key  TEXT NOT NULL,
  PRIMARY KEY (user_id, cat_key)
);

CREATE TABLE IF NOT EXISTS sectors (
  key    TEXT PRIMARY KEY,
  label  TEXT NOT NULL,
  color  TEXT NOT NULL,
  ord    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS companies (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name   TEXT NOT NULL UNIQUE,
  cnpj   TEXT
);

-- Ciclo de fechamento. Apenas um fica 'active'.
CREATE TABLE IF NOT EXISTS cycles (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle         TEXT NOT NULL,          -- 'MM/AAAA'
  cycle_start   TEXT NOT NULL,          -- Dia -1 (ISO)
  cycle_target  TEXT NOT NULL,          -- Meta D+5 (ISO)
  status        TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'closed'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle_id       INTEGER NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  obs            TEXT DEFAULT '',
  empresa        TEXT DEFAULT '',
  cat            TEXT NOT NULL,
  assignee       TEXT REFERENCES users(id),
  approver       TEXT REFERENCES users(id),
  periodic       TEXT DEFAULT 'Mensal',   -- 'Mensal' | 'Bimestral' | 'Trimestral' | 'Anual'
  periodic_months TEXT,                  -- meses fixos em que repete (ex.: '3,6,9,12'); NULL = sempre (Mensal)
  dia            TEXT NOT NULL,          -- 'Dia -1' .. 'Dia 21'
  due            TEXT,                   -- ISO calculada a partir de "dia"
  entrega        TEXT,                   -- ISO da conclusão aprovada
  status         TEXT NOT NULL DEFAULT 'todo',  -- todo|doing|review|done
  progress       INTEGER NOT NULL DEFAULT 0,
  priority       TEXT NOT NULL DEFAULT 'media',
  milestone      INTEGER NOT NULL DEFAULT 0,
  depends_on     INTEGER REFERENCES tasks(id),
  reopen_by      TEXT,                   -- solicitação de reabertura pendente
  reopen_reason  TEXT,
  reopen_when    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  by_user    TEXT NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_evidence (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  by_user    TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trilha de auditoria: APPEND-ONLY. Nunca fazemos UPDATE/DELETE aqui.
CREATE TABLE IF NOT EXISTS task_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  by_user    TEXT NOT NULL REFERENCES users(id),
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS task_checklist (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id  INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text     TEXT NOT NULL,
  done     INTEGER NOT NULL DEFAULT 0,
  ord      INTEGER NOT NULL DEFAULT 0
);

-- Snapshot de ciclo encerrado (histórico comparativo)
CREATE TABLE IF NOT EXISTS cycle_history (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  cycle          TEXT NOT NULL,
  start          TEXT,
  end            TEXT,
  days_to_close  INTEGER,
  reopens        INTEGER,
  totals_json    TEXT,
  sectors_json   TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Empresas removidas de propósito (para o seed não recriá-las)
CREATE TABLE IF NOT EXISTS removed_companies (
  name TEXT PRIMARY KEY
);

CREATE INDEX IF NOT EXISTS idx_tasks_cycle ON tasks(cycle_id);
CREATE INDEX IF NOT EXISTS idx_log_task ON task_log(task_id);
`);

// Migração leve para bancos criados antes da coluna token_version existir.
const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
if (!userCols.includes('token_version')) {
  db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
}

// Migração leve para bancos criados antes de periodic_months existir. Fica
// NULL pras tarefas já existentes (equivale a "sempre regenera", o
// comportamento de antes) — quem quiser restringir edita a tarefa e escolhe
// os meses; não adivinhamos isso automaticamente por cima de dado real.
const taskCols = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
if (!taskCols.includes('periodic_months')) {
  db.exec('ALTER TABLE tasks ADD COLUMN periodic_months TEXT');
}

export function getActiveCycle() {
  return db.prepare(`SELECT * FROM cycles WHERE status = 'active' ORDER BY id DESC LIMIT 1`).get();
}
