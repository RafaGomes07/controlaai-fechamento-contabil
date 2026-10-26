// Sidebar + Header (chrome comum a todas as telas autenticadas).
import { useState } from 'react';
import { Bell, Maximize2, Minimize2, PanelLeftClose } from 'lucide-react';
import { ACCENT, COLORS, ROLE_META, softOf, chip, avatarStyle, primaryBtn } from '../lib/theme.js';

const NAV_BY_ROLE = {
  usuario: ['dashboard', 'tasks', 'calendar'],
  gestor: ['dashboard', 'tasks', 'calendar', 'reports', 'team', 'companies'],
  dev: ['dashboard', 'tasks', 'calendar', 'reports', 'team', 'companies', 'admin'],
};
const NAV_LABELS = {
  dashboard: 'Painel', tasks: 'Tarefas', calendar: 'Calendário', reports: 'Relatórios',
  team: 'Equipe', companies: 'Empresas', admin: 'Administração',
};
const TITLES = {
  dashboard: 'Painel', tasks: 'Tarefas', calendar: 'Calendário', detail: 'Detalhe da tarefa',
  edit: 'Editar tarefa', reports: 'Relatórios', team: 'Equipe', companies: 'Empresas', admin: 'Administração',
  account: 'Minha conta',
};

export function Sidebar({ me, screen, go, cycle, activeCount, onLogout, authMode }) {
  const nav = NAV_BY_ROLE[me.role] || NAV_BY_ROLE.usuario;
  const role = ROLE_META[me.role] || ROLE_META.usuario;
  return (
    <aside style={{ width: 248, flexShrink: 0, background: '#fff', borderRight: `1px solid ${COLORS.border}`,
      padding: '26px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ padding: '2px 10px 22px' }}>
        <img src="/logo.svg" alt="ControlaAí" style={{ height: 24, display: 'block' }} />
        <div style={{ fontSize: 16, fontWeight: 800, color: COLORS.titleText, marginTop: 10, lineHeight: 1 }}>ControlaAí</div>
        <div style={{ fontSize: 11, color: COLORS.mutedText, marginTop: 4, letterSpacing: '0.02em' }}>Controladoria · Fechamento</div>
      </div>
      {nav.map((k) => {
        const on = screen === k || (k === 'tasks' && (screen === 'detail' || screen === 'edit'));
        return (
          <div key={k} onClick={() => go(k)} style={{ padding: '11px 14px', borderRadius: 12, fontSize: 14.5,
            fontWeight: on ? 600 : 500, cursor: 'pointer', color: on ? '#fff' : 'oklch(0.45 0.02 265)',
            background: on ? ACCENT : 'transparent' }}>{NAV_LABELS[k]}</div>
        );
      })}
      <div style={{ marginTop: 'auto', padding: 16, borderRadius: 16, background: 'oklch(0.97 0.02 145)',
        fontSize: 12.5, color: 'oklch(0.42 0.04 265)', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, color: 'oklch(0.3 0.05 145)', marginBottom: 4 }}>Fechamento {cycle}</div>
        Faltam <b>{activeCount}</b> atividades para concluir o ciclo.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 6px 0', marginTop: 12,
        borderTop: `1px solid ${COLORS.borderSoft}` }}>
        <div style={avatarStyle(ACCENT, 40, 14)}>{me.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.3 0.02 265)', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.name}</div>
          <div style={{ marginTop: 3 }}><span style={{ ...chip(role.color, softOf(role.color)), fontWeight: 700, fontSize: 10.5 }}>{role.label}</span></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          {authMode === 'password' && (
            <span onClick={() => go('account')} style={{ fontSize: 11.5, fontWeight: 600, color: COLORS.mutedText, cursor: 'pointer' }}>Trocar senha</span>
          )}
          <span onClick={onLogout} style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.mutedText, cursor: 'pointer' }}>Sair</span>
        </div>
      </div>
    </aside>
  );
}

export function Header({ screen, notifications, expanded, showSidebar, onToggleExpand, showNewTask, onNewTask, meInitials, onOpenNotif }) {
  const [open, setOpen] = useState(false);
  const count = notifications.length;
  const iconBtn = { width: 40, height: 40, borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`,
    background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: COLORS.bodyText, position: 'relative', flexShrink: 0 };
  return (
    <header style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 32px', background: '#fff',
      borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: COLORS.titleText }}>{TITLES[screen] || 'ControlaAí'}</h1>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button style={iconBtn} onClick={() => setOpen((v) => !v)} title="Notificações">
          <Bell size={18} />
          {count > 0 && (
            <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9,
              background: 'oklch(0.55 0.18 25)', color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{count}</span>
          )}
        </button>
        {open && (
          <div style={{ position: 'absolute', top: 48, right: 0, width: 380, maxHeight: 440, overflowY: 'auto',
            background: '#fff', border: '1px solid oklch(0.92 0.01 260)', borderRadius: 16,
            boxShadow: '0 16px 40px oklch(0.3 0.05 265 / 0.18)', zIndex: 50, padding: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(0.35 0.02 265)', padding: '8px 10px 10px' }}>Notificações</div>
            {count === 0 && (
              <div style={{ padding: '20px 10px 16px', textAlign: 'center', fontSize: 13, color: COLORS.mutedText }}>
                Tudo em dia — nenhuma pendência para você.
              </div>
            )}
            {notifications.map((n, i) => (
              <div key={i} onClick={() => { setOpen(false); onOpenNotif(n.id); }} style={{ display: 'flex', alignItems: 'center',
                gap: 11, padding: 10, borderRadius: 11, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: softOf(n.color), color: n.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{n.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.3 0.02 265)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 265)', marginTop: 1 }}>{n.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <button style={iconBtn} onClick={onToggleExpand} title="Tela inteira">
        {expanded ? <Maximize2 size={18} /> : <PanelLeftClose size={18} />}
      </button>
      {showNewTask && <button style={primaryBtn} onClick={onNewTask}>+ Nova tarefa</button>}
      <div style={avatarStyle(ACCENT, 40, 14)}>{meInitials}</div>
    </header>
  );
}
