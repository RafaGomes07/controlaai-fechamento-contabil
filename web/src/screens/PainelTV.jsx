// Painel do ciclo em tela cheia (modo TV) — acessível sem login via "#tv".
// Consome o endpoint público sanitizado (/api/public/panel): só agregados,
// sem responsáveis, comentários ou detalhes das tarefas. Auto-atualiza.
import { useEffect, useMemo, useState } from 'react';
import { COLORS, STATUS_COLORS, softOf, chip, sectionTitle } from '../lib/theme.js';
import { computePanel, todayLabel, parse } from '../lib/model.js';
import { api } from '../lib/api.js';
import { Gantt, pctOf } from './Painel.jsx';

const REFRESH_MS = 60 * 1000;
// Empresas exibidas no modo TV, alternando automaticamente entre elas.
// Cada uma tem cor própria para reconhecimento imediato à distância.
const COMPANIES = [
  { name: 'Empresa Alfa', color: 'oklch(0.55 0.16 145)' }, // verde da marca
  { name: 'Empresa Beta', color: 'oklch(0.5 0.14 250)' },   // azul — contraste
];
const ROTATE_MS = 15 * 1000;
// Tarefas marcadas para todas as empresas (ou para o par) entram nas duas visões.
const sharedEmpresa = (e) => e === 'Todas' || e === 'Alfa e Beta';
const noop = () => {};

export default function PainelTV() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [companyIdx, setCompanyIdx] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await api.publicPanel();
        if (!alive) return;
        setState(data); setError(''); setUpdatedAt(new Date());
      } catch (e) {
        if (alive) setError(e.message || 'Falha ao carregar o painel.');
      }
    };
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  // Rotação automática entre as empresas.
  useEffect(() => {
    const t = setInterval(() => setCompanyIdx((i) => (i + 1) % COMPANIES.length), ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  const company = COMPANIES[companyIdx];
  const panel = useMemo(() => {
    if (!state) return null;
    const tasks = state.tasks.filter((t) => t.empresa === company.name || sharedEmpresa(t.empresa));
    return computePanel({ ...state, tasks });
  }, [state, company]);

  if (!state) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: COLORS.appBg, color: COLORS.mutedText, fontSize: 15 }}>
        {error || 'Carregando painel…'}
      </div>
    );
  }

  const todayD = parse(state.today);
  const ringDeg = Math.round(panel.doneRate * 3.6);
  const dot = (c) => ({ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 });
  const card = { background: '#fff', borderRadius: 16, padding: '14px 18px', boxShadow: COLORS.cardShadow };
  const updatedLabel = updatedAt
    ? `${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')}`
    : '—';

  return (
    <div style={{ height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      gap: 12, padding: '16px 22px 14px', background: COLORS.appBg, boxSizing: 'border-box',
      borderTop: `6px solid ${company.color}` }}>
      {/* topo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        <img src="/logo.svg" alt="ControlaAí" style={{ height: 20 }} />
        <h1 style={{ fontSize: 21, fontWeight: 800, margin: 0, color: COLORS.titleText }}>
          Fechamento de resultados {state.cycle.cycle}
        </h1>
        <span onClick={() => setCompanyIdx((i) => (i + 1) % COMPANIES.length)}
          style={{ background: company.color, color: '#fff', fontWeight: 800, fontSize: 24,
            padding: '5px 24px', borderRadius: 12, letterSpacing: '0.01em',
            cursor: 'pointer', userSelect: 'none', lineHeight: 1.25 }}>{company.name}</span>
        <span style={{ display: 'flex', gap: 6 }}>
          {COMPANIES.map((c, i) => (
            <span key={c.name} style={{ width: 9, height: 9, borderRadius: '50%',
              background: i === companyIdx ? c.color : 'oklch(0.85 0.02 260)' }} />
          ))}
        </span>
        <span style={{ fontSize: 13, color: COLORS.mutedText, fontWeight: 500 }}>{todayLabel(todayD)}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: COLORS.mutedText }}>
          Atualizado às {updatedLabel}{error ? ' · sem conexão, tentando de novo…' : ''}
        </span>
        <a href="#" onClick={(e) => { e.preventDefault(); window.location.hash = ''; }}
          style={{ fontSize: 12.5, fontWeight: 600, color: COLORS.mutedText, textDecoration: 'none' }}>
          Entrar →
        </a>
      </div>

      {/* tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.15fr 0.9fr', gap: 12, flexShrink: 0 }}>
        <div style={card}>
          <div style={sectionTitle}>Andamento do ciclo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: `conic-gradient(oklch(0.5 0.13 150) 0deg ${ringDeg}deg, oklch(0.92 0.012 260) ${ringDeg}deg 360deg)` }}>
              <div style={{ width: 74, height: 74, borderRadius: '50%', background: '#fff', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'oklch(0.28 0.03 265)', lineHeight: 1 }}>{panel.doneRate}%</span>
                <span style={{ fontSize: 9.5, color: COLORS.mutedText, marginTop: 2 }}>concluído</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', height: 9, borderRadius: 999, overflow: 'hidden', background: 'oklch(0.95 0.01 260)', marginBottom: 10 }}>
                <div style={{ width: `${pctOf(panel.scConc, panel.totalAll)}%`, background: STATUS_COLORS.concluida }} />
                <div style={{ width: `${pctOf(panel.scAnd, panel.totalAll)}%`, background: STATUS_COLORS.andamento }} />
                <div style={{ width: `${pctOf(panel.scAtr, panel.totalAll)}%`, background: STATUS_COLORS.atrasada }} />
                <div style={{ width: `${pctOf(panel.scPend, panel.totalAll)}%`, background: STATUS_COLORS.pendente }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px' }}>
                <Legend dotStyle={dot(STATUS_COLORS.concluida)} label="Concluída" n={panel.scConc} />
                <Legend dotStyle={dot(STATUS_COLORS.atrasada)} label="Atrasada" n={panel.scAtr} />
                <Legend dotStyle={dot(STATUS_COLORS.andamento)} label="Em and." n={panel.scAnd} />
                <Legend dotStyle={dot(STATUS_COLORS.pendente)} label="Pendente" n={panel.scPend} />
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={sectionTitle}>Previsão de fechamento</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: panel.indeterminate ? 18 : 26, fontWeight: 800, color: 'oklch(0.26 0.03 265)', lineHeight: 1.2 }}>{panel.projectedLabel}</span>
            <span style={{ ...chip(panel.riskColor, softOf(panel.riskColor)), fontWeight: 700, fontSize: 12 }}>{panel.riskLabel}</span>
          </div>
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 265)', marginTop: 7 }}>
            Meta <b>D+5</b> ({panel.plannedLabel}) · faltam <b>{panel.daysLeft}</b> dias úteis
            {panel.beyondTarget > 0 && <> · <b style={{ color: 'oklch(0.5 0.13 78)' }}>{panel.beyondTarget}</b> além do D+5</>}
          </div>
          <div style={{ position: 'relative', height: 8, background: 'oklch(0.93 0.012 260)', borderRadius: 999, marginTop: 16 }}>
            <div style={{ width: `${panel.doneRate}%`, height: '100%', background: 'oklch(0.5 0.13 150)', borderRadius: 999 }} />
            <div style={{ position: 'absolute', top: -5, left: `${panel.todayPct}%`, width: 3, height: 18, background: 'oklch(0.3 0.03 265)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: COLORS.mutedText, marginTop: 6 }}>
            <span>{panel.startLabel}</span><span style={{ fontWeight: 600, color: 'oklch(0.35 0.03 265)' }}>hoje</span><span>{panel.endLabel}</span>
          </div>
        </div>

        <div style={card}>
          <div style={sectionTitle}>Setores impactando</div>
          <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1,
            color: panel.critCount > 0 ? 'oklch(0.5 0.18 25)' : 'oklch(0.45 0.13 150)' }}>{panel.critCount}</div>
          <div style={{ fontSize: 12, color: 'oklch(0.5 0.02 265)', marginTop: 7, lineHeight: 1.45 }}>{panel.critNames}</div>
        </div>
      </div>

      {/* gantt — ocupa o espaço flexível do meio; linhas esticam (fill) */}
      <div style={{ ...card, flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ ...sectionTitle, flexShrink: 0 }}>Cronograma por setor</div>
        <Gantt gantt={panel.gantt} onOpenSector={noop} onOpenTask={noop} dense fill />
      </div>

      {/* andamento por setor — cartões em uma fileira */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, flexShrink: 0 }}>
        {panel.sectorCards.map((s) => (
          <div key={s.key} style={{ background: '#fff', borderRadius: 14, padding: '15px 17px', boxShadow: COLORS.cardShadow }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: s.healthColor, flexShrink: 0 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'oklch(0.28 0.02 265)', flex: 1, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
              <span className="mono" style={{ fontSize: 18, fontWeight: 800,
                color: s.health === 'critico' ? 'oklch(0.5 0.18 25)' : s.health === 'atencao' ? 'oklch(0.5 0.13 78)' : 'oklch(0.45 0.13 150)' }}>{s.pct}%</span>
            </div>
            <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'oklch(0.95 0.01 260)' }}>
              <div style={{ width: `${pctOf(s.conc, s.total)}%`, background: STATUS_COLORS.concluida }} />
              <div style={{ width: `${pctOf(s.and, s.total)}%`, background: STATUS_COLORS.andamento }} />
              <div style={{ width: `${pctOf(s.atr, s.total)}%`, background: STATUS_COLORS.atrasada }} />
              <div style={{ width: `${pctOf(s.pend, s.total)}%`, background: STATUS_COLORS.pendente }} />
            </div>
            <div style={{ fontSize: 12.5, color: COLORS.mutedText, marginTop: 9, lineHeight: 1.45 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ dotStyle, label, n }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={dotStyle} /><span style={{ fontSize: 11.5, color: 'oklch(0.4 0.02 265)' }}>{label} <b>{n}</b></span>
    </div>
  );
}
