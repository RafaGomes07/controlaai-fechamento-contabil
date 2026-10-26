import { useMemo, useState } from 'react';
import { ACCENT, COLORS, softOf, ROLE_META } from '../lib/theme.js';
import { nextCycleLabelFromState } from '../lib/model.js';
import { api } from '../lib/api.js';
import { Avatar } from '../components/ui.jsx';

const ROLES = [['usuario', 'Usuário'], ['gestor', 'Gestor'], ['dev', 'Desenvolvedor']];

export default function Administracao({ state, me, reload, authMode }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [resetInfo, setResetInfo] = useState(null); // { id, temp }
  const nextCycle = useMemo(() => nextCycleLabelFromState(state.cycle.cycle), [state]);

  const members = useMemo(() => [...state.members].sort((a, b) => a.name.localeCompare(b.name)), [state]);
  const sectorsByUser = (m) => m.sectors || [];

  async function setRole(id, role) { try { await api.setRole(id, role); await reload(); } catch (e) { setErr(e.message); } }
  async function toggleSector(id, key) { try { await api.toggleSector(id, key); await reload(); } catch (e) { setErr(e.message); } }
  async function doResetPassword(id) {
    setErr('');
    try { const { tempPassword } = await api.resetPassword(id); setResetInfo({ id, temp: tempPassword }); }
    catch (e) { setErr(e.message); }
  }
  async function doClose() {
    setBusy(true); setErr('');
    try { await api.closeCycle(); await reload(); setArmed(false); }
    catch (e) { setErr(e.message || 'Falha ao encerrar ciclo.'); }
    finally { setBusy(false); }
  }

  const card = { background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: COLORS.cardShadow };
  const roleBtn = (on, color) => ({ padding: '7px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
    border: `1px solid ${on ? color : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(color) : '#fff', color: on ? color : 'oklch(0.5 0.02 265)' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ ...card, background: 'oklch(0.97 0.02 300)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'oklch(0.4 0.1 300)' }}>Governança de acesso</div>
        <div style={{ fontSize: 13.5, color: 'oklch(0.45 0.04 300)', marginTop: 6, lineHeight: 1.6 }}>
          Defina o papel de cada pessoa. <b>Desenvolvedor</b> tem acesso total · <b>Gestor</b> acessa os setores selecionados · <b>Usuário</b> vê apenas as próprias atividades.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.titleText }}>Ciclo de fechamento</div>
        <div style={{ fontSize: 13.5, color: 'oklch(0.45 0.02 265)', marginTop: 8, lineHeight: 1.6 }}>
          Encerrar o ciclo <b>{state.cycle.cycle}</b> grava o resultado no histórico (comparativo e métricas) e gera o ciclo <b>{nextCycle}</b> a partir do
          cronograma-modelo: mesmas atividades, responsáveis, dependências e marcos, com prazos D+/D− recalculados em dias úteis.
        </div>
        {err && <div style={{ fontSize: 13, color: 'oklch(0.5 0.18 25)', marginTop: 10 }}>{err}</div>}
        <div style={{ marginTop: 16 }}>
          {!armed ? (
            <button onClick={() => setArmed(true)} style={{ background: ACCENT, color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Encerrar ciclo {state.cycle.cycle}…
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: 'oklch(0.5 0.18 25)' }}>Confirmar encerramento? Esta ação é irreversível.</span>
              <button onClick={doClose} disabled={busy} style={{ background: 'oklch(0.55 0.18 25)', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: busy ? 0.7 : 1 }}>
                {busy ? 'Encerrando…' : `Sim, encerrar e gerar ${nextCycle}`}
              </button>
              <button onClick={() => setArmed(false)} style={{ background: '#fff', color: COLORS.bodyText, border: `1px solid ${COLORS.inputBorder}`, padding: '11px 18px', borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {members.map((m) => {
        const role = ROLE_META[m.role] || ROLE_META.usuario;
        return (
          <div key={m.id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar member={m} size={36} font={13} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'oklch(0.28 0.02 265)' }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: COLORS.mutedText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email} · {m.setor}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {ROLES.map(([v, l]) => <button key={v} onClick={() => setRole(m.id, v)} style={roleBtn(m.role === v, (ROLE_META[v] || {}).color || ACCENT)}>{l}</button>)}
              </div>
              {authMode === 'password' && (
                <button onClick={() => doResetPassword(m.id)} style={{ padding: '7px 13px', borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                  cursor: 'pointer', border: '1px solid oklch(0.9 0.01 260)', background: '#fff', color: 'oklch(0.5 0.02 265)' }}>
                  Resetar senha
                </button>
              )}
            </div>
            {resetInfo && resetInfo.id === m.id && (
              <div style={{ marginTop: 12, fontSize: 12.5, color: 'oklch(0.4 0.1 145)', background: 'oklch(0.97 0.03 145)',
                padding: '10px 13px', borderRadius: 10, lineHeight: 1.6 }}>
                Nova senha temporária para <b>{m.email}</b>: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{resetInfo.temp}</span><br />
                Repasse com segurança à pessoa — ela pode trocá-la em "Trocar senha" assim que entrar.
              </div>
            )}
            {m.role === 'gestor' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <span style={{ fontSize: 12.5, color: COLORS.mutedText, alignSelf: 'center' }}>Setores:</span>
                {state.sectors.map((c) => {
                  const on = sectorsByUser(m).includes(c.key);
                  return <button key={c.key} onClick={() => toggleSector(m.id, c.key)} style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.5 0.02 265)' }}>{c.label}</button>;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
