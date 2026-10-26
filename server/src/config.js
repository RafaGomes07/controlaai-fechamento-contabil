import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Carregador de .env minimalista (sem dependência externa).
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

// AUTH_MODE:
//  'password' (padrão) — login por e-mail/senha (bcrypt+JWT). Usado localmente.
//  'entra'    — confia na identidade injetada pelo Azure App Service (Entra ID).
//               USE SOMENTE atrás do "Easy Auth" do App Service com autenticação
//               obrigatória; caso contrário os cabeçalhos poderiam ser forjados.
const authMode = (process.env.AUTH_MODE || 'password').toLowerCase();

// Em produção o próprio Express serve o frontend compilado (web/dist), num
// único web app. DB_DIR permite apontar para armazenamento persistente do
// App Service (ex.: /home/data).
const dbDir = process.env.DB_DIR || path.join(rootDir, 'data');

// Nunca confie num JWT_SECRET ausente ou deixado no valor de exemplo do
// .env.example — nesse caso o segredo estaria público no código-fonte e
// qualquer um poderia forjar um token válido. Gera um aleatório em memória
// (sessões existentes são invalidadas a cada reinício) e avisa no boot.
const INSECURE_JWT_SECRETS = new Set([
  '', 'troque-este-segredo-em-producao', 'dev-secret-nao-use-em-producao',
]);
const envJwtSecret = process.env.JWT_SECRET || '';
const jwtSecretGenerated = INSECURE_JWT_SECRETS.has(envJwtSecret);
const jwtSecret = jwtSecretGenerated ? crypto.randomBytes(32).toString('hex') : envJwtSecret;

// Versão exibida na tela de login — bump no package.json da raiz a cada
// pacote de deploy, para dar pra conferir de relance o que está rodando
// em cada ambiente (VM local, etc.).
const appPackageJson = path.resolve(rootDir, '..', 'package.json');
const version = fs.existsSync(appPackageJson)
  ? JSON.parse(fs.readFileSync(appPackageJson, 'utf8')).version || '0.0.0'
  : '0.0.0';

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret,
  jwtSecretGenerated,
  seedPassword: process.env.SEED_PASSWORD || 'ControlaAi@2026',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  dbFile: path.join(dbDir, 'controlaai.db'),
  dbDir,
  rootDir,
  authMode,
  version,
  // Domínio de e-mail exigido em produção (defesa extra além do gate do tenant).
  allowedEmailDomain: (process.env.ALLOWED_EMAIL_DOMAIN || 'exemplo.com.br').toLowerCase(),
  // Caminho do frontend compilado (servido quando existir).
  staticDir: path.resolve(rootDir, '..', 'web', 'dist'),
};
