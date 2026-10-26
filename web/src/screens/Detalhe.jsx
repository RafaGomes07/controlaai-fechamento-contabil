import { useMemo, useState } from 'react';
import { Diamond, Lock, Paperclip, RotateCcw } from 'lucide-react';
import { ACCENT, COLORS, softOf, chip, primaryBtn, ghostBtn, priMeta, STATUS_META } from '../lib/theme.js';
import {
  makeMaps, effStatus, dueInfo, dueFull, isBlocked, canApprove, canManage, parse, periodicLabel,
} from '../lib/model.js';
import { api } from '../lib/api.js';
import { Avatar } from '../components/ui.jsx';

export default function Detalhe({ state, me, task, openTask, editTask, go, reload }) {
  const { catOf, memberOf } = useMemo(() => makeMaps(state), [state]);
  const todayD = parse(state.today);
  const [obs, setObs] = useState('');
  const [err, setErr] = useState('');
  const [evidenceDraft, setEvidenceDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState('');
  const [dupBusy, setDupBusy] = useState(false);

  const t = task;
  const cat = catOf(t.cat);
  const pri = priMeta(t.priority);
  const es = effStatus(t, todayD);
  const sm = STATUS_META[es];
  const info = dueInfo(t, todayD);
  const assignee = memberOf(t.assignee);
  const approver = t.approver ? memberOf(t.approver) : null;
  const dep = t.dependsOn ? state.tasks.find((x) => x.id === t.dependsOn) : null;
  const blocked = isBlocked(t, state.tasks);

  const iCanApprove = canApprove(me, t);
  const iCanManage = canManage(me, t.cat);
  const isOwn = t.assignee === me.id;
  const inReview = t.status === 'review';
  const showApproval = inReview && iCanApprove;
  const waitingApproval = inReview && !iCanApprove;
  const canDecideReopen = !!t.reopenRequest && iCanApprove;
  // Qualquer responsável (usuário, gestor ou dev) executa a PRÓPRIA tarefa pelo
  // mesmo controle "Atualizar status" (com justificativa quando atrasada).
  const showStatusControl = isOwn && !blocked && t.status !== 'review' && t.status !== 'done';
  const showReopenControl = t.status === 'done' && !t.reopenRequest && (iCanManage || (me.role === 'usuario' && isOwn));
  const reopenNeedsApproval = !!(t.approver && t.approver !== me.id);
  const canEditDetail = canManage(me, t.cat);
  const canAddEvidence = me.role !== 'usuario' || isOwn;
  const needsObs = es === 'atrasada';

  async function run(fn) {
    setErr('');
    try { await fn(); setObs(''); await reload(); }
    catch (e) { setErr(e.message || 'Falha na operação.'); }
  }

  async function duplicate() {
    setErr(''); setDupBusy(true);
    try {
      const copy = await api.duplicateTask(t.id);
      await reload();
      editTask(copy.id);
    } catch (e) {
      setErr(e.message || 'Falha ao duplicar tarefa.');
    } finally {
      setDupBusy(false);
    }
  }

  const box = { background: '#fff', borderRadius: 18, padding: '24px 26px', boxShadow: COLORS.cardShadow };
  const label = { fontSize: 12, fontWeight: 600, color: COLORS.mutedText, textTransform: 'uppercase', letterSpacing: '0.03em' };
  const value = { fontSize: 15, fontWeight: 600, color: 'oklch(0.3 0.02 265)', marginTop: 6 };
  const obsInput = { width: '100%', minHeight: 70, padding: '10px 12px', borderRadius: 11,
    border: '1px solid oklch(0.85 0.05 25)', fontSize: 14, resize: 'vertical' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button style={ghostBtn} onClick={() => go('tasks')}>‹ Voltar</button>
        {canEditDetail && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={ghostBtn} onClick={duplicate} disabled={dupBusy}>{dupBusy ? 'Duplicando…' : 'Duplicar'}</button>
            <button style={ghostBtn} onClick={() => editTask(t.id)}>Editar</button>
          </div>
        )}
      </div>

      <div style={box}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={chip(cat.color, softOf(cat.color))}>{cat.label}</span>
          <span style={chip(pri.color, softOf(pri.color))}>{pri.label}</span>
          <span style={chip(sm.color, softOf(sm.color))}>{sm.label}</span>
          {t.milestone && <span style={{ ...chip('oklch(0.5 0.13 78)', softOf('oklch(0.6 0.13 78)')), fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Diamond size={11} /> Marco</span>}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: COLORS.titleText, margin: 0 }}>{t.title}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 22,
          paddingTop: 22, borderTop: `1px solid ${COLORS.borderSoft}` }}>
          <div>
            <div style={label}>Responsável</div>
            <div style={{ ...value, display: 'flex', alignItems: 'center', gap: 8 }}><Avatar member={assignee} size={28} /> {assignee.name}</div>
          </div>
          <div><div style={label}>Prazo</div><div style={value}><span style={{ ...chip(info.color, info.bg) }}>{dueFull(t.due)}</span></div></div>
          <div>
            <div style={label}>Progresso</div>
            <div style={{ ...value, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 6, background: 'oklch(0.94 0.01 260)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${t.progress}%`, height: '100%', background: ACCENT }} />
              </div>
              <span className="mono" style={{ fontSize: 13 }}>{t.progress}%</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginTop: 20 }}>
          <div><div style={label}>Empresa</div><div style={value}>{t.empresa || '—'}</div></div>
          <div><div style={label}>Periodicidade</div><div style={value}>{periodicLabel(t.periodic, t.periodicMonths)}</div></div>
          <div><div style={label}>Dia do ciclo</div><div style={value}>{t.dia || '—'}</div></div>
          <div><div style={label}>Entrega</div><div style={value}>{t.entrega ? dueFull(t.entrega) : 'Não entregue'}</div></div>
        </div>

        {approver && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontSize: 14, color: 'oklch(0.4 0.02 265)' }}>
            <span style={{ ...label }}>Aprovador:</span> <Avatar member={approver} size={26} /> <b>{approver.name}</b>
          </div>
        )}
      </div>

      {/* Dependência / bloqueio */}
      {dep && (
        <div style={box}>
          <div style={label}>Depende de</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span onClick={() => openTask(dep.id)} style={{ fontSize: 14, fontWeight: 600, color: ACCENT, cursor: 'pointer' }}>{dep.title}</span>
            <span style={chip(STATUS_META[effStatus(dep, todayD)].color, softOf(STATUS_META[effStatus(dep, todayD)].color))}>{STATUS_META[effStatus(dep, todayD)].label}</span>
          </div>
          {blocked && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 11, background: softOf('oklch(0.6 0.13 78)'),
              color: 'oklch(0.45 0.12 78)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={15} /> Bloqueada — aguarda a antecessora ser concluída.
            </div>
          )}
        </div>
      )}

      {err && <div style={{ padding: '10px 14px', borderRadius: 11, background: softOf('oklch(0.6 0.18 25)'), color: 'oklch(0.5 0.18 25)', fontSize: 13 }}>{err}</div>}

      {/* Banners de aprovação */}
      {waitingApproval && (
        <Banner color="oklch(0.55 0.16 300)">Aguardando aprovação{approver ? ` de ${approver.name}` : ''}.</Banner>
      )}
      {showApproval && (
        <div style={box}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.titleText, marginBottom: 12 }}>Esta conclusão aguarda sua decisão</div>
          <textarea placeholder="Motivo (obrigatório para reprovar)" style={obsInput} value={obs} onChange={(e) => setObs(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button style={primaryBtn} onClick={() => run(() => api.approve(t.id))}>Aprovar</button>
            <button style={{ ...ghostBtn, color: 'oklch(0.5 0.18 25)', borderColor: 'oklch(0.8 0.08 25)' }} onClick={() => run(() => api.reject(t.id, obs))}>Reprovar</button>
          </div>
        </div>
      )}

      {/* Solicitação de reabertura para decidir */}
      {t.reopenRequest && (
        <div style={box}>
          <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.titleText }}>Solicitação de reabertura</div>
          <div style={{ fontSize: 13, color: 'oklch(0.45 0.02 265)', marginTop: 6 }}>
            <b>{memberOf(t.reopenRequest.by).name}</b> · {t.reopenRequest.when}<br />{t.reopenRequest.reason}
          </div>
          {canDecideReopen && (
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button style={primaryBtn} onClick={() => run(() => api.approveReopen(t.id))}>Aprovar reabertura</button>
              <button style={ghostBtn} onClick={() => run(() => api.denyReopen(t.id))}>Negar</button>
            </div>
          )}
        </div>
      )}

      {/* Controle de status (usuário) */}
      {showStatusControl && (
        <div style={box}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.titleText, marginBottom: 12 }}>Atualizar status</div>
          {needsObs && <textarea placeholder="Justificativa de atraso (obrigatória)" style={{ ...obsInput, marginBottom: 12 }} value={obs} onChange={(e) => setObs(e.target.value)} />}
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btnToggle(t.status === 'doing')} onClick={() => run(() => api.setStatus(t.id, 'doing', obs))}>Em andamento</button>
            <button style={btnToggle(false)} onClick={() => run(() => api.setStatus(t.id, 'done', obs))}>
              {reopenNeedsApproval ? 'Concluir → aprovação' : 'Concluído'}
            </button>
          </div>
        </div>
      )}

      {/* Reabrir concluída */}
      {showReopenControl && (
        <div style={box}>
          <div style={{ fontSize: 15, fontWeight: 700, color: COLORS.titleText, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={16} /> Reabrir tarefa concluída
          </div>
          <textarea placeholder="Justificativa (obrigatória)" style={obsInput} value={obs} onChange={(e) => setObs(e.target.value)} />
          <button style={{ ...ghostBtn, marginTop: 12 }} onClick={() => run(() => api.reopen(t.id, obs))}>
            {reopenNeedsApproval ? 'Solicitar reabertura → aprovação' : 'Reabrir tarefa'}
          </button>
        </div>
      )}

      {/* Observação */}
      <div style={box}>
        <div style={label}>Observação</div>
        <div style={{ fontSize: 14, color: 'oklch(0.4 0.02 265)', marginTop: 8, lineHeight: 1.6 }}>
          {t.obs || 'Atividade do cronograma de fechamento — sem observações adicionais.'}
        </div>
      </div>

      {/* Checklist */}
      {t.checklist && t.checklist.length > 0 && (
        <div style={box}>
          <div style={{ ...label, marginBottom: 10 }}>Checklist</div>
          {t.checklist.map((c, i) => (
            <div key={i} onClick={() => run(() => api.toggleChecklist(t.id, i))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', cursor: 'pointer' }}>
              <div style={{ width: 18, height: 18, borderRadius: 5, border: c.done ? `2px solid ${ACCENT}` : '2px solid oklch(0.8 0.01 260)',
                background: c.done ? ACCENT : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11 }}>{c.done ? '✓' : ''}</div>
              <span style={{ fontSize: 14, color: 'oklch(0.4 0.02 265)', textDecoration: c.done ? 'line-through' : 'none' }}>{c.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Evidências */}
      <div style={box}>
        <div style={{ ...label, marginBottom: 10 }}>Evidências</div>
        {(t.evidence || []).length === 0 && <div style={{ fontSize: 13, color: COLORS.mutedText, marginBottom: 10 }}>Nenhuma evidência anexada.</div>}
        {(t.evidence || []).map((ev, i) => {
          const isLink = /^https?:\/\//.test(ev.name);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13.5 }}>
              <Paperclip size={14} color={COLORS.mutedText} />
              {isLink ? <a href={ev.name} target="_blank" rel="noreferrer">{ev.name}</a> : <span style={{ color: 'oklch(0.35 0.02 265)' }}>{ev.name}</span>}
              <span style={{ color: COLORS.mutedText, fontSize: 12 }}>· {memberOf(ev.by).name} · {ev.when}</span>
            </div>
          );
        })}
        {canAddEvidence && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <input placeholder="Nome do arquivo ou link" style={{ flex: 1, padding: '10px 12px', borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, fontSize: 14 }}
              value={evidenceDraft} onChange={(e) => setEvidenceDraft(e.target.value)} />
            <button style={ghostBtn} onClick={() => run(async () => { await api.addEvidence(t.id, evidenceDraft); setEvidenceDraft(''); })}>Anexar</button>
          </div>
        )}
      </div>

      {/* Comentários */}
      <div style={box}>
        <div style={{ ...label, marginBottom: 12 }}>Comentários</div>
        {(t.comments || []).map((c, i) => {
          const cm = memberOf(c.by);
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <Avatar member={cm} size={30} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(0.3 0.02 265)' }}>{cm.name} <span style={{ fontWeight: 400, color: COLORS.mutedText, fontSize: 12 }}>· {c.when}</span></div>
                <div style={{ fontSize: 13.5, color: 'oklch(0.4 0.02 265)', marginTop: 2 }}>{c.text}</div>
              </div>
            </div>
          );
        })}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <input placeholder="Escreva um comentário…" style={{ flex: 1, padding: '10px 12px', borderRadius: 11, border: `1px solid ${COLORS.inputBorder}`, fontSize: 14 }}
            value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && commentDraft.trim()) run(async () => { await api.addComment(t.id, commentDraft); setCommentDraft(''); }); }} />
          <button style={primaryBtn} onClick={() => commentDraft.trim() && run(async () => { await api.addComment(t.id, commentDraft); setCommentDraft(''); })}>Enviar</button>
        </div>
      </div>

      {/* Trilha de auditoria */}
      <div style={box}>
        <div style={{ ...label, marginBottom: 12 }}>Trilha de auditoria</div>
        {[...(t.log || [])].reverse().map((l, i) => {
          const lm = memberOf(l.by);
          return (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 0' }}>
              <Avatar member={lm} size={26} font={10} />
              <div style={{ fontSize: 13, color: 'oklch(0.4 0.02 265)' }}><b>{lm.name}</b> {l.text}</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: 12, color: COLORS.mutedText }}>{l.when}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Banner({ color, children }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 12, background: softOf(color), color, fontSize: 13.5, fontWeight: 600 }}>{children}</div>
  );
}

const btnToggle = (on) => ({ flex: 1, padding: 12, borderRadius: 11, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  border: `1px solid ${on ? ACCENT : 'oklch(0.9 0.01 260)'}`, background: on ? softOf(ACCENT) : '#fff', color: on ? ACCENT : 'oklch(0.45 0.02 265)' });
