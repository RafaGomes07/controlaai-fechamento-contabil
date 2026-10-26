import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { ACCENT, COLORS, softOf, primaryBtn, ghostBtn } from '../lib/theme.js';
import { api } from '../lib/api.js';

export default function Empresas({ state, me, reload }) {
  const [form, setForm] = useState({ name: '', cnpj: '' });
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState(null); // company id
  const [editForm, setEditForm] = useState({ name: '', cnpj: '' });
  const [confirmId, setConfirmId] = useState(null); // company id aguardando confirmação de remoção
  const isDev = me.role === 'dev';

  const counts = useMemo(() => {
    const map = {};
    for (const c of state.companies) {
      map[c.id] = state.tasks.filter((t) => t.empresa && (t.empresa === c.name || t.empresa === 'Todas' || t.empresa.includes(c.name))).length;
    }
    return map;
  }, [state]);

  async function add() {
    setErr('');
    try { await api.addCompany(form); await reload(); setForm({ name: '', cnpj: '' }); }
    catch (e) { setErr(e.message || 'Falha ao cadastrar.'); }
  }
  async function saveEdit(id) {
    setErr('');
    try { await api.editCompany(id, editForm); await reload(); setEditing(null); }
    catch (e) { setErr(e.message || 'Falha ao salvar.'); }
  }
  async function remove(id) {
    try { await api.removeCompany(id); await reload(); setConfirmId(null); }
    catch (e) { setErr(e.message); }
  }

  const input = { padding: '11px 14px', borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, fontSize: 14 };
  const card = { background: '#fff', borderRadius: 16, padding: '18px 22px', boxShadow: COLORS.cardShadow };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={card}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.titleText, margin: '0 0 16px' }}>Cadastrar empresa</h3>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: 220 }}>
            <label style={lbl}>Nome</label>
            <input style={{ ...input, width: '100%' }} placeholder="Razão social ou nome fantasia" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={lbl}>CNPJ (opcional)</label>
            <input style={{ ...input, width: '100%' }} placeholder="00.000.000/0001-00" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
          <button style={primaryBtn} onClick={add}>+ Cadastrar</button>
        </div>
        {err && <div style={{ fontSize: 13, color: 'oklch(0.5 0.18 25)', marginTop: 10 }}>{err}</div>}
      </div>

      {state.companies.map((c) => (
        <div key={c.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: softOf(ACCENT), color: ACCENT, display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>{c.name.charAt(0).toUpperCase()}</div>
          {editing === c.id ? (
            <div style={{ flex: 1, display: 'flex', gap: 10, alignItems: 'center' }}>
              <input style={{ ...input, flex: 2 }} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              <input style={{ ...input, flex: 1 }} placeholder="CNPJ" value={editForm.cnpj} onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })} />
              <button style={primaryBtn} onClick={() => saveEdit(c.id)}>Salvar</button>
              <button style={ghostBtn} onClick={() => setEditing(null)}>Cancelar</button>
            </div>
          ) : (
            <>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'oklch(0.28 0.02 265)' }}>{c.name}</div>
                <div style={{ fontSize: 12.5, color: COLORS.mutedText, marginTop: 2 }}>{c.cnpj || 'CNPJ não informado'}</div>
                <div style={{ fontSize: 12.5, color: COLORS.mutedText }}>{counts[c.id]} {counts[c.id] === 1 ? 'atividade vinculada' : 'atividades vinculadas'}</div>
              </div>
              {me.role !== 'usuario' && (
                <span onClick={() => { setEditing(c.id); setEditForm({ name: c.name, cnpj: c.cnpj || '' }); }} style={{ fontSize: 13.5, fontWeight: 600, color: ACCENT, cursor: 'pointer' }}>Editar</span>
              )}
              {isDev && (
                confirmId === c.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'oklch(0.5 0.18 25)' }}>Remover empresa?</span>
                    <button onClick={() => remove(c.id)} style={{ background: 'oklch(0.55 0.18 25)', color: '#fff', border: 'none',
                      padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Sim, remover</button>
                    <button onClick={() => setConfirmId(null)} style={{ ...ghostBtn, padding: '7px 14px', fontSize: 13 }}>Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(c.id)} title="Remover" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: COLORS.mutedText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                )
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const lbl = { display: 'block', fontSize: 13, fontWeight: 600, color: 'oklch(0.4 0.02 265)', marginBottom: 7 };
