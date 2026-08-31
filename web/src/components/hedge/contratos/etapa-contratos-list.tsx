"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCompactCurrency, formatCurrency, formatDate } from "@/lib/format";
import { ContratoRow, ContratoAnexoData, HistoricoAnteriorItem, EnvioAmostraData } from "@/lib/hedge-data";
import {
  updateContratoStatus,
  StatusContratoValue,
} from "@/app/(dashboard)/hedge/contratos/actions";
import {
  setPrevisaoEtapa,
  setEtapaConcluida,
  upsertEnvioAmostra,
  EnvioAmostraInput,
} from "@/app/(dashboard)/hedge/mesa-operacao/actions";
import { statusOrder, statusLabels, relevantDateField, dateFieldLabels } from "@/lib/contrato-shared";
import { alertaPrazo } from "@/lib/prazo";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { NovoTipoAmostra } from "@/components/hedge/contratos/novo-tipo-amostra";
import { NovaTransportadoraAmostra } from "@/components/hedge/contratos/nova-transportadora-amostra";
import { AnexosSection, uploadAnexo } from "@/components/hedge/contratos/anexos-section";
import {
  MapPin,
  Calendar,
  ChevronDown,
  Paperclip,
  Upload,
  AlertTriangle,
} from "lucide-react";


export function PrevisaoEtapa({
  contratoId,
  status,
  previsao,
}: {
  contratoId: string;
  status: StatusContratoValue;
  previsao: string | undefined;
}) {
  const router = useRouter();
  const [value, setValue] = useState(previsao ?? "");
  const [isPending, startTransition] = useTransition();
  const alerta = value ? alertaPrazo(value) : null;

  // So salva quando o campo perde o foco (nao a cada tecla) e so se a data
  // estiver completa e valida - digitar um ano parcial (ex: "2" -> "0002")
  // nao dispara mais um save intermediario com data invalida.
  function handleBlur() {
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1900)) {
      setValue(previsao ?? "");
      return;
    }
    if (value === (previsao ?? "")) return;
    startTransition(async () => {
      await setPrevisaoEtapa(contratoId, status, value);
      router.refresh();
    });
  }

  return (
    <div className="mt-3 border-t border-border pt-2">
      <label className="flex items-center justify-between gap-2 text-xs text-muted">
        Prazo previsto — {statusLabels[status]}
        <input
          type="date"
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          className="rounded border border-border bg-background px-1.5 py-0.5 text-xs"
        />
      </label>
      {alerta && (
        <p
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            alerta.tone === "danger" ? "text-danger" : "text-warning"
          }`}
        >
          <AlertTriangle size={12} />
          {alerta.label}
        </p>
      )}
    </div>
  );
}

function envioAmostraFormFromData(dados: EnvioAmostraData | undefined): EnvioAmostraInput {
  return {
    tipoAmostraId: dados?.tipoAmostraId ?? "",
    transportadoraId: dados?.transportadoraId ?? "",
    cteNumero: dados?.cteNumero ?? "",
    cteValor: dados?.cteValor != null ? String(dados.cteValor) : "",
    notaFiscalNumero: dados?.notaFiscalNumero ?? "",
    notaFiscalValor: dados?.notaFiscalValor != null ? String(dados.notaFiscalValor) : "",
  };
}

function EnvioAmostraSection({
  contratoId,
  dados,
  tiposAmostra,
  transportadorasAmostra,
}: {
  contratoId: string;
  dados: EnvioAmostraData | undefined;
  tiposAmostra: { id: string; name: string }[];
  transportadorasAmostra: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<EnvioAmostraInput>(() => envioAmostraFormFromData(dados));

  function save(next: EnvioAmostraInput) {
    startTransition(async () => {
      await upsertEnvioAmostra(contratoId, next);
      router.refresh();
    });
  }

  function handleSelectChange(patch: Partial<EnvioAmostraInput>) {
    const next = { ...form, ...patch };
    setForm(next);
    save(next);
  }

  function handleTextBlur() {
    save(form);
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-2">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Tipo de Amostra</p>
          <div className="flex gap-2">
            <Select
              value={form.tipoAmostraId}
              disabled={isPending}
              onChange={(e) => handleSelectChange({ tipoAmostraId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {tiposAmostra.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <NovoTipoAmostra compact />
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Envio por</p>
          <div className="flex gap-2">
            <Select
              value={form.transportadoraId}
              disabled={isPending}
              onChange={(e) => handleSelectChange({ transportadoraId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {transportadorasAmostra.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <NovaTransportadoraAmostra compact />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted">CT-e de Envio</p>
          <input
            value={form.cteNumero}
            disabled={isPending}
            onChange={(e) => setForm({ ...form, cteNumero: e.target.value })}
            onBlur={handleTextBlur}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Valor do CT-e (R$)</p>
          <input
            type="number"
            step="0.01"
            value={form.cteValor}
            disabled={isPending}
            onChange={(e) => setForm({ ...form, cteValor: e.target.value })}
            onBlur={handleTextBlur}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Nota Fiscal de Envio</p>
          <input
            value={form.notaFiscalNumero}
            disabled={isPending}
            onChange={(e) => setForm({ ...form, notaFiscalNumero: e.target.value })}
            onBlur={handleTextBlur}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Valor da Nota Fiscal (R$)</p>
          <input
            type="number"
            step="0.01"
            value={form.notaFiscalValor}
            disabled={isPending}
            onChange={(e) => setForm({ ...form, notaFiscalValor: e.target.value })}
            onBlur={handleTextBlur}
            className="h-8 w-full rounded border border-border bg-background px-2 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}

function QuickUploadButton({ contratoId, status }: { contratoId: string; status: StatusContratoValue }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      await uploadAnexo(contratoId, status, file);
      router.refresh();
    } catch {
      // erro exibido na lista de anexos ao expandir a linha
    } finally {
      setUploading(false);
    }
  }

  return (
    <span onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        <Upload size={14} />
        {uploading ? "Enviando..." : "Anexar"}
      </button>
      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
    </span>
  );
}

function ConcluidoCheckbox({
  contratoId,
  status,
  concluida,
}: {
  contratoId: string;
  status: StatusContratoValue;
  concluida: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const label = status === "ASSINATURA_CONTRATO" ? "Assinado" : "Concluído";

  function handleChange(checked: boolean) {
    startTransition(async () => {
      await setEtapaConcluida(contratoId, status, checked);
      router.refresh();
    });
  }

  return (
    <label
      onClick={(e) => e.stopPropagation()}
      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted"
    >
      <input
        type="checkbox"
        checked={concluida}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border"
      />
      {label}
    </label>
  );
}

function VoltarMenu({ contratoId, currentStatus }: { contratoId: string; currentStatus: StatusContratoValue }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const idx = statusOrder.indexOf(currentStatus);
  const etapasAnteriores = statusOrder.slice(0, idx);

  function handleSelect(target: string) {
    if (!target) return;
    startTransition(async () => {
      await updateContratoStatus(contratoId, target as StatusContratoValue);
      router.refresh();
    });
  }

  // Select nativo em vez de menu proprio: o navegador renderiza a lista de
  // opcoes por cima de tudo, sem ficar cortada pelo overflow-hidden do card.
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <select
        value=""
        onChange={(e) => handleSelect(e.target.value)}
        disabled={isPending || etapasAnteriores.length === 0}
        className="w-28 shrink-0 truncate rounded-md border border-border bg-background px-2 py-1 text-xs text-muted hover:bg-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <option value="">Voltar</option>
        {etapasAnteriores.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

function AvancarMenu({ contratoId, currentStatus }: { contratoId: string; currentStatus: StatusContratoValue }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const idx = statusOrder.indexOf(currentStatus);
  const etapasPosteriores = statusOrder.slice(idx + 1);

  function handleSelect(target: string) {
    if (!target) return;
    startTransition(async () => {
      await updateContratoStatus(contratoId, target as StatusContratoValue);
      router.refresh();
    });
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <select
        value=""
        onChange={(e) => handleSelect(e.target.value)}
        disabled={isPending || etapasPosteriores.length === 0}
        className="w-28 shrink-0 truncate rounded-md border border-border bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-30"
      >
        <option value="">Avançar</option>
        {etapasPosteriores.map((s) => (
          <option key={s} value={s}>
            {statusLabels[s]}
          </option>
        ))}
      </select>
    </div>
  );
}

function ConfirmacaoNegocioResumo({ dados }: { dados: NonNullable<HistoricoAnteriorItem["confirmacaoNegocio"]> }) {
  const linhas: [string, string][] = [];
  if (dados.dataConfirmacao) linhas.push(["Confirmado em", formatDate(dados.dataConfirmacao)]);
  if (dados.numeroContrato) linhas.push(["Contrato", dados.numeroContrato]);
  if (dados.numeroContratoInterno) linhas.push(["Contrato interno", dados.numeroContratoInterno]);
  if (dados.corretoraName) linhas.push(["Broker", dados.corretoraName]);
  if (dados.valorUsd != null) linhas.push(["Valor", formatCurrency(dados.valorUsd, "USD")]);
  if (dados.diferencial != null)
    linhas.push([
      "Diferencial",
      `${dados.diferencial >= 0 ? "+" : ""}${dados.diferencial.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ]);
  if (dados.tipoFreteNome) linhas.push(["Frete", dados.tipoFreteNome]);
  if (dados.fixacaoTipo) linhas.push(["Fixação", dados.fixacaoTipo === "BUYER" ? "Buyer" : "Seller"]);
  if (dados.dataFixacao) linhas.push(["Data da fixação", formatDate(dados.dataFixacao)]);
  if (dados.nivelBolsa != null) linhas.push(["Nível de bolsa", String(dados.nivelBolsa)]);
  if (dados.valorDolar != null) linhas.push(["Valor do dólar", String(dados.valorDolar)]);
  if (dados.tipoEmbalagemNome) linhas.push(["Embalagem", dados.tipoEmbalagemNome]);
  if (dados.quantidadeSacas != null) linhas.push(["Quantidade", `${dados.quantidadeSacas} sacas`]);
  if (dados.descricaoCafeNome) linhas.push(["Café", dados.descricaoCafeNome]);
  if (dados.previsaoEmbarque) linhas.push(["Previsão embarque", formatDate(dados.previsaoEmbarque)]);
  if (dados.destinoCarga) linhas.push(["Destino", dados.destinoCarga]);
  if (dados.formaPagamentoNome) linhas.push(["Pagamento", dados.formaPagamentoNome]);

  if (linhas.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {statusLabels.CONFIRMACAO_NEGOCIO}
      </p>
      <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
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

function HistoricoAnterior({ item }: { item: HistoricoAnteriorItem | undefined }) {
  if (!item) return <p className="text-xs text-muted">Nenhuma etapa anterior preenchida ainda.</p>;

  const temAlgo = item.confirmacaoNegocio || item.porEtapa.some((e) => e.previsao);
  if (!temAlgo) return <p className="text-xs text-muted">Nenhuma etapa anterior preenchida ainda.</p>;

  return (
    <div className="space-y-3">
      {item.confirmacaoNegocio && <ConfirmacaoNegocioResumo dados={item.confirmacaoNegocio} />}
      {item.porEtapa
        .filter((e) => e.previsao)
        .map((e) => (
          <div key={e.etapa}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">{statusLabels[e.etapa]}</p>
            <p className="mt-1 text-xs">
              Previsão: <span className="text-foreground">{formatDate(e.previsao!)}</span>
            </p>
          </div>
        ))}
    </div>
  );
}

export function EtapaContratosList({
  contratos,
  status,
  anexos,
  previsoes,
  historico,
  concluidas,
  enviosAmostra,
  tiposAmostra,
  transportadorasAmostra,
}: {
  contratos: ContratoRow[];
  status: StatusContratoValue;
  anexos: Record<string, ContratoAnexoData[]>;
  previsoes: Record<string, string>;
  historico: Record<string, HistoricoAnteriorItem>;
  concluidas: Record<string, boolean>;
  enviosAmostra?: Record<string, EnvioAmostraData>;
  tiposAmostra?: { id: string; name: string }[];
  transportadorasAmostra?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoParam = searchParams.get("contrato");
  const [, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(contratoParam);
  const dateField = relevantDateField[status];

  useEffect(() => {
    if (contratoParam) {
      document.getElementById(`contrato-${contratoParam}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToStatus(id: string, target: StatusContratoValue) {
    startTransition(async () => {
      await updateContratoStatus(id, target);
      router.refresh();
    });
  }

  if (contratos.length === 0) {
    return <Card className="p-6 text-center text-sm text-muted">Nenhum contrato nesta etapa.</Card>;
  }

  return (
    <div className="space-y-2">
      {contratos.map((item) => {
        const dateValue = item[dateField];
        const isExpanded = expandedId === item.id;
        return (
          <Card key={item.id} id={`contrato-${item.id}`} className="overflow-hidden p-0">
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
                  {dateValue
                    ? `${dateFieldLabels[dateField]}: ${formatDate(dateValue)}`
                    : `${dateFieldLabels[dateField]}: sem data`}
                </p>
                {(anexos[item.id]?.length ?? 0) > 0 && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                    <Paperclip size={12} />
                    {anexos[item.id]!.length}
                  </span>
                )}
                {(() => {
                  const previsao = previsoes[item.id];
                  const alerta = previsao ? alertaPrazo(previsao) : null;
                  if (!alerta) return null;
                  return (
                    <span
                      className={`flex shrink-0 items-center gap-1 text-xs font-medium ${
                        alerta.tone === "danger" ? "text-danger" : "text-warning"
                      }`}
                    >
                      <AlertTriangle size={12} />
                      {alerta.label}
                    </span>
                  );
                })()}
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <QuickUploadButton contratoId={item.id} status={status} />
                <ConcluidoCheckbox contratoId={item.id} status={status} concluida={concluidas[item.id] ?? false} />
                <VoltarMenu contratoId={item.id} currentStatus={status} />
                <AvancarMenu contratoId={item.id} currentStatus={status} />
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  Etapas anteriores
                </p>
                <HistoricoAnterior item={historico[item.id]} />

                <AnexosSection contratoId={item.id} status={status} anexos={anexos[item.id] ?? []} />

                <PrevisaoEtapa contratoId={item.id} status={status} previsao={previsoes[item.id]} />

                {status === "ENVIO_AMOSTRA_PSS" && (
                  <EnvioAmostraSection
                    contratoId={item.id}
                    dados={enviosAmostra?.[item.id]}
                    tiposAmostra={tiposAmostra ?? []}
                    transportadorasAmostra={transportadorasAmostra ?? []}
                  />
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
