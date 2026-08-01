# CFO - Analise de Balanco/Balancete

Sistema para lancar os dados de um balanco/balancete por periodo e gerar
automaticamente os principais indicadores financeiros e um dashboard executivo
de uma pagina:

- EBITDA, Lucro Liquido, Margem EBITDA (%), comparacao com o mesmo periodo do ano anterior
- Prazo Medio de Recebimento (PMR), Estoque (PME), Pagamento (PMP) e Ciclo Financeiro
- Dashboard Executivo: Receita, EBITDA, Lucro Liquido, Caixa Disponivel, Divida Liquida,
  Capital de Giro, Fluxo de Caixa Projetado (estimativa), Exposicao Cambial (estimada) e
  Principais Riscos

Os valores de cada periodo sao digitados manualmente em "Novo Balancete" (sem custo,
sem depender de servico externo). Ha tambem um recurso opcional de extracao automatica
do PDF via IA (Anthropic) e de geracao de analise de riscos - so entram em uso se
`ANTHROPIC_API_KEY` estiver configurada em `.env.local`; sem a chave, o sistema funciona
normalmente no modo manual.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + Prisma (SQLite local, via libsql) +
Recharts + Anthropic SDK (opcional - extracao de PDF e analise de riscos).

## Como rodar

```bash
cd cfo
npm install
cp .env.local.example .env.local
# preencha ANTHROPIC_API_KEY apenas se for usar os recursos de IA (opcional)
npx prisma migrate dev
npm run dev
```

Acesse http://localhost:3000

O banco fica em `dev.db`, na raiz do projeto (arquivo local, ignorado pelo git).
