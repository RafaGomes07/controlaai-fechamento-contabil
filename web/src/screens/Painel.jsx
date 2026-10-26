import { useMemo } from 'react';
import { Diamond } from 'lucide-react';
import { ACCENT, COLORS, STATUS_COLORS, softOf, chip, sectionTitle } from '../lib/theme.js';
import { computePanel, todayLabel, parse } from '../lib/model.js';

export default function Painel({ state, goSector, openTask }) {
  const panel = useMemo(() => computePanel(state), [state]);
  const todayD = parse(state.today);
  const ringDeg = Math.round(panel.doneRate * 3.6);

  const dot = (c) => ({ width: 9, height: 9, borderRadius: 2, background: c, flexShrink: 0 });
  const legendCounts = { concluida: panel.scConc, andamento: panel.scAnd, atrasada: panel.scAtr, pendente: panel.scPend };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 13.5, color: COLORS.mutedText, fontWeight: 500 }}>{todayLabel(todayD)}</div>
        <h2 style={{ fontSize: 25, fontWeight: 800, margin: '3px 0 0', color: COLORS.titleText }}>
          Fechamento de resultados {state.cycle.cycle}
        </h2>
      </div>

      {/* 3 tiles de topo */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1.15fr 0.9fr', gap: 16 }}>
        {/* Andamento do ciclo */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: COLORS.cardShadow }}>
          <div style={sectionTitle}>Andamento do ciclo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 128, height: 128, borderRadius: '50%', flexShrink: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: `conic-gradient(oklch(0.5 0.13 150) 0deg ${ringDeg}deg, oklch(0.92 0.012 260) ${ringDeg}deg 360deg)` }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#fff', display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mono" style={{ fontSize: 28, fontWeight: 800, color: 'oklch(0.28 0.03 265)', lineHeight: 1 }}>{panel.doneRate}%</span>
                <span style={{ fontSize: 10.5, color: COLORS.mutedText, marginTop: 2 }}>concluído</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', background: 'oklch(0.95 0.01 260)', marginBottom: 12 }}>
                <div style={{ width: `${pctOf(legendCounts.concluida, panel.totalAll)}%`, background: STATUS_COLORS.concluida }} />
                <div style={{ width: `${pctOf(legendCounts.andamento, panel.totalAll)}%`, background: STATUS_COLORS.andamento }} />
                <div style={{ width: `${pctOf(legendCounts.atrasada, panel.totalAll)}%`, background: STATUS_COLORS.atrasada }} />
                <div style={{ width: `${pctOf(legendCounts.pendente, panel.totalAll)}%`, background: STATUS_COLORS.pendente }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                <Legend dotStyle={dot(STATUS_COLORS.concluida)} label="Concluída" n={panel.scConc} />
                <Legend dotStyle={dot(STATUS_COLORS.atrasada)} label="Atrasada" n={panel.scAtr} />
                <Legend dotStyle={dot(STATUS_COLORS.andamento)} label="Em and." n={panel.scAnd} />
                <Legend dotStyle={dot(STATUS_COLORS.pendente)} label="Pendente" n={panel.scPend} />
              </div>
            </div>
          </div>
        </div>

        {/* Previsão de fechamento */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: COLORS.cardShadow }}>
          <div style={sectionTitle}>Previsão de fechamento</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: panel.indeterminate ? 20 : 30, fontWeight: 800, color: 'oklch(0.26 0.03 265)', lineHeight: 1.2 }}>{panel.projectedLabel}</span>
            <span style={{ ...chip(panel.riskColor, softOf(panel.riskColor)), fontWeight: 700, fontSize: 12.5 }}>{panel.riskLabel}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.02 265)', marginTop: 8 }}>
            Meta <b>D+5</b> ({panel.plannedLabel}) · faltam <b>{panel.daysLeft}</b> dias úteis
          </div>
          {panel.beyondTarget > 0 && (
            <div style={{ fontSize: 12, color: 'oklch(0.5 0.13 78)', marginTop: 5 }}>
              <b>{panel.beyondTarget}</b> atividades com prazo além do D+5
            </div>
          )}
          <div style={{ position: 'relative', height: 8, background: 'oklch(0.93 0.012 260)', borderRadius: 999, marginTop: 22 }}>
            <div style={{ width: `${panel.doneRate}%`, height: '100%', background: 'oklch(0.5 0.13 150)', borderRadius: 999 }} />
            <div style={{ position: 'absolute', top: -5, left: `${panel.todayPct}%`, width: 3, height: 18, background: 'oklch(0.3 0.03 265)', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: COLORS.mutedText, marginTop: 7 }}>
            <span>{panel.startLabel}</span><span style={{ fontWeight: 600, color: 'oklch(0.35 0.03 265)' }}>hoje</span><span>{panel.endLabel}</span>
          </div>
        </div>

        {/* Setores impactando */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: COLORS.cardShadow }}>
          <div style={sectionTitle}>Setores impactando</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1, color: panel.critCount > 0 ? 'oklch(0.5 0.18 25)' : 'oklch(0.45 0.13 150)' }}>{panel.critCount}</div>
          <div style={{ fontSize: 12.5, color: 'oklch(0.5 0.02 265)', marginTop: 8, lineHeight: 1.5 }}>{panel.critNames}</div>
        </div>
      </div>

      {/* Gantt por setor */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '20px 22px', boxShadow: COLORS.cardShadow }}>
        <div style={sectionTitle}>Cronograma por setor</div>
        <Gantt gantt={panel.gantt} onOpenSector={goSector} onOpenTask={openTask} />
      </div>

      {/* Andamento por setor */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '4px 0 14px', color: COLORS.titleText }}>Andamento por setor</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {panel.sectorCards.map((s) => (
            <div key={s.key} onClick={() => goSector(s.key)} style={{ background: '#fff', borderRadius: 16, padding: 18,
              boxShadow: COLORS.cardShadow, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
                <div style={{ width: 11, height: 11, borderRadius: '50%', background: s.healthColor }} />
                <div style={{ fontSize: 14.5, fontWeight: 700, color: 'oklch(0.28 0.02 265)', flex: 1 }}>{s.label}</div>
                <span style={{ ...chip(s.healthColor, softOf(s.healthColor)), fontWeight: 700 }}>{s.healthLabel}</span>
                <span className="mono" style={{ fontSize: 20, fontWeight: 800,
                  color: s.health === 'critico' ? 'oklch(0.5 0.18 25)' : s.health === 'atencao' ? 'oklch(0.5 0.13 78)' : 'oklch(0.45 0.13 150)' }}>{s.pct}%</span>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'oklch(0.95 0.01 260)' }}>
                <div style={{ width: `${pctOf(s.conc, s.total)}%`, background: STATUS_COLORS.concluida }} />
                <div style={{ width: `${pctOf(s.and, s.total)}%`, background: STATUS_COLORS.andamento }} />
                <div style={{ width: `${pctOf(s.atr, s.total)}%`, background: STATUS_COLORS.atrasada }} />
                <div style={{ width: `${pctOf(s.pend, s.total)}%`, background: STATUS_COLORS.pendente }} />
              </div>
              <div style={{ fontSize: 12, color: COLORS.mutedText, marginTop: 10 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ dotStyle, label, n }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={dotStyle} /><span style={{ fontSize: 12, color: 'oklch(0.4 0.02 265)' }}>{label} <b>{n}</b></span>
    </div>
  );
}

export function Gantt({ gantt, onOpenSector, onOpenTask, dense = false, fill = false }) {
  // dense: alturas reduzidas para caber em visão única (modo TV).
  // fill: as linhas crescem para ocupar toda a altura disponível do contêiner
  // (modo TV em tela cheia) — o contêiner pai precisa ser flex column.
  const rowH = dense ? 26 : 36;
  const msH = dense ? 22 : 30;
  const barTop = dense ? 4 : 7;
  const barH = fill ? 26 : dense ? 18 : 22;
  const labelW = fill ? 200 : 150; // coluna dos nomes de setor
  return (
    <div style={{ marginTop: 4, ...(fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
      {/* eixo de dias úteis */}
      <div style={{ position: 'relative', height: dense ? 16 : 18, marginLeft: labelW, marginBottom: 4, flexShrink: 0 }}>
        {gantt.axis.map((a, i) => (
          <span key={i} style={{ position: 'absolute', left: `${a.left}%`, transform: 'translateX(-50%)',
            fontSize: 10.5, color: 'oklch(0.5 0.02 265)', fontWeight: 600 }}>{a.label}</span>
        ))}
      </div>
      {/* linha de marcos */}
      {gantt.hasMilestones && (
        <div style={{ display: 'flex', alignItems: 'center', height: msH }}>
          <div style={{ width: labelW, fontSize: 12, fontWeight: 700, color: 'oklch(0.45 0.05 78)' }}>Marcos</div>
          <div style={{ position: 'relative', flex: 1, height: '100%' }}>
            {gantt.milestones.map((m) => (
              <div key={m.id} onClick={(e) => { e.stopPropagation(); onOpenTask(m.id); }}
                style={{ position: 'absolute', left: `${m.left}%`, top: dense ? 2 : 4, transform: 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', zIndex: 4 }}>
                <div style={{ width: 13, height: 13, transform: 'rotate(45deg)', borderRadius: 3,
                  background: m.done ? 'oklch(0.5 0.13 150)' : 'oklch(0.6 0.13 78)', boxShadow: '0 0 0 3px #fff' }} />
              </div>
            ))}
          </div>
        </div>
      )}
      {/* barras por setor */}
      <div style={{ position: 'relative', ...(fill ? { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } : {}) }}>
        {gantt.rows.map((r, i) => (
          <div key={i} onClick={() => onOpenSector(r.open)} style={{ display: 'flex', alignItems: 'center',
            ...(fill ? { flex: 1, minHeight: rowH } : { height: rowH }), cursor: 'pointer' }}>
            <div style={{ width: labelW, display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8 }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
              <span style={{ fontSize: fill ? 13.5 : 12.5, fontWeight: 600, color: 'oklch(0.35 0.02 265)', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
            </div>
            <div style={{ position: 'relative', flex: 1, height: '100%' }}>
              <div style={{ position: 'absolute', height: barH, left: `${r.leftPct}%`, width: `${r.widthPct}%`,
                ...(fill ? { top: '50%', transform: 'translateY(-50%)' } : { top: barTop }),
                minWidth: 14, background: softOf(r.color), borderRadius: 7, display: 'flex', alignItems: 'center' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${r.pct}%`, background: r.color, opacity: 0.5, borderRadius: 7 }} />
                <span style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                  ...(r.labelPos === 'inside' ? { left: 8, color: 'oklch(0.3 0.02 265)' }
                    : r.labelPos === 'left' ? { right: 'calc(100% + 8px)', color: r.color }
                      : { left: 'calc(100% + 8px)', color: r.color }) }}>{r.pct}% · {r.total}</span>
              </div>
            </div>
          </div>
        ))}
        {/* linha hoje + meta */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${labelW}px + (100% - ${labelW}px) * ${gantt.todayPct / 100})`,
          width: 2, background: 'oklch(0.35 0.03 265)', opacity: 0.55, zIndex: 3 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `calc(${labelW}px + (100% - ${labelW}px) * ${gantt.metaPct / 100})`,
          borderLeft: `2px dashed ${ACCENT}`, opacity: 0.7, zIndex: 3 }} />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, marginLeft: labelW, fontSize: 11, color: COLORS.mutedText, flexShrink: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 2, background: 'oklch(0.35 0.03 265)' }} /> hoje</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, borderTop: `2px dashed ${ACCENT}` }} /> meta D+5</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Diamond size={11} color="oklch(0.6 0.13 78)" /> marco</span>
      </div>
    </div>
  );
}

export const pctOf = (n, t) => (t ? (n / t) * 100 : 0);
