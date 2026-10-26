import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { config } from './config.js';

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, tv: user.token_version || 0 }, config.jwtSecret, { expiresIn: '12h' });
}

function attach(req, user) {
  req.user = user;
  req.sectors = db.prepare('SELECT cat_key FROM user_sectors WHERE user_id = ?')
    .all(user.id).map((r) => r.cat_key);
}

const PALETTE = [
  'oklch(0.55 0.16 265)', 'oklch(0.6 0.13 150)', 'oklch(0.6 0.16 25)', 'oklch(0.55 0.16 300)',
  'oklch(0.55 0.14 200)', 'oklch(0.6 0.13 85)', 'oklch(0.55 0.15 340)', 'oklch(0.5 0.13 130)',
];

// Nome de exibição a partir do cabeçalho X-MS-CLIENT-PRINCIPAL (base64 JSON).
function displayNameFromPrincipal(req, email) {
  try {
    const raw = req.headers['x-ms-client-principal'];
    if (raw) {
      const p = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      const claims = p.claims || [];
      const find = (types) => (claims.find((c) => types.includes(c.typ)) || {}).val;
      const name = find(['name', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']);
      if (name) return name;
    }
  } catch { /* ignora e cai no fallback */ }
  return email.split('@')[0].split(/[._-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Cria (ou retorna) o usuário correspondente a uma conta autenticada do tenant.
function provisionUser(email, name) {
  const existing = db.prepare('SELECT * FROM users WHERE lower(email)=?').get(email);
  if (existing) return existing;
  const count = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  const id = 'u_' + Math.random().toString(36).slice(2, 9);
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  // senha aleatória (não usada no modo entra) só para satisfazer NOT NULL
  const hash = hashPassword(Math.random().toString(36));
  db.prepare(`INSERT INTO users (id, name, full, resp, setor, email, initials, color, password_hash, role)
    VALUES (?,?,?,?,?,?,?,?,?, 'usuario')`).run(id, name, name, name, '—', email, initials, PALETTE[count % PALETTE.length], hash);
  return db.prepare('SELECT * FROM users WHERE id=?').get(id);
}

// Middleware de autenticação. Dois modos (config.authMode):
//  - 'entra': confia na identidade injetada pelo Azure App Service (Easy Auth).
//  - 'password': valida o JWT emitido pelo /api/login.
export function requireAuth(req, res, next) {
  if (config.authMode === 'entra') {
    const email = (req.headers['x-ms-client-principal-name'] || '').toLowerCase();
    if (!email) return res.status(401).json({ error: 'Não autenticado.' });
    if (config.allowedEmailDomain && !email.endsWith('@' + config.allowedEmailDomain)) {
      return res.status(403).json({ error: 'Acesso restrito a contas da empresa.' });
    }
    try {
      const user = provisionUser(email, displayNameFromPrincipal(req, email));
      attach(req, user);
      return next();
    } catch (e) {
      console.error('Falha ao resolver usuário Entra', e);
      return res.status(500).json({ error: 'Erro ao resolver identidade.' });
    }
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
    if (!user) return res.status(401).json({ error: 'Sessão inválida.' });
    // Troca de senha (própria ou por reset do Desenvolvedor) incrementa
    // token_version, derrubando qualquer sessão emitida antes da troca.
    if ((payload.tv || 0) !== (user.token_version || 0)) {
      return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
    }
    attach(req, user);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação.' });
    }
    next();
  };
}
