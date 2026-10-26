// Operações de administração: usuários/governança e empresas.
import crypto from 'node:crypto';
import { db } from './db.js';
import { hashPassword, verifyPassword } from './auth.js';
import { config } from './config.js';
import { HttpError } from './service.js';
import { serializeUser, allSectorsByUser } from './serialize.js';
import { canManage } from './authz.js';

const MIN_PASSWORD_LEN = 8;

const PALETTE = [
  'oklch(0.55 0.16 265)', 'oklch(0.6 0.13 150)', 'oklch(0.6 0.16 25)', 'oklch(0.55 0.16 300)',
  'oklch(0.55 0.14 200)', 'oklch(0.6 0.13 85)', 'oklch(0.55 0.15 340)', 'oklch(0.5 0.13 130)',
];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function listMembers() {
  const users = db.prepare('SELECT * FROM users ORDER BY name').all();
  const sectors = allSectorsByUser();
  return users.map((u) => serializeUser(u, sectors));
}

export function createUser(ctx, body) {
  if (ctx.user.role === 'usuario') throw new HttpError(403, 'Sem permissão para criar usuários.');
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const setorLabel = (body.setor || '').trim();
  if (!name || !email) throw new HttpError(422, 'Informe nome e e-mail.');
  if (!EMAIL_RE.test(email)) throw new HttpError(422, 'E-mail inválido.');
  if (db.prepare('SELECT 1 FROM users WHERE lower(email)=?').get(email)) {
    throw new HttpError(409, 'Já existe usuário com esse e-mail.');
  }
  // Gestor só cria "usuario"; apenas dev define papel.
  const finalRole = ctx.user.role === 'dev' ? (body.role || 'usuario') : 'usuario';
  if (!['usuario', 'gestor', 'dev'].includes(finalRole)) throw new HttpError(422, 'Papel inválido.');

  const secKey = setorLabel
    ? (db.prepare('SELECT key FROM sectors WHERE label=?').get(setorLabel) || {}).key
    : null;
  if (finalRole === 'gestor' && !secKey) throw new HttpError(422, 'Selecione o setor do gestor.');
  // Gestor só "batiza" gente no(s) próprio(s) setor(es) — o front já esconde
  // as demais opções, mas o back nega mesmo que a requisição seja forjada.
  if (ctx.user.role === 'gestor' && secKey && !canManage(ctx, secKey)) {
    throw new HttpError(403, 'Selecione um setor do seu escopo.');
  }

  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  const id = 'u_' + Math.random().toString(36).slice(2, 9);
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const color = PALETTE[count % PALETTE.length];

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO users (id, name, full, resp, setor, email, initials, color, password_hash, role)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      id, name, name, name, setorLabel || '—', email, initials, color, hashPassword(config.seedPassword), finalRole);
    if (finalRole === 'gestor' && secKey) {
      db.prepare('INSERT INTO user_sectors (user_id, cat_key) VALUES (?,?)').run(id, secKey);
    }
  });
  tx();
  return listMembers();
}

// Este usuário-alvo está no time do gestor? Mesma regra usada pra montar a
// lista da Equipe no front (setor do perfil bate com um setor do gestor, ou
// já tem tarefa no escopo dele) — só vale pra alvos "usuario" comum.
function gestorOwnsMember(ctx, target) {
  if (target.role !== 'usuario') return false;
  const secKey = target.setor
    ? (db.prepare('SELECT key FROM sectors WHERE label=?').get(target.setor) || {}).key
    : null;
  if (secKey && canManage(ctx, secKey)) return true;
  if (!ctx.sectors.length) return false;
  const placeholders = ctx.sectors.map(() => '?').join(',');
  const hasTask = db.prepare(
    `SELECT 1 FROM tasks WHERE assignee=? AND cat IN (${placeholders}) LIMIT 1`
  ).get(target.id, ...ctx.sectors);
  return !!hasTask;
}

// Edita nome/e-mail/setor. Dev edita qualquer um; gestor só edita "usuario"
// do próprio time, e só pode mover pra um setor que ele mesmo gerencia (não
// pode "roubar" gente de outro setor nem "doar" gente pra fora do seu escopo).
export function editUser(ctx, userId, body) {
  if (ctx.user.role === 'usuario') throw new HttpError(403, 'Sem permissão para editar usuários.');
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!target) throw new HttpError(404, 'Usuário não encontrado.');
  if (ctx.user.role === 'gestor' && !gestorOwnsMember(ctx, target)) {
    throw new HttpError(403, 'Fora do seu escopo.');
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const setorLabel = (body.setor || '').trim();
  if (!name || !email) throw new HttpError(422, 'Informe nome e e-mail.');
  if (!EMAIL_RE.test(email)) throw new HttpError(422, 'E-mail inválido.');
  if (db.prepare('SELECT 1 FROM users WHERE lower(email)=? AND id<>?').get(email, userId)) {
    throw new HttpError(409, 'Já existe usuário com esse e-mail.');
  }

  const secKey = setorLabel
    ? (db.prepare('SELECT key FROM sectors WHERE label=?').get(setorLabel) || {}).key
    : null;
  // Só valida escopo se o setor está realmente mudando — um gestor pode editar
  // nome/e-mail de alguém cujo setor de perfil já é de outro departamento
  // (ela está no time dele porque já tem tarefa na categoria que ele gerencia),
  // sem ser forçado a "mudar" o setor dela pra conseguir salvar.
  if (ctx.user.role === 'gestor' && setorLabel && setorLabel !== target.setor && secKey && !canManage(ctx, secKey)) {
    throw new HttpError(403, 'Selecione um setor do seu escopo.');
  }

  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  db.prepare('UPDATE users SET name=?, full=?, resp=?, setor=?, email=?, initials=? WHERE id=?')
    .run(name, name, name, setorLabel || '—', email, initials, userId);
  return listMembers();
}

export function setRole(ctx, userId, role) {
  if (ctx.user.role !== 'dev') throw new HttpError(403, 'Apenas o Desenvolvedor define papéis.');
  if (!['usuario', 'gestor', 'dev'].includes(role)) throw new HttpError(422, 'Papel inválido.');
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, userId);
    if (role !== 'gestor') db.prepare('DELETE FROM user_sectors WHERE user_id=?').run(userId);
  });
  tx();
  return listMembers();
}

export function toggleSector(ctx, userId, catKey) {
  if (ctx.user.role !== 'dev') throw new HttpError(403, 'Apenas o Desenvolvedor define setores.');
  const exists = db.prepare('SELECT 1 FROM user_sectors WHERE user_id=? AND cat_key=?').get(userId, catKey);
  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET role='gestor' WHERE id=? AND role<>'dev'").run(userId);
    if (exists) db.prepare('DELETE FROM user_sectors WHERE user_id=? AND cat_key=?').run(userId, catKey);
    else db.prepare('INSERT INTO user_sectors (user_id, cat_key) VALUES (?,?)').run(userId, catKey);
  });
  tx();
  return listMembers();
}

// --- empresas ---
export function listCompanies() {
  return db.prepare('SELECT * FROM companies ORDER BY name').all()
    .map((c) => ({ id: c.id, name: c.name, cnpj: c.cnpj || '' }));
}

export function addCompany(ctx, body) {
  if (ctx.user.role === 'usuario') throw new HttpError(403, 'Sem permissão.');
  const name = (body.name || '').trim();
  if (!name) throw new HttpError(422, 'Informe o nome da empresa.');
  if (db.prepare('SELECT 1 FROM companies WHERE lower(name)=lower(?)').get(name)) {
    throw new HttpError(409, 'Empresa já cadastrada.');
  }
  db.prepare('INSERT INTO companies (name, cnpj) VALUES (?,?)').run(name, (body.cnpj || '').trim());
  db.prepare('DELETE FROM removed_companies WHERE lower(name)=lower(?)').run(name);
  return listCompanies();
}

export function editCompany(ctx, id, body) {
  if (ctx.user.role === 'usuario') throw new HttpError(403, 'Sem permissão.');
  const cur = db.prepare('SELECT * FROM companies WHERE id=?').get(id);
  if (!cur) throw new HttpError(404, 'Empresa não encontrada.');
  const name = (body.name || '').trim();
  if (!name) throw new HttpError(422, 'Informe o nome da empresa.');
  if (name.toLowerCase() !== cur.name.toLowerCase()
    && db.prepare('SELECT 1 FROM companies WHERE lower(name)=lower(?)').get(name)) {
    throw new HttpError(409, 'Já existe empresa com esse nome.');
  }
  const tx = db.transaction(() => {
    db.prepare('UPDATE companies SET name=?, cnpj=? WHERE id=?').run(name, (body.cnpj || '').trim(), id);
    if (name !== cur.name) {
      // renomear propaga aos vínculos das tarefas (inclui valores compostos)
      const affected = db.prepare("SELECT id, empresa FROM tasks WHERE empresa LIKE ?").all('%' + cur.name + '%');
      const upd = db.prepare('UPDATE tasks SET empresa=? WHERE id=?');
      for (const t of affected) upd.run(t.empresa.split(cur.name).join(name), t.id);
    }
  });
  tx();
  return listCompanies();
}

export function removeCompany(ctx, id) {
  if (ctx.user.role !== 'dev') throw new HttpError(403, 'Apenas o Desenvolvedor remove empresas.');
  const cur = db.prepare('SELECT * FROM companies WHERE id=?').get(id);
  if (!cur) throw new HttpError(404, 'Empresa não encontrada.');
  const tx = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO removed_companies (name) VALUES (?)').run(cur.name);
    db.prepare('DELETE FROM companies WHERE id=?').run(id);
  });
  tx();
  return listCompanies();
}

// --- senha ---------------------------------------------------------------
// Só existe no modo AUTH_MODE=password: no modo entra quem gerencia a senha
// é a própria Microsoft (Entra ID), este app nunca vê a senha da conta.
function requirePasswordMode() {
  if (config.authMode !== 'password') {
    throw new HttpError(400, 'Troca de senha não se aplica neste modo de login.');
  }
}

// Troca a própria senha. Incrementa token_version para invalidar qualquer
// sessão (incluindo a atual) emitida antes da troca — o front deve deslogar
// e pedir novo login.
export function changeOwnPassword(ctx, body) {
  requirePasswordMode();
  const current = body.currentPassword || '';
  const next = body.newPassword || '';
  if (next.length < MIN_PASSWORD_LEN) {
    throw new HttpError(422, `A nova senha precisa ter pelo menos ${MIN_PASSWORD_LEN} caracteres.`);
  }
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(ctx.user.id);
  if (!verifyPassword(current, user.password_hash)) throw new HttpError(401, 'Senha atual incorreta.');
  db.prepare('UPDATE users SET password_hash=?, token_version = token_version + 1 WHERE id=?')
    .run(hashPassword(next), ctx.user.id);
  return { ok: true };
}

// Reset por um Desenvolvedor (ex.: usuário esqueceu a senha e não há e-mail
// de recuperação configurado). Gera uma senha temporária de uso único que
// deve ser repassada à pessoa fora do sistema; ela troca em "Minha conta".
export function resetUserPassword(ctx, userId) {
  requirePasswordMode();
  if (ctx.user.role !== 'dev') throw new HttpError(403, 'Apenas o Desenvolvedor pode resetar senhas.');
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) throw new HttpError(404, 'Usuário não encontrado.');
  const tempPassword = crypto.randomBytes(9).toString('base64url');
  db.prepare('UPDATE users SET password_hash=?, token_version = token_version + 1 WHERE id=?')
    .run(hashPassword(tempPassword), userId);
  return { tempPassword };
}
