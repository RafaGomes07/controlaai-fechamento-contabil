// Predicados de autorização — espelham exatamente as regras de papel do
// protótipo. O front esconde; o backend NEGA. `ctx` = { user, sectors }.

export function scopeFilter(ctx) {
  // Retorna uma função (taskRow) => bool para filtrar leitura por escopo.
  const { user, sectors } = ctx;
  if (user.role === 'dev') return () => true;
  if (user.role === 'gestor') return (t) => sectors.includes(t.cat);
  return (t) => t.assignee === user.id; // usuário: só as próprias
}

export function canSeeTask(ctx, t) {
  return scopeFilter(ctx)(t);
}

// Pode criar/editar tarefa do setor `cat`?
export function canManage(ctx, cat) {
  if (ctx.user.role === 'dev') return true;
  if (ctx.user.role === 'gestor') return ctx.sectors.includes(cat);
  return false;
}

// Pode aprovar/reprovar/decidir reabertura desta tarefa?
// Dev não tem bypass por papel aqui — só quem tem vínculo direto com a
// tarefa decide: o aprovador explícito, ou o gestor do setor (desde que não
// seja o próprio assignee).
export function canApprove(ctx, t) {
  const { user, sectors } = ctx;
  if (t.approver === user.id) return true;
  if (user.role === 'gestor') return sectors.includes(t.cat) && t.assignee !== user.id;
  return false;
}

export function isOwnTask(ctx, t) {
  return t.assignee === ctx.user.id;
}
