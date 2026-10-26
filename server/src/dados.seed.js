// Dados FICTÍCIOS para demonstração: pessoas, empresas e tarefas inventadas.
// O ciclo semeado é sempre o do mês anterior à data de hoje, e o andamento das
// tarefas é simulado em relação a hoje (concluídas, em andamento, atrasadas),
// para o painel abrir com um fechamento "vivo".
import { today, isoOf, diaToDue, lastBizOfCompetence } from './rules.js';

const hoje = today();
const competencia = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
const cycle = `${String(competencia.getMonth() + 1).padStart(2, '0')}/${competencia.getFullYear()}`;
const cycleStart = lastBizOfCompetence(cycle); // Dia -1
const cycleTarget = diaToDue(cycleStart, 5);   // meta: D+5

const cats = {
  financeiro: { label: 'Financeiro', color: 'oklch(0.55 0.15 265)' },
  departamento: { label: 'Departamento Pessoal', color: 'oklch(0.6 0.15 30)' },
  controladori: { label: 'Controladoria', color: 'oklch(0.55 0.16 300)' },
  custoorcamen: { label: 'Custo & Orçamento', color: 'oklch(0.6 0.12 85)' },
  fiscal: { label: 'Fiscal', color: 'oklch(0.55 0.11 200)' },
  contabilidad: { label: 'Contabilidade', color: 'oklch(0.55 0.14 160)' },
  juridico: { label: 'Jurídico', color: 'oklch(0.5 0.08 40)' },
};

const pessoas = [
  ['u0', 'Admin Demo', 'Controladoria', 'admin'],
  ['u1', 'Marina Castro', 'Controladoria', 'marina.castro'],
  ['u2', 'Paulo Mendes', 'Contabilidade', 'paulo.mendes'],
  ['u3', 'Renata Lopes', 'Fiscal', 'renata.lopes'],
  ['u4', 'Tiago Moura', 'Financeiro', 'tiago.moura'],
  ['u5', 'Carla Nunes', 'Custo & Orçamento', 'carla.nunes'],
  ['u6', 'Bruno Alves', 'Contabilidade', 'bruno.alves'],
  ['u7', 'Júlia Freitas', 'Contabilidade', 'julia.freitas'],
  ['u8', 'Diego Rocha', 'Fiscal', 'diego.rocha'],
  ['u9', 'Larissa Prado', 'Departamento Pessoal', 'larissa.prado'],
  ['u10', 'Felipe Duarte', 'Financeiro', 'felipe.duarte'],
  ['u11', 'Sofia Martins', 'Custo & Orçamento', 'sofia.martins'],
  ['u12', 'André Queiroz', 'Jurídico', 'andre.queiroz'],
];
const cores = [265, 150, 25, 300, 200, 85, 340, 120, 55, 230, 10, 180, 280];
const members = pessoas.map(([id, name, setor, user], i) => ({
  id, name, full: name, resp: name.split(' ')[0], setor,
  email: `${user}@exemplo.com.br`,
  initials: name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
  color: `oklch(0.56 0.15 ${cores[i]})`,
}));

// [setor, responsável, título, dia, empresa, prioridade, periodicidade]
const lista = [
  ['contabilidad', 'u2', 'Fechamento do balancete de verificação', 'Dia 4', 'Todas', 'alta'],
  ['contabilidad', 'u6', 'Conciliação das contas bancárias', 'Dia 2', 'Empresa Alfa', 'alta'],
  ['contabilidad', 'u6', 'Conciliação das contas bancárias', 'Dia 2', 'Empresa Beta', 'alta'],
  ['contabilidad', 'u7', 'Conciliação de fornecedores', 'Dia 3', 'Empresa Alfa', 'media'],
  ['contabilidad', 'u7', 'Conciliação de clientes', 'Dia 3', 'Empresa Alfa', 'media'],
  ['contabilidad', 'u7', 'Conciliação de fornecedores', 'Dia 3', 'Empresa Beta', 'media'],
  ['contabilidad', 'u6', 'Conciliação de adiantamentos', 'Dia 3', 'Todas', 'media'],
  ['contabilidad', 'u2', 'Provisão de férias e 13º salário', 'Dia 2', 'Todas', 'media'],
  ['contabilidad', 'u2', 'Contabilização da depreciação do imobilizado', 'Dia 1', 'Empresa Alfa', 'media'],
  ['contabilidad', 'u6', 'Apropriação de despesas antecipadas', 'Dia 1', 'Todas', 'baixa'],
  ['contabilidad', 'u7', 'Conciliação de mútuo entre empresas do grupo', 'Dia 4', 'Alfa e Beta', 'alta'],
  ['contabilidad', 'u2', 'Revisão de lançamentos manuais', 'Dia 4', 'Todas', 'media'],
  ['contabilidad', 'u6', 'Conciliação de impostos a recuperar', 'Dia 3', 'Empresa Alfa', 'media'],
  ['contabilidad', 'u2', 'Encerramento do período no ERP', 'Dia 5', 'Todas', 'alta'],
  ['contabilidad', 'u7', 'Análise de variação das contas de resultado', 'Dia 5', 'Todas', 'media'],
  ['fiscal', 'u3', 'Encerramento do recebimento fiscal', 'Dia -1', 'Empresa Alfa', 'alta'],
  ['fiscal', 'u8', 'Encerramento do recebimento fiscal', 'Dia -1', 'Empresa Beta', 'alta'],
  ['fiscal', 'u3', 'Apuração de ICMS', 'Dia 2', 'Empresa Alfa', 'alta'],
  ['fiscal', 'u8', 'Apuração de PIS e COFINS', 'Dia 3', 'Todas', 'alta'],
  ['fiscal', 'u8', 'Apuração de IPI', 'Dia 2', 'Empresa Alfa', 'media'],
  ['fiscal', 'u3', 'Escrituração da EFD-Reinf', 'Dia 1', 'Todas', 'media'],
  ['fiscal', 'u8', 'Conferência das notas de devolução e cancelamento', 'Dia 1', 'Empresa Beta', 'media'],
  ['fiscal', 'u3', 'Bloco K: conferência de produção e consumo', 'Dia 4', 'Empresa Alfa', 'media'],
  ['financeiro', 'u4', 'Baixa de pagamentos do mês', 'Dia -1', 'Todas', 'alta'],
  ['financeiro', 'u10', 'Baixa de recebimentos do mês', 'Dia -1', 'Todas', 'alta'],
  ['financeiro', 'u4', 'Posição de empréstimos e financiamentos', 'Dia 1', 'Empresa Alfa', 'media'],
  ['financeiro', 'u10', 'Conciliação de aplicações financeiras', 'Dia 1', 'Todas', 'media'],
  ['financeiro', 'u4', 'Variação cambial de contratos em moeda estrangeira', 'Dia 2', 'Empresa Beta', 'media'],
  ['financeiro', 'u10', 'Conciliação do risco sacado', 'Dia 2', 'Empresa Alfa', 'baixa'],
  ['departamento', 'u9', 'Fechamento da folha de pagamento', 'Dia -1', 'Todas', 'alta'],
  ['departamento', 'u9', 'Encargos sociais (INSS e FGTS)', 'Dia 1', 'Todas', 'alta'],
  ['departamento', 'u9', 'Provisão de PLR', 'Dia 2', 'Todas', 'media'],
  ['custoorcamen', 'u5', 'Valorização do estoque', 'Dia 2', 'Empresa Alfa', 'alta'],
  ['custoorcamen', 'u11', 'Valorização do estoque', 'Dia 2', 'Empresa Beta', 'alta'],
  ['custoorcamen', 'u5', 'Encerramento das ordens de produção', 'Dia 1', 'Empresa Alfa', 'alta'],
  ['custoorcamen', 'u11', 'Rateio de custos indiretos', 'Dia 3', 'Empresa Alfa', 'media'],
  ['custoorcamen', 'u5', 'Análise de CPV e margem por produto', 'Dia 4', 'Todas', 'media'],
  ['custoorcamen', 'u11', 'Orçado x realizado de despesas', 'Dia 5', 'Todas', 'media'],
  ['custoorcamen', 'u11', 'Inventário rotativo: análise de divergências', 'Dia 3', 'Empresa Beta', 'baixa'],
  ['controladori', 'u1', 'Revisão da DRE gerencial', 'Dia 5', 'Todas', 'alta'],
  ['controladori', 'u0', 'Atualização do painel executivo', 'Dia 5', 'Todas', 'media'],
  ['controladori', 'u1', 'Relatório de fechamento para a diretoria', 'Dia 5', 'Todas', 'alta'],
  ['controladori', 'u0', 'Conferência de saldos entre ERP e BI', 'Dia 4', 'Todas', 'media'],
  ['controladori', 'u1', 'Análise do EBITDA do mês', 'Dia 5', 'Holding Exemplo', 'media'],
  ['juridico', 'u12', 'Relatório de contingências para provisão', 'Dia 2', 'Todas', 'media', 'Trimestral'],
  ['contabilidad', 'u2', 'Teste de recuperabilidade (impairment)', 'Dia 5', 'Holding Exemplo', 'baixa', 'Anual'],
];

// Aprovador: o gestor do setor (segregação de funções: quem faz não aprova).
const gestorDo = { contabilidad: 'u2', fiscal: 'u3', financeiro: 'u4', custoorcamen: 'u5',
  controladori: 'u1', departamento: 'u1', juridico: 'u1' };

// Andamento simulado em relação a hoje, determinístico pelo id da tarefa.
function andamento(id, due) {
  const sorteio = (id * 37) % 100;
  if (due < isoOf(hoje)) {
    if (sorteio < 82) return { status: 'done', progress: 100, entrega: due };
    if (sorteio < 90) return { status: 'review', progress: 90 };
    return { status: 'doing', progress: 40 };
  }
  if (due === isoOf(hoje)) return sorteio < 50 ? { status: 'doing', progress: 60 } : { status: 'review', progress: 90 };
  return sorteio < 25 ? { status: 'doing', progress: 30 } : { status: 'todo', progress: 0 };
}

const tasks = lista.map(([cat, assignee, title, dia, empresa, priority, periodic], i) => {
  const id = i + 1;
  const n = parseInt(dia.replace('Dia ', ''), 10);
  const due = diaToDue(cycleStart, n);
  const approver = gestorDo[cat] === assignee ? 'u1' : gestorDo[cat];
  return { id, empresa, title, assignee, approver, cat, periodic: periodic || 'Mensal', dia, due,
    priority, milestone: title.startsWith('Encerramento do período') || title.startsWith('Relatório de fechamento'),
    obs: '', comments: [], ...andamento(id, due) };
});
// dependência: o encerramento no ERP só começa depois do balancete
tasks.find((t) => t.title.startsWith('Encerramento do período')).dependsOn = 1;

export const DATA = { today: isoOf(hoje), cycle, cycleStart, cycleTarget, members, cats, tasks, history: [] };
