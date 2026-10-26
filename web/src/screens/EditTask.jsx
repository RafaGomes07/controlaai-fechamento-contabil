import { useMemo, useState } from 'react';
import { Diamond } from 'lucide-react';
import { ACCENT, COLORS, softOf, primaryBtn, ghostBtn } from '../lib/theme.js';
import {
  diaToDue, diaDueLabel, diaFromLabel, effStatus, canManage, scopedMembers, parse,
  PERIODICITIES, DEFAULT_PERIODIC_MONTHS, MONTHS_ABBR,
} from '../lib/model.js';
import { api } from '../lib/api.js';
import { Field } from '../components/ui.jsx';

const PRIORITIES = [['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']];

export default function EditTask({ state, me, editingId, openTask, go, reload }) {
  const orig = editingId ? state.tasks.find((t) => t.id === editingId) : null;
  const cycleStart = state.cycle.cycleStart;

  const membersArr = useMemo(() => scopedMembers(state, me), [state, me]);
  const catsArr = useMemo(() => state.sectors.filter((c) => canManage(me, c.key)), [state, me]);

  const [form, setForm] = useState(() => orig ? {
    title: orig.title, desc: orig.obs || '', assignee: orig.assignee || '', diaNum: diaFromLabel(orig.dia),
    cat: orig.cat, priority: orig.priority, progress: orig.progress,
    depSector: orig.dependsOn ? (state.tasks.find((x) => x.id === orig.dependsOn) || {}).cat || '' : '',
    dependsOn: orig.dependsOn || '', approver: orig.approver || '', milestone: !!orig.milestone, empresa: orig.empresa || '',
    periodic: orig.periodic || 'Mensal',
    periodicMonths: (orig.periodicMonths && orig.periodicMonths.length) ? orig.periodicMonths : (DEFAULT_PERIODIC_MONTHS[orig.periodic] || []),
  } : {
    title: '', desc: '', assignee: membersArr[0]?.id || '', diaNum: 1, cat: catsArr[0]?.key || '',
    priority: 'media', progress: 0, depSector: '', dependsOn: '', approver: '', milestone: false, empresa: '',
    periodic: 'Mensal', periodicMonths: [],
  });
  const [editObs, setEditObs] = useState('');
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const stepDia = (dir) => set('diaNum', (() => {
    let n = (form.diaNum || 1) + dir;
    if (n === 0) n = dir > 0 ? 1 : -1;
    return Math.max(-5, Math.min(21, n));
  })());
  const setPeriodic = (v) => setForm((f) => ({ ...f, periodic: v, periodicMonths: v === 'Mensal' ? [] : (DEFAULT_PERIODIC_MONTHS[v] || []) }));
  const toggleMonth = (m) => setForm((f) => {
    const has = f.periodicMonths.includes(m);
    const next = has ? f.periodicMonths.filter((x) => x !== m) : [...f.periodicMonths, m].sort((a, b) => a - b);
    return { ...f, periodicMonths: next };
  });

  const diaLabel = (form.diaNum < 0 ? 'D' : 'D+') + (form.diaNum || 1);
  const dueLabel = diaDueLabel(diaToDue(cycleStart, form.diaNum || 1));

  const editNeedsObs = orig && effStatus(orig, parse(state.today)) === 'atrasada';
  const reopening = orig && orig.status === 'done' && (form.progress < 100);
  const showObs = editNeedsObs || reopening;

  const depOptions = state.tasks.filter((t) => t.id !== editingId && t.cat === form.depSector);

  async function save() {
    setErr('');
    if (!form.title.trim()) { setErr('Informe o título.'); return; }
    if (form.periodic !== 'Mensal' && form.periodicMonths.length === 0) {
      setErr('Selecione ao menos um mês para essa periodicidade.'); return;
    }
    const payload = { ...form, editObs };
    try {
      const saved = editingId ? await api.editTask(editingId, payload) : await api.createTask(payload);
      await reload();
      openTask(saved.id);
    } catch (e) { setErr(e.message || 'Falha ao salvar.'); }
  }

  const box = { background: '#fff', borderRadius: 18, padding: '26px 28px', boxShadow: COLORS.cardShadow, maxWidth: 720, margin: '0 auto' };
  const input = { width: '100%', padding: '11px 14px', borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, fontSize: 14 };

  return (
    <div style={box}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.titleText, margin: '0 0 22px' }}>{editingId ? 'Editar tarefa' : 'Nova tarefa'}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Field label="Título"><input style={input} value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="Descrição"><textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} value={form.desc} onChange={(e) => set('desc', e.target.value)} /></Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Responsável">
            <select style={input} value={form.assignee} onChange={(e) => set('assignee', e.target.value)}>
              {membersArr.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Prazo — dia útil do ciclo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button style={stepBtn} onClick={() => stepDia(-1)}>−</button>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 11, background: COLORS.appBg }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.titleText }}>{diaLabel}</div>
                <div style={{ fontSize: 12, color: COLORS.mutedText }}>{dueLabel}</div>
              </div>
              <button style={stepBtn} onClick={() => stepDia(1)}>+</button>
            </div>
          </Field>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Categoria">
            <select style={input} value={form.cat} onChange={(e) => set('cat', e.target.value)}>
              {catsArr.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Prioridade">
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map(([v, l]) => {
                const on = form.priority === v;
                return <button key={v} onClick={() => set('priority', v)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`,
                  background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.45 0.02 265)' }}>{l}</button>;
              })}
            </div>
          </Field>
        </div>

        <Field label="Periodicidade">
          <div style={{ display: 'flex', gap: 8 }}>
            {PERIODICITIES.map((p) => {
              const on = form.periodic === p;
              return <button key={p} onClick={() => setPeriodic(p)} style={{ flex: 1, padding: '9px 8px', borderRadius: 10,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`,
                background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.45 0.02 265)' }}>{p}</button>;
            })}
          </div>
          {form.periodic !== 'Mensal' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {MONTHS_ABBR.map((label, i) => {
                const m = i + 1;
                const on = form.periodicMonths.includes(m);
                return <button key={m} onClick={() => toggleMonth(m)} style={{ padding: '5px 10px', borderRadius: 8,
                  fontSize: 12, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer',
                  border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(ACCENT) : '#fff',
                  color: on ? ACCENT : 'oklch(0.5 0.02 265)' }}>{label}</button>;
              })}
            </div>
          )}
        </Field>

        <Field label="Depende de">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <select style={input} value={form.depSector} onChange={(e) => setForm((f) => ({ ...f, depSector: e.target.value, dependsOn: '' }))}>
              <option value="">1. Selecione o setor…</option>
              {state.sectors.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select style={input} value={String(form.dependsOn || '')} onChange={(e) => set('dependsOn', e.target.value)} disabled={!form.depSector}>
              <option value="">2. Selecione a atividade…</option>
              {depOptions.map((t) => <option key={t.id} value={t.id}>{t.title.length > 60 ? t.title.slice(0, 60) + '…' : t.title} ({t.dia})</option>)}
            </select>
          </div>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Aprovador">
            <select style={input} value={form.approver} onChange={(e) => set('approver', e.target.value)}>
              <option value="">— Sem aprovação —</option>
              {state.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Empresa">
            <select style={input} value={form.empresa} onChange={(e) => set('empresa', e.target.value)}>
              <option value="">— Sem vínculo —</option>
              {[...new Set([...state.companies.map((c) => c.name), 'Todas', 'Alfa e Beta'])].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={() => set('milestone', !form.milestone)} style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${form.milestone ? 'oklch(0.5 0.13 78)' : 'oklch(0.9 0.01 260)'}`,
            background: form.milestone ? softOf('oklch(0.6 0.13 78)') : '#fff', color: form.milestone ? 'oklch(0.45 0.12 78)' : 'oklch(0.45 0.02 265)' }}>
            <Diamond size={13} /> Marco do ciclo
          </button>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.4 0.02 265)', marginBottom: 6 }}>Progresso — <span className="mono">{form.progress}%</span></div>
            <input type="range" min="0" max="100" value={form.progress} onChange={(e) => set('progress', parseInt(e.target.value, 10))} style={{ width: '100%', accentColor: ACCENT }} />
          </div>
        </div>

        {showObs && (
          <div style={{ padding: '14px 16px', borderRadius: 12, background: softOf('oklch(0.6 0.18 25)'), border: '1px solid oklch(0.85 0.06 25)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(0.5 0.18 25)', marginBottom: 8 }}>Justificativa de atraso/reabertura (obrigatória)</div>
            <textarea style={{ ...input, minHeight: 64, resize: 'vertical' }} value={editObs} onChange={(e) => setEditObs(e.target.value)} />
          </div>
        )}

        {err && <div style={{ fontSize: 13, color: 'oklch(0.5 0.18 25)' }}>{err}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button style={ghostBtn} onClick={() => (editingId ? openTask(editingId) : go('tasks'))}>Cancelar</button>
          <button style={primaryBtn} onClick={save}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

const stepBtn = { width: 40, height: 40, borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, background: '#fff',
  cursor: 'pointer', fontSize: 18, fontWeight: 700, color: 'oklch(0.4 0.02 265)', flexShrink: 0 };
