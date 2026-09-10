"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import {
  createContratoCompraCafe,
  updateContratoCompraCafe,
  deleteContratoCompraCafe,
} from "@/app/(dashboard)/hedge/contrato-compra/actions";
import { Printer, Save, FilePlus2, Trash2, FileText } from "lucide-react";

export type ContratoCompraCafeSalvo = {
  id: string;
  numeroContrato: string;
  dataContrato: string;
  tipoOperacao: string;
  modalidade: string;
  referenciaPagamento: string;
  codigoVendedor: string;
  nomeVendedor: string;
  cnpjVendedor: string;
  enderecoVendedor: string;
  inscricaoEstadualVendedor: string;
  grupoVendedor: string;
  corretor: string;
  comissaoCorretor: number;
  agente: string;
  comissaoAgente: number;
  descricaoProduto: string;
  safra: string;
  padrao: string;
  bebida: string;
  tipoEmbalagem: string;
  valorLivrePorSaca: number;
  quantidadeSacas: number;
  valorFaturadoPorSaca: number;
  creditoIcms: string;
  condicaoPagamento: string;
  banco: string;
  agencia: string;
  conta: string;
  observacoes: string;
  localRetirada: string;
  codigoLocalEntrega: string;
  previsaoEntrega: string;
  nomeLocalEntrega: string;
  cnpjLocalEntrega: string;
  enderecoLocalEntrega: string;
  cidadeLocalEntrega: string;
};

// Dados fixos do comprador — sempre a Nayme neste contrato de compra.
const COMPRADOR = {
  nome: "NAYME EXPORTADORA DE CAFÉ LTDA",
  endereco1: "AVENIDA BARÃO DO RIO BRANCO",
  endereco2: "Nro: 90 - Complemento: LETRA B - Bairro: BAIXADA",
  cidade: "MANHUAÇU - CEP: 36902-030",
  cnpj: "27.404.965/0001-04",
  telefone: "(33) 3331-6090",
};

function emptyForm() {
  return {
    numeroContrato: "",
    dataContrato: new Date().toISOString().slice(0, 10),
    tipoOperacao: "FÍSICO",
    modalidade: "POSTO",
    referenciaPagamento: "",
    codigoVendedor: "",
    nomeVendedor: "",
    cnpjVendedor: "",
    enderecoVendedor: "",
    inscricaoEstadualVendedor: "",
    grupoVendedor: "103 - CAFÉ - Pessoa jurídica",
    corretor: "",
    comissaoCorretor: "0,00",
    agente: "",
    comissaoAgente: "0,00",
    descricaoProduto: "",
    safra: "",
    padrao: "",
    bebida: "",
    tipoEmbalagem: "Granel 60kg",
    valorLivrePorSaca: "",
    quantidadeSacas: "",
    valorFaturadoPorSaca: "",
    creditoIcms: "",
    condicaoPagamento: "",
    banco: "",
    agencia: "",
    conta: "",
    observacoes: "",
    localRetirada: "-",
    codigoLocalEntrega: "",
    previsaoEntrega: "",
    nomeLocalEntrega: "",
    cnpjLocalEntrega: "",
    enderecoLocalEntrega: "",
    cidadeLocalEntrega: "",
  };
}

type FormState = ReturnType<typeof emptyForm>;

function toNumber(valor: string) {
  const n = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatBR(n: number, casas = 2) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function formatDataBR(dataStr: string) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function salvoParaForm(c: ContratoCompraCafeSalvo): FormState {
  return {
    numeroContrato: c.numeroContrato,
    dataContrato: c.dataContrato,
    tipoOperacao: c.tipoOperacao,
    modalidade: c.modalidade,
    referenciaPagamento: c.referenciaPagamento,
    codigoVendedor: c.codigoVendedor,
    nomeVendedor: c.nomeVendedor,
    cnpjVendedor: c.cnpjVendedor,
    enderecoVendedor: c.enderecoVendedor,
    inscricaoEstadualVendedor: c.inscricaoEstadualVendedor,
    grupoVendedor: c.grupoVendedor,
    corretor: c.corretor,
    comissaoCorretor: formatBR(c.comissaoCorretor),
    agente: c.agente,
    comissaoAgente: formatBR(c.comissaoAgente),
    descricaoProduto: c.descricaoProduto,
    safra: c.safra,
    padrao: c.padrao,
    bebida: c.bebida,
    tipoEmbalagem: c.tipoEmbalagem,
    valorLivrePorSaca: formatBR(c.valorLivrePorSaca),
    quantidadeSacas: String(c.quantidadeSacas),
    valorFaturadoPorSaca: formatBR(c.valorFaturadoPorSaca),
    creditoIcms: c.creditoIcms,
    condicaoPagamento: c.condicaoPagamento,
    banco: c.banco,
    agencia: c.agencia,
    conta: c.conta,
    observacoes: c.observacoes,
    localRetirada: c.localRetirada,
    codigoLocalEntrega: c.codigoLocalEntrega,
    previsaoEntrega: c.previsaoEntrega,
    nomeLocalEntrega: c.nomeLocalEntrega,
    cnpjLocalEntrega: c.cnpjLocalEntrega,
    enderecoLocalEntrega: c.enderecoLocalEntrega,
    cidadeLocalEntrega: c.cidadeLocalEntrega,
  };
}

export function ContratoCompraView({ initialContratos }: { initialContratos: ContratoCompraCafeSalvo[] }) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function novoContrato() {
    setForm(emptyForm());
    setEditingId(null);
  }

  function carregarContrato(c: ContratoCompraCafeSalvo) {
    setEditingId(c.id);
    setForm(salvoParaForm(c));
  }

  function salvarContrato() {
    const payload = {
      numeroContrato: form.numeroContrato,
      dataContrato: form.dataContrato,
      tipoOperacao: form.tipoOperacao,
      modalidade: form.modalidade,
      referenciaPagamento: form.referenciaPagamento,
      codigoVendedor: form.codigoVendedor,
      nomeVendedor: form.nomeVendedor,
      cnpjVendedor: form.cnpjVendedor,
      enderecoVendedor: form.enderecoVendedor,
      inscricaoEstadualVendedor: form.inscricaoEstadualVendedor,
      grupoVendedor: form.grupoVendedor,
      corretor: form.corretor,
      comissaoCorretor: toNumber(form.comissaoCorretor),
      agente: form.agente,
      comissaoAgente: toNumber(form.comissaoAgente),
      descricaoProduto: form.descricaoProduto,
      safra: form.safra,
      padrao: form.padrao,
      bebida: form.bebida,
      tipoEmbalagem: form.tipoEmbalagem,
      valorLivrePorSaca: toNumber(form.valorLivrePorSaca),
      quantidadeSacas: Math.round(toNumber(form.quantidadeSacas)),
      valorFaturadoPorSaca: toNumber(form.valorFaturadoPorSaca),
      creditoIcms: form.creditoIcms,
      condicaoPagamento: form.condicaoPagamento,
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      observacoes: form.observacoes,
      localRetirada: form.localRetirada,
      codigoLocalEntrega: form.codigoLocalEntrega,
      previsaoEntrega: form.previsaoEntrega || null,
      nomeLocalEntrega: form.nomeLocalEntrega,
      cnpjLocalEntrega: form.cnpjLocalEntrega,
      enderecoLocalEntrega: form.enderecoLocalEntrega,
      cidadeLocalEntrega: form.cidadeLocalEntrega,
    };
    startSaving(async () => {
      if (editingId) {
        await updateContratoCompraCafe(editingId, payload);
      } else {
        const id = await createContratoCompraCafe(payload);
        setEditingId(id);
      }
      router.refresh();
    });
  }

  function excluirContrato(c: ContratoCompraCafeSalvo) {
    if (!window.confirm(`Excluir o contrato nº ${c.numeroContrato || c.id}? Esta ação não pode ser desfeita.`))
      return;
    startDeleting(async () => {
      await deleteContratoCompraCafe(c.id);
      if (editingId === c.id) novoContrato();
      router.refresh();
    });
  }

  const sacas = toNumber(form.quantidadeSacas);
  const quantidadeKg = sacas * 60;
  const valorTotalNota = sacas * toNumber(form.valorFaturadoPorSaca);
  const valorTotalLivre = sacas * toNumber(form.valorLivrePorSaca);

  return (
    <div className="relative">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
        }
      `}</style>

      <div className="grid grid-cols-1 gap-6 print:hidden xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados do contrato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nº do contrato</Label>
                  <Input value={form.numeroContrato} onChange={(e) => set("numeroContrato", e.target.value)} placeholder="Ex: 1007.1" />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.dataContrato} onChange={(e) => set("dataContrato", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de operação</Label>
                  <Input value={form.tipoOperacao} onChange={(e) => set("tipoOperacao", e.target.value)} />
                </div>
                <div>
                  <Label>Modalidade</Label>
                  <Input value={form.modalidade} onChange={(e) => set("modalidade", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Referência (pagamento)</Label>
                <Input value={form.referenciaPagamento} onChange={(e) => set("referenciaPagamento", e.target.value)} placeholder="Ex: PGTO 15/08/26" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendedor (fornecedor)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código</Label>
                  <Input value={form.codigoVendedor} onChange={(e) => set("codigoVendedor", e.target.value)} />
                </div>
                <div>
                  <Label>CNPJ/CPF</Label>
                  <Input value={form.cnpjVendedor} onChange={(e) => set("cnpjVendedor", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Nome / Razão social</Label>
                <Input value={form.nomeVendedor} onChange={(e) => set("nomeVendedor", e.target.value)} />
              </div>
              <div>
                <Label>Endereço (rua, bairro, cidade/UF)</Label>
                <Textarea rows={2} value={form.enderecoVendedor} onChange={(e) => set("enderecoVendedor", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Insc. Estadual</Label>
                  <Input value={form.inscricaoEstadualVendedor} onChange={(e) => set("inscricaoEstadualVendedor", e.target.value)} />
                </div>
                <div>
                  <Label>Grupo</Label>
                  <Input value={form.grupoVendedor} onChange={(e) => set("grupoVendedor", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Corretor / Agente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Corretor</Label>
                  <Input value={form.corretor} onChange={(e) => set("corretor", e.target.value)} />
                </div>
                <div>
                  <Label>Comissão (%)</Label>
                  <Input value={form.comissaoCorretor} onChange={(e) => set("comissaoCorretor", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agente</Label>
                  <Input value={form.agente} onChange={(e) => set("agente", e.target.value)} />
                </div>
                <div>
                  <Label>Comissão (%)</Label>
                  <Input value={form.comissaoAgente} onChange={(e) => set("comissaoAgente", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Descrição (código - nome)</Label>
                <Input value={form.descricaoProduto} onChange={(e) => set("descricaoProduto", e.target.value)} placeholder="Ex: GC02001 - GOOD CUP 02 - BICA CORRIDA" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Safra</Label>
                  <Input value={form.safra} onChange={(e) => set("safra", e.target.value)} placeholder="2026/2027" />
                </div>
                <div>
                  <Label>Padrão</Label>
                  <Input value={form.padrao} onChange={(e) => set("padrao", e.target.value)} />
                </div>
                <div>
                  <Label>Bebida</Label>
                  <Input value={form.bebida} onChange={(e) => set("bebida", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados do faturamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Tipo de embalagem</Label>
                <Input value={form.tipoEmbalagem} onChange={(e) => set("tipoEmbalagem", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade de sacas</Label>
                  <Input inputMode="numeric" value={form.quantidadeSacas} onChange={(e) => set("quantidadeSacas", e.target.value)} />
                </div>
                <div>
                  <Label>Quantidade em Kg</Label>
                  <Input value={formatBR(quantidadeKg, 2)} disabled className="opacity-60" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor livre por saca (R$)</Label>
                  <Input inputMode="decimal" value={form.valorLivrePorSaca} onChange={(e) => set("valorLivrePorSaca", e.target.value)} />
                </div>
                <div>
                  <Label>Valor faturado por saca (R$)</Label>
                  <Input inputMode="decimal" value={form.valorFaturadoPorSaca} onChange={(e) => set("valorFaturadoPorSaca", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor total da nota (R$)</Label>
                  <Input value={formatBR(valorTotalNota)} disabled className="opacity-60" />
                </div>
                <div>
                  <Label>Valor total livre (R$)</Label>
                  <Input value={formatBR(valorTotalLivre)} disabled className="opacity-60" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Crédito de ICMS</Label>
                  <Input value={form.creditoIcms} onChange={(e) => set("creditoIcms", e.target.value)} />
                </div>
                <div>
                  <Label>Condição pagamento</Label>
                  <Input value={form.condicaoPagamento} onChange={(e) => set("condicaoPagamento", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados bancários do fornecedor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Banco</Label>
                <Input value={form.banco} onChange={(e) => set("banco", e.target.value)} placeholder="Ex: 756 - Banco Cooperativo Sicoob S.A." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Agência</Label>
                  <Input value={form.agencia} onChange={(e) => set("agencia", e.target.value)} />
                </div>
                <div>
                  <Label>Conta</Label>
                  <Input value={form.conta} onChange={(e) => set("conta", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Observações do contrato</Label>
                <Textarea rows={2} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
              </div>
              <div>
                <Label>Local de retirada</Label>
                <Input value={form.localRetirada} onChange={(e) => set("localRetirada", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Código local de entrega</Label>
                  <Input value={form.codigoLocalEntrega} onChange={(e) => set("codigoLocalEntrega", e.target.value)} />
                </div>
                <div>
                  <Label>Previsão de entrega</Label>
                  <Input type="date" value={form.previsaoEntrega} onChange={(e) => set("previsaoEntrega", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Nome do local de entrega</Label>
                <Input value={form.nomeLocalEntrega} onChange={(e) => set("nomeLocalEntrega", e.target.value)} />
              </div>
              <div>
                <Label>CNPJ do local de entrega</Label>
                <Input value={form.cnpjLocalEntrega} onChange={(e) => set("cnpjLocalEntrega", e.target.value)} />
              </div>
              <div>
                <Label>Endereço do local de entrega</Label>
                <Input value={form.enderecoLocalEntrega} onChange={(e) => set("enderecoLocalEntrega", e.target.value)} />
              </div>
              <div>
                <Label>Cidade do local de entrega</Label>
                <Input value={form.cidadeLocalEntrega} onChange={(e) => set("cidadeLocalEntrega", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button onClick={salvarContrato} disabled={isSaving} className="flex-1">
              <Save size={16} />
              {isSaving ? "Salvando…" : editingId ? "Salvar alterações" : "Salvar contrato"}
            </Button>
            <Button onClick={novoContrato} variant="outline">
              <FilePlus2 size={16} />
              Novo
            </Button>
          </div>

          <Button onClick={() => window.print()} variant="outline" className="w-full">
            <Printer size={16} />
            Imprimir / PDF
          </Button>

          {initialContratos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Contratos salvos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-2 pt-0">
                {initialContratos.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-2 rounded-lg p-2 text-sm ${
                      editingId === c.id ? "bg-primary/10" : "hover:bg-background"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => carregarContrato(c)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <FileText size={14} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate">
                        {c.numeroContrato || "(sem número)"} — {c.nomeVendedor || "?"}
                      </span>
                      <span className="shrink-0 text-xs text-muted">
                        {c.quantidadeSacas} sc
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirContrato(c)}
                      disabled={isDeleting}
                      className="shrink-0 rounded p-1 text-muted hover:text-danger"
                      aria-label="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <ContratoPreview
              form={form}
              quantidadeKg={quantidadeKg}
              valorTotalNota={valorTotalNota}
              valorTotalLivre={valorTotalLivre}
              className="mx-auto border border-border shadow-sm"
            />
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block">
        <ContratoPreview
          form={form}
          quantidadeKg={quantidadeKg}
          valorTotalNota={valorTotalNota}
          valorTotalLivre={valorTotalLivre}
        />
      </div>
    </div>
  );
}

// Linha de duas colunas no mesmo padrao do documento original: coluna
// esquerda com largura fixa (nao encolhe com o rotulo da direita mesmo
// quando o texto da esquerda e longo) e coluna direita alinhada a direita.
function Row({ left, right }: { left: ReactNode; right?: ReactNode }) {
  return (
    <div className="grid grid-cols-[3fr_2fr] gap-3">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

// Campo do lado direito no mesmo padrao do documento original: rotulo em
// negrito alinhado a esquerda do bloco, valor alinhado a direita da pagina.
function RightField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="flex w-full justify-between gap-2">
      <b className="shrink-0">{label}</b>
      <span className="text-right">{value}</span>
    </span>
  );
}

function ContratoPreview({
  form,
  quantidadeKg,
  valorTotalNota,
  valorTotalLivre,
  className = "",
}: {
  form: FormState;
  quantidadeKg: number;
  valorTotalNota: number;
  valorTotalLivre: number;
  className?: string;
}) {
  const valorLivreNum = toNumber(form.valorLivrePorSaca);
  const valorFaturadoNum = toNumber(form.valorFaturadoPorSaca);

  return (
    <div
      className={`w-full bg-white px-8 py-6 text-[10.5px] leading-snug text-[#1c2b36] print:h-[297mm] print:w-[210mm] print:px-10 print:py-8 ${className}`}
    >
      <div className="relative mb-2 flex justify-center">
        <Image
          src="/nayme-logo-oc.png"
          alt="Nayme Exportadora de Café"
          width={422}
          height={168}
          className="absolute left-0 top-0 h-14 w-auto"
        />
        <div className="text-center">
          <p className="text-[15px] font-bold">{COMPRADOR.nome}</p>
          <p>{COMPRADOR.endereco1}</p>
          <p>{COMPRADOR.endereco2}</p>
          <p>{COMPRADOR.cidade}</p>
          <p>
            CNPJ: {COMPRADOR.cnpj} &nbsp;&nbsp;&nbsp; Telefone: {COMPRADOR.telefone}
          </p>
        </div>
      </div>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <div className="mb-2 flex items-center justify-between bg-[#c9c9c9] px-2 py-1.5">
        <span>
          Contrato: <b>{form.numeroContrato || "____"}</b>
        </span>
        <span className="text-[13px] font-bold">CONTRATO DE COMPRA</span>
        <span>
          Data: <b>{formatDataBR(form.dataContrato)}</b>
        </span>
      </div>

      <div className="mb-0.5 flex justify-between">
        <span>
          Tipo de Operação: <b>{form.tipoOperacao}</b>
        </span>
        <span>
          Modalidade: <b>{form.modalidade}</b>
        </span>
      </div>
      <p className="mb-1">
        Referência: <b>{form.referenciaPagamento}</b>
      </p>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <div className="mb-0.5 space-y-0.5 pt-1">
        <Row
          left={
            <span>
              <b>Vendedor:</b> {form.codigoVendedor} - {form.nomeVendedor}
            </span>
          }
          right={<RightField label="CNPJ/CPF:" value={form.cnpjVendedor} />}
        />
        <Row
          left={
            <span>
              <b>Referência:</b> {form.nomeVendedor}
            </span>
          }
          right={<RightField label="Insc. Estadual:" value={form.inscricaoEstadualVendedor} />}
        />
        {form.enderecoVendedor.split("\n").map((linha, i) => (
          <Row key={i} left={<span>{linha}</span>} right={i === 0 && <RightField label="Grupo:" value={form.grupoVendedor} />} />
        ))}
      </div>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <div className="mb-0.5 space-y-0.5 pt-1">
        <Row
          left={
            <span>
              <b>Corretor:</b> {form.corretor}
            </span>
          }
          right={<RightField label="Comissão:" value={`${form.comissaoCorretor}%`} />}
        />
        <Row
          left={
            <span>
              <b>Agente:</b> {form.agente}
            </span>
          }
          right={<RightField label="Comissão:" value={`${form.comissaoAgente}%`} />}
        />
      </div>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <div className="mb-0.5 space-y-0.5 pt-1">
        <Row
          left={
            <span>
              <b>Descrição:</b> {form.descricaoProduto}
            </span>
          }
          right={<RightField label="Safra:" value={form.safra} />}
        />
        <p>
          <b>Padrão:</b> {form.padrao} &nbsp;&nbsp;&nbsp; <b>Bebida:</b> {form.bebida}
        </p>
      </div>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <p className="mb-1 mt-1 font-bold">Dados do Faturamento</p>
      <div className="mb-0.5 space-y-0.5">
        <Row
          left={
            <span>
              <b>Tipo de embalagem:</b> {form.tipoEmbalagem}
            </span>
          }
          right={<RightField label="Valor livre por saca:" value={formatBR(valorLivreNum)} />}
        />
        <Row
          left={
            <span>
              <b>Quantidade de sacas:</b> {form.quantidadeSacas || 0}
            </span>
          }
          right={<RightField label="Valor faturado por saca:" value={formatBR(valorFaturadoNum)} />}
        />
        <Row
          left={
            <span>
              <b>Quantidade em Kg:</b> {formatBR(quantidadeKg)}
            </span>
          }
          right={
            <RightField
              label="Valor total da nota:"
              value={<span className="border-t border-[#1c2b36]">{formatBR(valorTotalNota)}</span>}
            />
          }
        />
        <Row left={null} right={<RightField label="Crédito de ICMS:" value={form.creditoIcms} />} />
        <Row
          left={
            <span>
              <b>Condição pagamento:</b> {form.condicaoPagamento}
            </span>
          }
          right={
            <RightField
              label="Valor total livre:"
              value={<span className="border-t border-[#1c2b36]">{formatBR(valorTotalLivre)}</span>}
            />
          }
        />
      </div>
      <div className="mb-1 mt-1 border-b border-[#1c2b36]" />

      <p className="mb-1 font-bold">Dados bancários do fornecedor</p>
      <div className="mb-1 space-y-0.5">
        <p>
          <b>Banco:</b> {form.banco}
        </p>
        <p>
          <b>Agência:</b> {form.agencia} &nbsp;&nbsp;&nbsp; <b>Conta:</b> {form.conta}
        </p>
      </div>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <p className="font-bold">Observações do contrato:</p>
      <p className="min-h-8">{form.observacoes}</p>
      <div className="mb-1 h-16 print:h-24" />

      <div className="border-b border-[#1c2b36]" />
      <p className="my-1">
        <b>Local de retirada:</b> {form.localRetirada}
      </p>
      <div className="mb-1 border-b border-[#1c2b36]" />

      <p className="mb-1 mt-1 font-bold">Local de Entrega</p>
      <div className="mb-6 space-y-0.5">
        <Row
          left={
            <span>
              <b>Código:</b> {form.codigoLocalEntrega}
            </span>
          }
          right={<RightField label="Previsão de entrega:" value={formatDataBR(form.previsaoEntrega)} />}
        />
        <p>
          <b>Nome:</b> {form.nomeLocalEntrega}
        </p>
        <p>
          <b>CNPJ:</b> {form.cnpjLocalEntrega}
        </p>
        <p>
          <b>End.:</b> {form.enderecoLocalEntrega}
        </p>
        <p>
          <b>Cidade:</b> {form.cidadeLocalEntrega}
        </p>
      </div>

      <div className="mt-16 grid grid-cols-2 gap-10 text-center">
        <div>
          <div className="border-t border-[#1c2b36] pt-1 font-bold">{COMPRADOR.nome}</div>
          <p>ASSINATURA DO COMPRADOR</p>
        </div>
        <div>
          <div className="border-t border-[#1c2b36] pt-1 font-bold">{form.nomeVendedor || "____________"}</div>
          <p>ASSINATURA DO VENDEDOR</p>
        </div>
      </div>
      <p className="mt-4 text-right text-[9px] text-[#1c2b36]/60">Impresso por SAP Business One</p>
    </div>
  );
}
