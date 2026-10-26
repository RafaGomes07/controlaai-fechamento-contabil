import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db, getActiveCycle } from './db.js';
import { verifyPassword, signToken, requireAuth } from './auth.js';
import { today, isoOf } from './rules.js';
import { serializeUser, serializeTask, serializeHistory, allSectorsByUser } from './serialize.js';
import { scopeFilter } from './authz.js';
import * as svc from './service.js';
import * as admin from './admin.js';
import { runSeed } from './seed.js';

// Semeia automaticamente no primeiro start quando AUTO_SEED=true (ex.: 1º deploy).
if (process.env.AUTO_SEED === 'true') {
  try {
    const counts = runSeed({ force: false });
    if (counts) console.log('Auto-seed executado:', counts);
  } catch (e) { console.error('Falha no auto-seed:', e); }
}

if (config.jwtSecretGenerated) {
  console.warn(
    '⚠️  JWT_SECRET não definido (ou deixado no valor de exemplo) — usando um segredo ' +
    'aleatório gerado nesta execução. Sessões serão invalidadas a cada reinício. ' +
    'Defina JWT_SECRET no .env (ou nas app settings) para produção.'
  );
}

const app = express();
// CSP fica desligada por ora: o frontend usa estilos inline extensivamente e uma
// CSP padrão quebraria a renderização sem testar tela a tela. As demais proteções
// do helmet (X-Content-Type-Options, X-Frame-Options, HSTS etc.) ficam ativas.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

// Login por senha é o alvo mais óbvio de força bruta — limita tentativas por IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' },
});

const ctxOf = (req) => ({ user: req.user, sectors: req.sectors });

// Envolve handlers async e traduz HttpError em resposta JSON.
const h = (fn) => (req, res) => {
  try {
    const out = fn(req, res);
    if (out !== undefined) res.json(out);
  } catch (e) {
    if (e instanceof svc.HttpError) return res.status(e.status).json({ error: e.message, code: e.code });
    console.error(e);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Configuração pública (o frontend usa para saber o modo de login e exibir a versão).
app.get('/api/config', (req, res) => res.json({ authMode: config.authMode, version: config.version }));

// --- painel público (visão TV, sem login) -------------------------------------
// Retorna apenas agregados do ciclo ativo: nada de responsável, aprovador,
// comentários ou trilha. Título de tarefa só para marcos (aparecem no gantt).
const panelLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde um instante.' },
});
app.get('/api/public/panel', panelLimiter, h(() => {
  const cycle = getActiveCycle();
  const rows = db.prepare('SELECT id, title, cat, status, due, milestone, empresa FROM tasks WHERE cycle_id=?').all(cycle.id);
  return {
    today: isoOf(today()),
    cycle: { cycle: cycle.cycle, cycleStart: cycle.cycle_start, cycleTarget: cycle.cycle_target },
    sectors: db.prepare('SELECT key, label, color FROM sectors ORDER BY ord').all(),
    tasks: rows.map((t) => ({
      id: t.id, cat: t.cat, status: t.status, due: t.due, empresa: t.empresa,
      milestone: !!t.milestone, title: t.milestone ? t.title : '',
    })),
  };
}));

// --- autenticação ---
app.post('/api/login', loginLimiter, h((req) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!email || !password) throw new svc.HttpError(422, 'Preencha e-mail e senha.');
  const user = db.prepare('SELECT * FROM users WHERE lower(email)=?').get(email);
  if (!user) throw new svc.HttpError(401, 'E-mail não encontrado. Use seu e-mail corporativo.');
  if (!verifyPassword(password, user.password_hash)) throw new svc.HttpError(401, 'Senha incorreta.');
  const sectors = db.prepare('SELECT cat_key FROM user_sectors WHERE user_id=?').all(user.id).map((r) => r.cat_key);
  return { token: signToken(user), user: { ...serializeUser(user), sectors } };
}));

// --- estado inicial completo (escopado por papel) ---
app.get('/api/bootstrap', requireAuth, h((req) => {
  const ctx = ctxOf(req);
  const cycle = getActiveCycle();
  const sectorsByUser = allSectorsByUser();
  const inScope = scopeFilter(ctx);

  const allTaskRows = db.prepare('SELECT * FROM tasks WHERE cycle_id=?').all(cycle.id);
  const tasks = allTaskRows.filter(inScope).map(serializeTask);

  return {
    me: { ...serializeUser(req.user), sectors: req.sectors },
    today: isoOf(today()),
    cycle: { cycle: cycle.cycle, cycleStart: cycle.cycle_start, cycleTarget: cycle.cycle_target },
    sectors: db.prepare('SELECT key, label, color FROM sectors ORDER BY ord').all(),
    members: db.prepare('SELECT * FROM users ORDER BY name').all().map((u) => serializeUser(u, sectorsByUser)),
    companies: admin.listCompanies(),
    tasks,
    history: db.prepare('SELECT * FROM cycle_history ORDER BY id').all().map(serializeHistory),
  };
}));

// --- tarefas ---
app.post('/api/tasks', requireAuth, h((req) => svc.createTask(ctxOf(req), req.body)));
app.put('/api/tasks/:id', requireAuth, h((req) => svc.editTask(ctxOf(req), +req.params.id, req.body)));
app.post('/api/tasks/:id/duplicate', requireAuth, h((req) => svc.duplicateTask(ctxOf(req), +req.params.id)));
app.post('/api/tasks/:id/status', requireAuth, h((req) => svc.setStatus(ctxOf(req), +req.params.id, req.body.status, req.body.obs)));
app.post('/api/tasks/:id/approve', requireAuth, h((req) => svc.approveTask(ctxOf(req), +req.params.id)));
app.post('/api/tasks/:id/reject', requireAuth, h((req) => svc.rejectTask(ctxOf(req), +req.params.id, req.body.reason)));
app.post('/api/tasks/:id/reopen', requireAuth, h((req) => svc.requestReopen(ctxOf(req), +req.params.id, req.body.reason)));
app.post('/api/tasks/:id/reopen/approve', requireAuth, h((req) => svc.approveReopen(ctxOf(req), +req.params.id)));
app.post('/api/tasks/:id/reopen/deny', requireAuth, h((req) => svc.denyReopen(ctxOf(req), +req.params.id)));
app.post('/api/tasks/:id/comments', requireAuth, h((req) => svc.addComment(ctxOf(req), +req.params.id, req.body.text)));
app.post('/api/tasks/:id/evidence', requireAuth, h((req) => svc.addEvidence(ctxOf(req), +req.params.id, req.body.name)));
app.post('/api/tasks/:id/checklist/:idx/toggle', requireAuth, h((req) => svc.toggleChecklist(ctxOf(req), +req.params.id, +req.params.idx)));

// --- administração / equipe ---
app.get('/api/members', requireAuth, h(() => admin.listMembers()));
app.post('/api/users', requireAuth, h((req) => admin.createUser(ctxOf(req), req.body)));
app.put('/api/users/:id', requireAuth, h((req) => admin.editUser(ctxOf(req), req.params.id, req.body)));
app.post('/api/users/:id/role', requireAuth, h((req) => admin.setRole(ctxOf(req), req.params.id, req.body.role)));
app.post('/api/users/:id/sectors/:key/toggle', requireAuth, h((req) => admin.toggleSector(ctxOf(req), req.params.id, req.params.key)));
app.post('/api/users/:id/reset-password', requireAuth, h((req) => admin.resetUserPassword(ctxOf(req), req.params.id)));

// --- minha conta ---
app.post('/api/me/password', requireAuth, loginLimiter, h((req) => admin.changeOwnPassword(ctxOf(req), req.body)));

// --- empresas ---
app.get('/api/companies', requireAuth, h(() => admin.listCompanies()));
app.post('/api/companies', requireAuth, h((req) => admin.addCompany(ctxOf(req), req.body)));
app.put('/api/companies/:id', requireAuth, h((req) => admin.editCompany(ctxOf(req), +req.params.id, req.body)));
app.delete('/api/companies/:id', requireAuth, h((req) => admin.removeCompany(ctxOf(req), +req.params.id)));

// --- ciclo ---
app.post('/api/cycle/close', requireAuth, h((req) => svc.closeCycle(ctxOf(req))));

// --- frontend compilado (produção): um único web app serve SPA + API ---
if (fs.existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(config.staticDir, 'index.html'));
  });
  console.log(`Servindo frontend de ${config.staticDir}`);
}

app.listen(config.port, () => {
  console.log(`ControlaAí (${config.authMode}) em http://localhost:${config.port}`);
});
