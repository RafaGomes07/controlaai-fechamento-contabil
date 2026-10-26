import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ACCENT, COLORS } from '../lib/theme.js';
import { effStatus, parse, makeMaps } from '../lib/model.js';
import TaskRow from '../components/TaskRow.jsx';

const CHIPS = [
  ['all', 'Todas'], ['pendente', 'Pendente'], ['andamento', 'Em andamento'],
  ['revisao', 'Em revisão'], ['atrasada', 'Atrasada'], ['concluida', 'Concluída'],
];

// Normaliza para busca: minúsculas e sem acentos ("conciliacao" acha "Conciliação").
const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export default function Tarefas({ state, me, openTask, initialCat }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [catFilter, setCatFilter] = useState(initialCat || 'all');
  const [empFilter, setEmpFilter] = useState('all');
  const [respFilter, setRespFilter] = useState('all');
  const [query, setQuery] = useState('');
  const { catOf, memberOf } = useMemo(() => makeMaps(state), [state]);
  const todayD = parse(state.today);

  const companies = useMemo(
    () => [...new Set([...state.companies.map((c) => c.name), ...state.tasks.map((t) => t.empresa).filter(Boolean)])].sort(),
    [state]
  );
  const cats = useMemo(() => {
    const present = new Set(state.tasks.map((t) => t.cat));
    return state.sectors.filter((c) => me.role === 'dev' || present.has(c.key));
  }, [state, me]);
  // Responsáveis presentes nas tarefas que este papel já enxerga (o backend
  // escopa state.tasks) — gestor vê só quem tem atividade no seu setor, dev vê todos.
  const responsibles = useMemo(() => {
    const present = new Set(state.tasks.map((t) => t.assignee).filter(Boolean));
    return state.members.filter((m) => present.has(m.id)).sort((a, b) => a.name.localeCompare(b.name));
  }, [state]);

  const filtered = useMemo(() => {
    let list = state.tasks.slice();
    if (statusFilter !== 'all') list = list.filter((t) => effStatus(t, todayD) === statusFilter);
    if (catFilter !== 'all') list = list.filter((t) => t.cat === catFilter);
    if (empFilter !== 'all') list = list.filter((t) => t.empresa === empFilter);
    if (respFilter !== 'all') list = list.filter((t) => t.assignee === respFilter);

    // Pesquisa por título, empresa, responsável, setor e observação.
    // Vários termos = todos precisam casar (ex.: "conciliacao alfa").
    const terms = norm(query).split(/\s+/).filter(Boolean);
    if (terms.length) {
      list = list.filter((t) => {
        const haystack = norm([
          t.title, t.empresa, t.obs, t.periodic, t.dia,
          memberOf(t.assignee).name, catOf(t.cat).label,
        ].join(' '));
        return terms.every((term) => haystack.includes(term));
      });
    }

    list.sort((a, b) => parse(a.due) - parse(b.due));
    return list;
  }, [state, statusFilter, catFilter, empFilter, respFilter, query, todayD, memberOf, catOf]);

  const select = { padding: '9px 12px', borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`,
    fontSize: 13.5, color: 'oklch(0.4 0.02 265)', background: '#fff', cursor: 'pointer' };

  const hasQuery = query.trim().length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Pesquisa de atividades */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 420px', maxWidth: 520 }}>
          <Search size={16} color={COLORS.mutedText} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="search"
            placeholder="Pesquisar atividades por título, empresa, responsável…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
            style={{ width: '100%', padding: '11px 38px 11px 40px', borderRadius: 11,
              border: `1px solid ${hasQuery ? ACCENT : COLORS.inputBorder}`, fontSize: 14,
              background: '#fff', color: 'oklch(0.3 0.02 265)' }}
          />
          {hasQuery && (
            <button onClick={() => setQuery('')} title="Limpar pesquisa"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent',
                cursor: 'pointer', color: COLORS.mutedText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={15} />
            </button>
          )}
        </div>
        {hasQuery && (
          <span style={{ fontSize: 13, color: COLORS.mutedText }}>
            <b style={{ color: 'oklch(0.3 0.02 265)' }}>{filtered.length}</b>
            {filtered.length === 1 ? ' atividade encontrada' : ' atividades encontradas'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {CHIPS.map(([v, l]) => {
          const on = statusFilter === v;
          return (
            <button key={v} onClick={() => setStatusFilter(v)} style={{ padding: '8px 15px', borderRadius: 10,
              fontSize: 13.5, fontWeight: 600, cursor: 'pointer', border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`,
              background: on ? ACCENT : '#fff', color: on ? '#fff' : 'oklch(0.4 0.02 265)' }}>{l}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        {me.role !== 'usuario' && (
          <select style={select} value={respFilter} onChange={(e) => setRespFilter(e.target.value)}>
            <option value="all">Todos os responsáveis</option>
            {responsibles.map((m) => <option key={m.id} value={m.id}>{m.id === me.id ? `${m.name} (eu)` : m.name}</option>)}
          </select>
        )}
        <select style={select} value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}>
          <option value="all">Todas as empresas</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={select} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">Todas as categorias</option>
          {cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, boxShadow: COLORS.cardShadow, overflow: 'hidden' }}>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 18px', textAlign: 'center', color: COLORS.mutedText, fontSize: 14 }}>
            {hasQuery
              ? <>Nenhuma atividade encontrada para “<b>{query.trim()}</b>”.</>
              : 'Nenhuma tarefa com esses filtros.'}
          </div>
        )}
        {filtered.map((t) => (
          <TaskRow key={t.id} task={t} tasks={state.tasks} todayISO={state.today}
            catOf={catOf} memberOf={memberOf} onOpen={openTask} />
        ))}
      </div>
    </div>
  );
}
