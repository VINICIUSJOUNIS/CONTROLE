"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import {
  ContratoRow,
  ContratoAnexoData,
  ConfirmacaoNegocioData,
  EnvioAmostraData,
} from "@/lib/hedge-data";
import { StatusContratoValue } from "@/app/(dashboard)/hedge/contratos/actions";
import { setContratoFinalizado } from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import {
  despesaLabels,
  despesaKeys,
  statusLabels,
  EtapaStatusValue,
} from "@/lib/contrato-shared";
import {
  ConfirmacaoNegocioResumo,
  Checklist,
} from "@/components/hedge/contratos/etapa-contratos-list";
import { AnexosSection } from "@/components/hedge/contratos/anexos-section";
import { MapPin, RotateCcw, ChevronDown, Calendar } from "lucide-react";

function DadosGerais({ item }: { item: ContratoRow }) {
  const linhas: [string, string][] = [
    ["Corretora", item.corretoraName ?? "-"],
    ["País", item.country],
    ["Início do contrato", item.dataInicioContrato ? formatDate(item.dataInicioContrato) : "-"],
    ["Estufagem", item.dataEstufagem ? formatDate(item.dataEstufagem) : "-"],
    ["Embarque", item.dataEmbarque ? formatDate(item.dataEmbarque) : "-"],
    ["Chegada do navio", item.dataChegada ? formatDate(item.dataChegada) : "-"],
    ["Contrato finalizado em", item.dataFinalizacao ? formatDate(item.dataFinalizacao) : "-"],
  ];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dados gerais</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function RecebimentoResumo({ item }: { item: ContratoRow }) {
  const linhas: [string, string][] = [];
  if (item.quantSacas != null) linhas.push(["Quantidade de sacas", `${item.quantSacas} sacas`]);
  if (item.adiantamentoUsd > 0) linhas.push(["Adiantamento", formatCurrency(item.adiantamentoUsd, "USD")]);
  if (item.dataAdiantamento) linhas.push(["Data do adiantamento", formatDate(item.dataAdiantamento)]);
  linhas.push(["Financiado pela RTS", item.financiadoPelaRts ? "Sim" : "Não"]);
  if (item.valorFinanciadoRtsUsd > 0)
    linhas.push(["Valor financiado pela RTS", formatCurrency(item.valorFinanciadoRtsUsd, "USD")]);
  if (item.dataLiberacaoFinanciamentoRts)
    linhas.push(["Liberação do financiamento", formatDate(item.dataLiberacaoFinanciamentoRts)]);
  if (item.previsaoPagamentoCliente)
    linhas.push(["Previsão de pagamento", formatDate(item.previsaoPagamentoCliente)]);
  if (item.saldoAReceberRtsUsd > 0)
    linhas.push(["Saldo a receber", formatCurrency(item.saldoAReceberRtsUsd, "USD")]);
  if (item.valorRecebidoRtsUsd > 0)
    linhas.push(["Valor recebido", formatCurrency(item.valorRecebidoRtsUsd, "USD")]);
  if (item.dataRecebimentoRts) linhas.push(["Data do recebimento", formatDate(item.dataRecebimentoRts)]);

  if (linhas.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recebimento</p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      {item.obsRecebimento && (
        <p className="mt-1 text-xs text-muted">Obs: {item.obsRecebimento}</p>
      )}
    </div>
  );
}

function DespesasResumo({ item }: { item: ContratoRow }) {
  const linhas = despesaKeys
    .filter((k) => item.despesas[k] > 0)
    .map((k): [string, string] => [despesaLabels[k], formatCurrency(item.despesas[k])]);

  if (linhas.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Despesas</p>
        <p className="text-xs font-semibold">{formatCurrency(item.custoTotalDespesas)}</p>
      </div>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EnvioAmostraResumo({ dados }: { dados: EnvioAmostraData }) {
  const linhas: [string, string][] = [];
  if (dados.tipoAmostraNome) linhas.push(["Tipo de amostra", dados.tipoAmostraNome]);
  if (dados.transportadoraNome) linhas.push(["Envio por", dados.transportadoraNome]);
  if (dados.cteNumero) linhas.push(["CT-e de envio", dados.cteNumero]);
  if (dados.cteValor != null) linhas.push(["Valor do CT-e", formatCurrency(dados.cteValor)]);
  if (dados.notaFiscalNumero) linhas.push(["Nota fiscal de envio", dados.notaFiscalNumero]);
  if (dados.notaFiscalValor != null)
    linhas.push(["Valor da nota fiscal", formatCurrency(dados.notaFiscalValor)]);

  if (linhas.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {statusLabels.ENVIO_AMOSTRA_PSS}
      </p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
        {linhas.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ContratosFinalizadosList({
  contratos,
  confirmacoes,
  anexos,
  checklist,
  enviosAmostra,
}: {
  contratos: ContratoRow[];
  confirmacoes: Record<string, ConfirmacaoNegocioData>;
  anexos: Record<string, ContratoAnexoData[]>;
  checklist: Record<string, Partial<Record<StatusContratoValue, EtapaStatusValue>>>;
  enviosAmostra: Record<string, EnvioAmostraData>;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contratos;
    return contratos.filter(
      (c) =>
        c.contractNumber.toLowerCase().includes(term) || c.clienteName.toLowerCase().includes(term)
    );
  }, [contratos, search]);

  function reabrir(id: string, contractNumber: string) {
    if (
      !window.confirm(
        `Deseja realmente reabrir o contrato ${contractNumber}? Ele vai voltar a aparecer na Mesa de Operação.`
      )
    )
      return;
    startTransition(async () => {
      await setContratoFinalizado(id, false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por contrato ou cliente"
        className="w-64"
      />

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted">Nenhum contrato finalizado.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isExpanded = expandedId === item.id;
            const confirmacao = confirmacoes[item.id];
            const envioAmostra = enviosAmostra[item.id];

            return (
              <Card key={item.id} className="overflow-hidden p-0">
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 p-3">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="flex min-w-0 flex-1 items-center gap-x-4 gap-y-1 text-left"
                  >
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{item.contractNumber}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        {item.clienteName}
                        <MapPin size={11} className="ml-1" />
                        {item.country}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-primary">
                      {formatCompactCurrency(item.valorUsd, "USD")}
                    </p>
                    <p className="flex shrink-0 items-center gap-1 text-xs text-muted">
                      <Calendar size={12} />
                      Finalizado em: {item.dataFinalizacao ? formatDate(item.dataFinalizacao) : "-"}
                    </p>
                  </button>

                  <button
                    onClick={() => reabrir(item.id, item.contractNumber)}
                    disabled={isPending}
                    className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:bg-border/40 hover:text-foreground disabled:opacity-50"
                  >
                    <RotateCcw size={13} />
                    Reabrir
                  </button>
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border p-3">
                    <DadosGerais item={item} />
                    {confirmacao && <ConfirmacaoNegocioResumo dados={confirmacao} />}
                    {envioAmostra && <EnvioAmostraResumo dados={envioAmostra} />}
                    <RecebimentoResumo item={item} />
                    <DespesasResumo item={item} />

                    <AnexosSection
                      contratoId={item.id}
                      status={item.status as StatusContratoValue}
                      anexos={anexos[item.id] ?? []}
                    />

                    <Checklist statusPorEtapa={checklist[item.id] ?? {}} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
