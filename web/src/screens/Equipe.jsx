import { useMemo, useState } from 'react';
import { ACCENT, COLORS, softOf, primaryBtn, ghostBtn } from '../lib/theme.js';
import { teamCards, canManage } from '../lib/model.js';
import { api } from '../lib/api.js';
import { Avatar, Field } from '../components/ui.jsx';

const ROLES = [['usuario', 'Usuário'], ['gestor', 'Gestor'], ['dev', 'Desenvolvedor']];

export default function Equipe({ state, me, reload }) {
  const cards = useMemo(() => teamCards(state), [state]);
  // Gestor só pode "batizar" o novo usuário num setor que ele próprio gerencia
  // (evita cadastrar alguém num setor que não é o seu e ele nunca aparecer
  // pra atribuir tarefa depois — dev vê/escolhe todos).
  const availableSectors = useMemo(() => state.sectors.filter((c) => canManage(me, c.key)), [state, me]);
  const [showForm, setShowForm] = useState(false);
  const [nu, setNu] = useState({ name: '', email: '', setor: '', role: 'usuario' });
  const [err, setErr] = useState('');
  const canManageUsers = me.role === 'dev' || me.role === 'gestor';
  const isDev = me.role === 'dev';

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', setor: '' });
  const [editErr, setEditErr] = useState('');
  const canEditMember = (m) => isDev || (me.role === 'gestor' && m.role === 'usuario');

  async function save() {
    setErr('');
    try {
      await api.createUser(nu);
      await reload();
      setShowForm(false); setNu({ name: '', email: '', setor: '', role: 'usuario' });
    } catch (e) { setErr(e.message || 'Falha ao criar usuário.'); }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditForm({ name: m.name, email: m.email, setor: m.setor === '—' ? '' : m.setor });
    setEditErr('');
  }
  async function saveEdit() {
    setEditErr('');
    try {
      await api.editUser(editingId, editForm);
      await reload();
      setEditingId(null);
    } catch (e) { setEditErr(e.message || 'Falha ao salvar.'); }
  }

  const input = { width: '100%', padding: '11px 14px', borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, fontSize: 14 };
  const card = { background: '#fff', borderRadius: 16, padding: 20, boxShadow: COLORS.cardShadow };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: COLORS.titleText, margin: 0 }}>Membros da equipe</h2>
        <div style={{ flex: 1 }} />
        {canManageUsers && <button style={primaryBtn} onClick={() => setShowForm((v) => !v)}>+ Novo usuário</button>}
      </div>

      {showForm && (
        <div style={{ ...card, maxWidth: 640 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Nome"><input style={input} value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field>
              <Field label="E-mail"><input style={input} value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} placeholder="nome@exemplo.com.br" /></Field>
            </div>
            <Field label="Setor">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {availableSectors.map((c) => {
                  const on = nu.setor === c.label;
                  return <button key={c.key} onClick={() => setNu({ ...nu, setor: c.label })} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.5 0.02 265)' }}>{c.label}</button>;
                })}
              </div>
            </Field>
            <Field label="Papel">
              {isDev ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  {ROLES.map(([v, l]) => {
                    const on = nu.role === v;
                    return <button key={v} onClick={() => setNu({ ...nu, role: v })} style={{ flex: 1, padding: 9, borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.5 0.02 265)' }}>{l}</button>;
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: COLORS.mutedText, padding: '4px 0' }}>O novo usuário nasce como <b>Usuário</b>. Apenas o Desenvolvedor define papéis.</div>
              )}
            </Field>
            {err && <div style={{ fontSize: 13, color: 'oklch(0.5 0.18 25)' }}>{err}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button style={ghostBtn} onClick={() => setShowForm(false)}>Cancelar</button>
              <button style={primaryBtn} onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {cards.map((m) => (
          <div key={m.id} style={{ ...card, position: 'relative' }}>
            {canEditMember(m) && editingId !== m.id && (
              <span onClick={() => startEdit(m)} style={{ position: 'absolute', top: 16, right: 18,
                fontSize: 12.5, fontWeight: 600, color: ACCENT, cursor: 'pointer' }}>Editar</span>
            )}
            {editingId === m.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Nome"><input style={input} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></Field>
                <Field label="E-mail"><input style={input} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></Field>
                <Field label="Setor">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {availableSectors.map((c) => {
                      const on = editForm.setor === c.label;
                      return <button key={c.key} onClick={() => setEditForm({ ...editForm, setor: c.label })} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.5 0.02 265)' }}>{c.label}</button>;
                    })}
                  </div>
                </Field>
                {editErr && <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.18 25)' }}>{editErr}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <button style={{ ...ghostBtn, padding: '8px 14px', fontSize: 13 }} onClick={() => setEditingId(null)}>Cancelar</button>
                  <button style={{ ...primaryBtn, padding: '8px 14px', fontSize: 13 }} onClick={saveEdit}>Salvar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar member={m} size={52} font={18} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'oklch(0.28 0.02 265)' }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: COLORS.mutedText }}>{m.setor}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 18 }}>
                  <Stat n={m.count} label="ativas" />
                  <Stat n={m.doneCount} label="concluídas" />
                  <Stat n={m.overdue} label="atrasadas" color={m.overdue > 0 ? 'oklch(0.55 0.18 25)' : undefined} />
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.mutedText, marginBottom: 6 }}>
                    <span>Carga</span><span className="mono">{m.load}</span>
                  </div>
                  <div style={{ height: 6, background: 'oklch(0.94 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ width: `${m.loadPct}%`, height: '100%', background: m.color, borderRadius: 999 }} />
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ n, label, color }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 800, color: color || 'oklch(0.3 0.02 265)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 4 }}>{label}</div>
    </div>
  );
}
