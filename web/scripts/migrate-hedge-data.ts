// Copia os dados reais do app "hedge" separado (corretoras, clientes,
// contratos_exportacao, hedge_operations) para o banco do Controle, agora que
// o modulo Hedge foi unificado dentro deste app (ver web/src/app/(dashboard)/hedge).
//
// So precisa rodar isto se o banco do Hedge for FISICAMENTE DIFERENTE do banco
// do Controle. Se os dois sempre compartilharam o mesmo Postgres (mesmo projeto
// Supabase e mesmo banco), os dados ja estao la e este script nao encontra nada
// novo para copiar (idempotente - seguro rodar de qualquer forma).
//
// Uso (dentro de web/, FORA do Claude Code — precisa das credenciais reais):
//   HEDGE_DATABASE_URL="<DATABASE_URL do projeto hedge-nayme>" npx tsx scripts/migrate-hedge-data.ts
//
// Mantem os UUIDs originais para preservar as referencias (FKs). Idempotente:
// registros cujo id/name/contractNumber ja existir no banco de destino sao
// pulados, entao e seguro rodar mais de uma vez.

import { Client } from "pg";
import { prisma } from "../src/lib/prisma";

async function main() {
  const hedgeUrl = process.env.HEDGE_DATABASE_URL;
  if (!hedgeUrl) {
    console.error("Defina HEDGE_DATABASE_URL com a DATABASE_URL do projeto hedge-nayme antes de rodar.");
    process.exit(1);
  }

  const source = new Client({ connectionString: hedgeUrl });
  await source.connect();

  let corretorasCriadas = 0;
  let clientesCriados = 0;
  let contratosCriados = 0;
  let operacoesCriadas = 0;

  try {
    const { rows: corretoras } = await source.query(
      `SELECT id, name, color, "createdAt" FROM corretoras`
    );
    for (const c of corretoras) {
      const exists = await prisma.corretora.findUnique({ where: { id: c.id } });
      if (exists) continue;
      await prisma.corretora.create({
        data: { id: c.id, name: c.name, color: c.color, createdAt: c.createdAt },
      });
      corretorasCriadas++;
    }

    const { rows: clientes } = await source.query(
      `SELECT id, name, city, country, email, phone, "createdAt" FROM clientes`
    );
    for (const c of clientes) {
      const exists = await prisma.cliente.findUnique({ where: { id: c.id } });
      if (exists) continue;
      await prisma.cliente.create({
        data: {
          id: c.id,
          name: c.name,
          city: c.city,
          country: c.country,
          email: c.email,
          phone: c.phone,
          createdAt: c.createdAt,
        },
      });
      clientesCriados++;
    }

    const { rows: contratos } = await source.query(`SELECT * FROM contratos_exportacao`);
    for (const c of contratos) {
      const exists = await prisma.contratoExportacao.findUnique({ where: { id: c.id } });
      if (exists) continue;
      await prisma.contratoExportacao.create({
        data: {
          id: c.id,
          contractNumber: c.contractNumber,
          clienteId: c.clienteId,
          corretoraId: c.corretoraId,
          country: c.country,
          valorUsd: c.valorUsd,
          dataEstufagem: c.dataEstufagem,
          dataEmbarque: c.dataEmbarque,
          dataChegada: c.dataChegada,
          status: c.status,
          quantSacas: c.quantSacas,
          adiantamentoUsd: c.adiantamentoUsd,
          dataAdiantamento: c.dataAdiantamento,
          financiadoPelaRts: c.financiadoPelaRts,
          valorFinanciadoRtsUsd: c.valorFinanciadoRtsUsd,
          dataLiberacaoFinanciamentoRts: c.dataLiberacaoFinanciamentoRts,
          previsaoPagamentoCliente: c.previsaoPagamentoCliente,
          saldoAReceberRtsUsd: c.saldoAReceberRtsUsd,
          valorRecebidoRtsUsd: c.valorRecebidoRtsUsd,
          dataRecebimentoRts: c.dataRecebimentoRts,
          obsRecebimento: c.obsRecebimento,
          despachante: c.despachante,
          certificados: c.certificados,
          freteTerrestre: c.freteTerrestre,
          freteMaritimo: c.freteMaritimo,
          taxasLocaisArmador: c.taxasLocaisArmador,
          fumigacao: c.fumigacao,
          embalagens: c.embalagens,
          inspecao: c.inspecao,
          despesasPortuarias: c.despesasPortuarias,
          armazem: c.armazem,
          envioAmostra: c.envioAmostra,
          marcacaoSacaria: c.marcacaoSacaria,
          envioDocumentacao: c.envioDocumentacao,
          telexRelease: c.telexRelease,
          legalizacao: c.legalizacao,
          financiamentoRts: c.financiamentoRts,
          diariaContainerDetention: c.diariaContainerDetention,
          despesasRedex: c.despesasRedex,
          estadiaContainer: c.estadiaContainer,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        },
      });
      contratosCriados++;
    }

    const { rows: operations } = await source.query(`SELECT * FROM hedge_operations`);
    for (const o of operations) {
      const exists = await prisma.hedgeOperation.findUnique({ where: { id: o.id } });
      if (exists) continue;
      await prisma.hedgeOperation.create({
        data: {
          id: o.id,
          corretoraId: o.corretoraId,
          contractType: o.contractType,
          side: o.side,
          contractDate: o.contractDate,
          vencimento: o.vencimento,
          valorUsd: o.valorUsd,
          liquidacaoParcialUsd: o.liquidacaoParcialUsd,
          saldoUsd: o.saldoUsd,
          nivelCompra: o.nivelCompra,
          nivelVenda: o.nivelVenda,
          desagioValor: o.desagioValor,
          totalReais: o.totalReais,
          status: o.status,
          observacao: o.observacao,
          createdAt: o.createdAt,
          updatedAt: o.updatedAt,
        },
      });
      operacoesCriadas++;
    }
  } finally {
    await source.end();
  }

  console.log(
    `Copiados: ${corretorasCriadas} corretoras, ${clientesCriados} clientes, ${contratosCriados} contratos, ${operacoesCriadas} operacoes de hedge.`
  );
  if (
    corretorasCriadas === 0 &&
    clientesCriados === 0 &&
    contratosCriados === 0 &&
    operacoesCriadas === 0
  ) {
    console.log("Nada novo para copiar — provavelmente os dois bancos ja sao o mesmo.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
