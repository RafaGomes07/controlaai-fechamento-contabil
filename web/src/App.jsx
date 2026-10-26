import { useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from './lib/api.js';
import { computeNotifications } from './lib/model.js';
import { Sidebar, Header } from './components/Chrome.jsx';
import Login from './screens/Login.jsx';
import Painel from './screens/Painel.jsx';
import Tarefas from './screens/Tarefas.jsx';
import Calendario from './screens/Calendario.jsx';
import Detalhe from './screens/Detalhe.jsx';
import EditTask from './screens/EditTask.jsx';
import Relatorios from './screens/Relatorios.jsx';
import Equipe from './screens/Equipe.jsx';
import Empresas from './screens/Empresas.jsx';
import Administracao from './screens/Administracao.jsx';
import Conta from './screens/Conta.jsx';
import PainelTV from './screens/PainelTV.jsx';

const ALLOWED = {
  usuario: ['dashboard', 'tasks', 'calendar', 'detail', 'edit', 'account'],
  gestor: ['dashboard', 'tasks', 'calendar', 'reports', 'team', 'companies', 'detail', 'edit', 'account'],
  dev: ['dashboard', 'tasks', 'calendar', 'reports', 'team', 'companies', 'admin', 'detail', 'edit', 'account'],
};

export default function App() {
  const [phase, setPhase] = useState('loading'); // loading | login | app
  const [state, setState] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [currentId, setCurrentId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [sectorJump, setSectorJump] = useState(null);
  const [authMode, setAuthMode] = useState('password');
  const [version, setVersion] = useState('');
  // Modo TV (painel público em tela cheia, sem login) — ativado pelo hash #tv.
  const [tvMode, setTvMode] = useState(window.location.hash === '#tv');

  useEffect(() => {
    const onHash = () => setTvMode(window.location.hash === '#tv');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadBootstrap = useCallback(async () => {
    const data = await api.bootstrap();
    setState(data);
    return data;
  }, []);

  useEffect(() => {
    (async () => {
      let mode = 'password';
      try {
        const cfg = await api.config();
        mode = cfg.authMode || 'password';
        setVersion(cfg.version || '');
      } catch { /* usa padrão */ }
      setAuthMode(mode);
      try {
        await loadBootstrap();
        setPhase('app');
      } catch {
        // No modo entra o Azure App Service faz o login corporativo; redireciona.
        if (mode === 'entra') {
          window.location.href = '/.auth/login/aad?post_login_redirect_uri=' + encodeURIComponent('/');
          return;
        }
        setToken(null);
        setPhase('login');
      }
    })();
  }, [loadBootstrap]);

  async function login(email, password) {
    const { token } = await api.login(email, password);
    setToken(token);
    await loadBootstrap();
    setScreen('dashboard'); setCurrentId(null); setEditingId(null);
    setPhase('app');
  }

  function logout() {
    if (authMode === 'entra') { window.location.href = '/.auth/logout'; return; }
    setToken(null); setState(null); setPhase('login'); setScreen('dashboard');
  }

  const reload = useCallback(async () => { await loadBootstrap(); }, [loadBootstrap]);

  if (tvMode) return <PainelTV />;
  if (phase === 'loading') return <Splash text="Carregando…" />;
  if (phase === 'login') return <Login onLogin={login} version={version} />;
  if (!state) return <Splash text="Carregando…" />;

  const me = state.me;
  const allowed = ALLOWED[me.role] || ALLOWED.usuario;
  const effScreen = allowed.includes(screen) ? screen : 'dashboard';

  const go = (s) => { setScreen(s); setCurrentId(null); setEditingId(null); setSectorJump(null); };
  const openTask = (id) => { setCurrentId(id); setScreen('detail'); };
  const newTask = () => { setEditingId(null); setScreen('edit'); };
  const editTask = (id) => { setEditingId(id); setCurrentId(id); setScreen('edit'); };
  const goSector = (catKey) => { setSectorJump(catKey); setCurrentId(null); setEditingId(null); setScreen('tasks'); };

  const nav = { me, state, go, openTask, newTask, editTask, reload, setScreen, goSector, authMode };
  const activeCount = state.tasks.filter((t) => t.status !== 'done').length;
  const notifications = computeNotifications(state);
  const showNewTask = me.role !== 'usuario' && effScreen === 'tasks';

  const current = state.tasks.find((t) => t.id === currentId);

  let body;
  switch (effScreen) {
    case 'dashboard': body = <Painel {...nav} />; break;
    case 'tasks': body = <Tarefas {...nav} initialCat={sectorJump} />; break;
    case 'calendar': body = <Calendario {...nav} />; break;
    case 'detail': body = current ? <Detalhe {...nav} task={current} /> : <Tarefas {...nav} />; break;
    case 'edit': body = <EditTask {...nav} editingId={editingId} />; break;
    case 'reports': body = <Relatorios {...nav} />; break;
    case 'team': body = <Equipe {...nav} />; break;
    case 'companies': body = <Empresas {...nav} />; break;
    case 'admin': body = <Administracao {...nav} />; break;
    case 'account': body = <Conta {...nav} onLogout={logout} />; break;
    default: body = <Painel {...nav} />;
  }

  const maxWide = expanded ? 'none' : '1200px';

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden',
      background: 'oklch(0.97 0.008 260)', color: 'oklch(0.28 0.02 265)' }}>
      {!expanded && (
        <Sidebar me={me} screen={effScreen} go={go} cycle={state.cycle.cycle} activeCount={activeCount} onLogout={logout} authMode={authMode} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header screen={effScreen} notifications={notifications} expanded={expanded} showSidebar={!expanded}
          onToggleExpand={() => setExpanded((v) => !v)} showNewTask={showNewTask} onNewTask={newTask}
          meInitials={me.initials} onOpenNotif={openTask} />
        <main style={{ flex: 1, overflow: 'auto', padding: '30px 32px' }}>
          <div style={{ maxWidth: maxWide, margin: '0 auto' }}>{body}</div>
        </main>
      </div>
    </div>
  );
}

function Splash({ text }) {
  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'oklch(0.5 0.02 265)', fontSize: 15 }}>{text}</div>
  );
}
