import { useMemo } from 'react';
import { ACCENT, COLORS, softOf } from '../lib/theme.js';
import { computeReports, computeCompare, procMetrics, teamCards } from '../lib/model.js';

export default function Relatorios({ state }) {
  const rep = useMemo(() => computeReports(state), [state]);
  const compare = useMemo(() => computeCompare(state), [state]);
  const metrics = useMemo(() => procMetrics(state, rep), [state, rep]);
  const team = useMemo(() => teamCards(state), [state]);

  const card = { background: '#fff', borderRadius: 18, padding: '22px 24px', boxShadow: COLORS.cardShadow };
  const kpi = (label, value, color) => (
    <div style={card}>
      <div style={{ fontSize: 13, color: COLORS.mutedText, fontWeight: 500 }}>{label}</div>
      <div className="mono" style={{ fontSize: 34, fontWeight: 800, color: color || COLORS.titleText, marginTop: 8 }}>{value}</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {kpi('Total de tarefas', rep.total)}
        {kpi('Taxa de conclusão', rep.doneRate + '%', 'oklch(0.5 0.13 150)')}
        {kpi('No prazo', rep.onTime + '%')}
        {kpi('Atrasadas', rep.lateTotal, 'oklch(0.55 0.18 25)')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
        <div style={card}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.titleText, margin: '0 0 18px' }}>Tarefas por categoria</h3>
          {rep.byCat.map((c) => (
            <div key={c.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                <span style={{ color: 'oklch(0.35 0.02 265)', fontWeight: 600 }}>{c.label}</span>
                <span className="mono" style={{ color: COLORS.mutedText }}>{c.count}</span>
              </div>
              <div style={{ height: 8, background: 'oklch(0.95 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${c.barPct}%`, height: '100%', background: c.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        <div style={card}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.titleText, margin: '0 0 18px' }}>Situação das tarefas</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div style={{ width: 150, height: 150, borderRadius: '50%', flexShrink: 0, background: rep.donut }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LegendItem color="oklch(0.5 0.13 150)" label="Concluída" n={rep.concluida} />
              <LegendItem color={ACCENT} label="Em andamento" n={rep.andamento} />
              <LegendItem color="oklch(0.55 0.18 25)" label="Atrasada" n={rep.atrasada} />
              <LegendItem color="oklch(0.85 0.02 260)" label="Pendente" n={rep.pendente} />
            </div>
          </div>
        </div>
      </div>

      {compare && (
        <div style={card}>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.titleText, margin: '0 0 6px' }}>Comparativo de ciclos</h3>
          {compare.preCycleNote && <div style={{ fontSize: 13, color: COLORS.mutedText, marginBottom: 14 }}>{compare.preCycleNote}</div>}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ padding: '12px 16px', borderRadius: 12, background: m.isCurrent ? softOf(ACCENT) : COLORS.appBg, minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'oklch(0.35 0.02 265)' }}>{m.cycle}</div>
                <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 4 }}>Fechamento: <b>{m.dtc}</b></div>
                <div style={{ fontSize: 12, color: COLORS.mutedText }}>No prazo: <b>{m.onTime}</b></div>
                <div style={{ fontSize: 12, color: COLORS.mutedText }}>Reaberturas: <b>{m.reopens}</b></div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLORS.mutedText, marginBottom: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 8, background: 'oklch(0.75 0.02 265)', borderRadius: 3 }} /> {compare.prevLabel}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 12, height: 8, background: ACCENT, borderRadius: 3 }} /> {compare.curLabel} (em curso)</span>
          </div>
          {compare.rows.map((r) => (
            <div key={r.label} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'oklch(0.35 0.02 265)' }}>{r.label}</span>
                <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: COLORS.mutedText }}>atrasadas: {r.lateLabel}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.delta.color }}>{r.delta.label}</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 8, background: 'oklch(0.95 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${r.prevPct}%`, height: '100%', background: 'oklch(0.75 0.02 265)', borderRadius: 999 }} />
                </div>
                <div style={{ height: 8, background: 'oklch(0.95 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ width: `${r.curPct}%`, height: '100%', background: ACCENT, borderRadius: 999 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={card}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: COLORS.titleText, margin: '0 0 18px' }}>Produtividade por responsável</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {team.map((m) => (
            <div key={m.id} style={{ padding: 14, borderRadius: 12, background: COLORS.appBg }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'oklch(0.3 0.02 265)' }}>{m.name}</div>
              <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 2 }}>{m.doneCount} concluídas · {m.count} ativas · {m.overdue} atrasadas</div>
              <div style={{ height: 6, background: 'oklch(0.92 0.01 260)', borderRadius: 999, overflow: 'hidden', marginTop: 8 }}>
                <div style={{ width: `${m.loadPct}%`, height: '100%', background: m.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, n }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'oklch(0.4 0.02 265)' }}>
      <span style={{ width: 11, height: 11, borderRadius: 3, background: color }} /> {label} — <b>{n}</b>
    </div>
  );
}
