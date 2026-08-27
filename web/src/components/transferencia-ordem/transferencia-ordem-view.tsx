"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { valorPorExtenso } from "@/lib/extenso";
import { saveBankTransferChannel } from "@/app/(dashboard)/transferencia-ordem/actions";
import { Printer, Save, Pencil } from "lucide-react";

type CanalBancario = {
  moeda: string;
  correspondentSwift: string;
  correspondentBanco: string;
  correspondentConta: string;
  beneficiarySwift: string;
  beneficiaryBanco: string;
  beneficiaryEndereco: string;
  finalBeneficiario: string;
  finalIban: string;
  finalLocal: string;
  finalBranch: string;
  finalConta: string;
};

type Bank = { id: string; name: string; transferChannel: CanalBancario | null };

const canalVazio: CanalBancario = {
  moeda: "USD",
  correspondentSwift: "",
  correspondentBanco: "",
  correspondentConta: "",
  beneficiarySwift: "",
  beneficiaryBanco: "",
  beneficiaryEndereco: "",
  finalBeneficiario: "",
  finalIban: "",
  finalLocal: "",
  finalBranch: "",
  finalConta: "",
};

const moedaOptions = [
  { value: "USD", label: "US$ - Dólar" },
  { value: "EUR", label: "€ - Euro" },
  { value: "GBP", label: "£ - Libra esterlina" },
  { value: "BRL", label: "R$ - Real" },
];

const moedaSimbolo: Record<string, string> = { USD: "US$", EUR: "€", GBP: "£", BRL: "R$" };

const mesesPt = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarDataExtenso(dataStr: string) {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  return `${dia} de ${mesesPt[mes - 1]} de ${ano}`;
}

function formValue(valor: string) {
  const n = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function emptyForm() {
  return {
    cidade: "Manhuaçu",
    data: new Date().toISOString().slice(0, 10),
    tipo: "PARCIAL" as "PARCIAL" | "TOTAL",
    numeroOrdem: "",
    valor: "",
    valorExtenso: "",
    bancoId: "",
    bancoDestino: "",
    descontaTarifa: "NAO" as "SIM" | "NAO",
    valorTarifa: "",
    observacoes: "",
    ...canalVazio,
  };
}

export function TransferenciaOrdemView({ banks }: { banks: Bank[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(emptyForm());
  const [editandoCanal, setEditandoCanal] = useState(false);

  function set<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setValorEMoeda(valor: string, moeda: string) {
    const valorNum = formValue(valor);
    setForm((prev) => ({
      ...prev,
      valor,
      moeda,
      valorExtenso: valorNum > 0 ? valorPorExtenso(valorNum, moeda) : "",
    }));
  }

  function selecionarBanco(bancoId: string) {
    const banco = banks.find((b) => b.id === bancoId);
    setEditandoCanal(false);
    setForm((prev) => ({
      ...prev,
      bancoId,
      bancoDestino: banco?.name ?? prev.bancoDestino,
      ...(banco ? banco.transferChannel ?? canalVazio : {}),
    }));
  }

  function salvarCanalPadrao() {
    if (!form.bancoId) return;
    const { moeda, correspondentSwift, correspondentBanco, correspondentConta, beneficiarySwift, beneficiaryBanco, beneficiaryEndereco, finalBeneficiario, finalIban, finalLocal, finalBranch, finalConta } = form;
    startTransition(async () => {
      await saveBankTransferChannel(form.bancoId, {
        moeda, correspondentSwift, correspondentBanco, correspondentConta,
        beneficiarySwift, beneficiaryBanco, beneficiaryEndereco,
        finalBeneficiario, finalIban, finalLocal, finalBranch, finalConta,
      });
      setEditandoCanal(false);
      router.refresh();
    });
  }

  const simbolo = moedaSimbolo[form.moeda] ?? "US$";
  const valorFormatado = form.valor
    ? Number(formValue(form.valor)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";

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
              <CardTitle>Dados da ordem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} />
                </div>
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.data} onChange={(e) => set("data", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo de transferência</Label>
                  <Select value={form.tipo} onChange={(e) => set("tipo", e.target.value as "PARCIAL" | "TOTAL")}>
                    <option value="PARCIAL">Parcial</option>
                    <option value="TOTAL">Total</option>
                  </Select>
                </div>
                <div>
                  <Label>Nº da ordem de pagamento</Label>
                  <Input value={form.numeroOrdem} onChange={(e) => set("numeroOrdem", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Moeda</Label>
                  <Select value={form.moeda} onChange={(e) => setValorEMoeda(form.valor, e.target.value)}>
                    {moedaOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Valor ({simbolo})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor}
                    onChange={(e) => setValorEMoeda(e.target.value, form.moeda)}
                  />
                </div>
              </div>
              <div>
                <Label>Valor por extenso</Label>
                <Textarea
                  rows={2}
                  value={form.valorExtenso}
                  onChange={(e) => set("valorExtenso", e.target.value)}
                  placeholder="Preenchido automaticamente ao digitar o valor"
                />
                <p className="mt-1 text-xs text-muted">Gerado automaticamente — pode editar se precisar ajustar.</p>
              </div>
              <div>
                <Label>Banco de destino</Label>
                <Select value={form.bancoId} onChange={(e) => selecionarBanco(e.target.value)}>
                  <option value="">Selecione um banco cadastrado…</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {!b.transferChannel ? " (sem canal cadastrado)" : ""}
                    </option>
                  ))}
                </Select>
                {!form.bancoId && (
                  <Input
                    className="mt-2"
                    value={form.bancoDestino}
                    onChange={(e) => set("bancoDestino", e.target.value)}
                    placeholder="Ou digite o nome de um banco fora da lista"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Desconta tarifa do banqueiro?</Label>
                  <Select
                    value={form.descontaTarifa}
                    onChange={(e) => set("descontaTarifa", e.target.value as "SIM" | "NAO")}
                  >
                    <option value="NAO">Não</option>
                    <option value="SIM">Sim</option>
                  </Select>
                </div>
                {form.descontaTarifa === "SIM" && (
                  <div>
                    <Label>Valor da tarifa ({simbolo})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.valorTarifa}
                      onChange={(e) => set("valorTarifa", e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Canal bancário (instruções de crédito)</CardTitle>
              {form.bancoId && (
                <button
                  type="button"
                  onClick={() => setEditandoCanal((v) => !v)}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Pencil size={12} />
                  {editandoCanal ? "Cancelar edição" : "Editar canal deste banco"}
                </button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {form.bancoId && !editandoCanal ? (
                <p className="text-xs text-muted">
                  Preenchido automaticamente com o canal cadastrado para este banco. Clique em
                  &quot;Editar canal deste banco&quot; para corrigir os dados salvos.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  {form.bancoId
                    ? "Editando o canal padrão deste banco — salve para atualizar para as próximas transferências."
                    : "Selecione um banco cadastrado acima para preencher automaticamente, ou digite manualmente para um banco avulso."}
                </p>
              )}
              <fieldset disabled={!!form.bancoId && !editandoCanal} className="space-y-4 disabled:opacity-60">
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">Correspondent Bank (campo 56)</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Swift Code"
                      value={form.correspondentSwift}
                      onChange={(e) => set("correspondentSwift", e.target.value)}
                    />
                    <Input
                      placeholder="Banco - Cidade, País"
                      value={form.correspondentBanco}
                      onChange={(e) => set("correspondentBanco", e.target.value)}
                    />
                    <Input
                      placeholder="Conta do banco beneficiário nesse correspondente"
                      value={form.correspondentConta}
                      onChange={(e) => set("correspondentConta", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">Beneficiary Bank (campo 57)</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Swift Code"
                      value={form.beneficiarySwift}
                      onChange={(e) => set("beneficiarySwift", e.target.value)}
                    />
                    <Input
                      placeholder="Banco - Cidade, País"
                      value={form.beneficiaryBanco}
                      onChange={(e) => set("beneficiaryBanco", e.target.value)}
                    />
                    <Input
                      placeholder="Endereço"
                      value={form.beneficiaryEndereco}
                      onChange={(e) => set("beneficiaryEndereco", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">Final Beneficiary (campo 59)</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome do beneficiário final"
                      value={form.finalBeneficiario}
                      onChange={(e) => set("finalBeneficiario", e.target.value)}
                    />
                    <Input
                      placeholder="IBAN"
                      value={form.finalIban}
                      onChange={(e) => set("finalIban", e.target.value)}
                    />
                    <Input
                      placeholder="Cidade, UF - País"
                      value={form.finalLocal}
                      onChange={(e) => set("finalLocal", e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Branch"
                        value={form.finalBranch}
                        onChange={(e) => set("finalBranch", e.target.value)}
                      />
                      <Input
                        placeholder="Conta"
                        value={form.finalConta}
                        onChange={(e) => set("finalConta", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </fieldset>
              {editandoCanal && form.bancoId && (
                <Button onClick={salvarCanalPadrao} disabled={isPending} className="w-full" variant="outline">
                  <Save size={14} />
                  {isPending ? "Salvando…" : "Salvar como canal padrão deste banco"}
                </Button>
              )}
              <div>
                <Label>Observações (opcional)</Label>
                <Textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={(e) => set("observacoes", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => window.print()} className="w-full">
            <Printer size={16} />
            Imprimir no papel timbrado
          </Button>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <CartaPreview
              form={form}
              simbolo={simbolo}
              valorFormatado={valorFormatado}
              className="mx-auto border border-border shadow-sm"
            />
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block">
        <CartaPreview form={form} simbolo={simbolo} valorFormatado={valorFormatado} />
      </div>
    </div>
  );
}

function CartaPreview({
  form,
  simbolo,
  valorFormatado,
  className = "",
}: {
  form: ReturnType<typeof emptyForm>;
  simbolo: string;
  valorFormatado: string;
  className?: string;
}) {
  const tipoLabel = form.tipo === "PARCIAL" ? "parcial" : "total";

  return (
    <div className={`flex w-full flex-col bg-white text-[#1c2b36] print:h-[297mm] print:w-[210mm] ${className}`}>
      <Image
        src="/nayme-letterhead-header.png"
        alt="Nayme Comércio e Exportação de Café"
        width={1809}
        height={330}
        className="h-auto w-full"
        priority
      />

      <div className="flex-1 px-10 py-8 text-[13px] leading-relaxed print:px-14 print:py-10 print:text-[12px]">
        <p className="mb-6">
          {form.cidade || "Manhuaçu"}, {formatarDataExtenso(form.data)}
        </p>

        <p className="mb-6 text-justify">
          Solicitamos a transferência {tipoLabel} da ordem de pagamento recebida do exterior nº{" "}
          <strong>{form.numeroOrdem || "____________"}</strong> no valor de {simbolo}{" "}
          <strong>{valorFormatado}</strong>
          {form.valorExtenso && <> ({form.valorExtenso})</>} para o{" "}
          <strong>{form.bancoDestino || "____________"}</strong> conforme canal bancário abaixo:
        </p>

        {(() => {
          const temCorrespondent = !!(form.correspondentSwift || form.correspondentBanco || form.correspondentConta);
          const temBeneficiary = !!(form.beneficiarySwift || form.beneficiaryBanco || form.beneficiaryEndereco);
          const temFinal = !!(
            form.finalBeneficiario ||
            form.finalIban ||
            form.finalLocal ||
            form.finalBranch ||
            form.finalConta
          );
          if (!temCorrespondent && !temBeneficiary && !temFinal) return null;

          return (
            <div className="mb-6 space-y-4 rounded-md border border-[#1c8388]/30 bg-[#1c8388]/5 p-4">
              <p className="font-semibold underline">
                Instructions for credit: {form.moeda} – MT 103
              </p>

              {temCorrespondent && (
                <div>
                  <p className="font-semibold">
                    Correspondent Bank (field 56){form.correspondentSwift && `: ${form.correspondentSwift}`}
                  </p>
                  {form.correspondentBanco && <p>{form.correspondentBanco}</p>}
                  {form.correspondentSwift && <p>Swift Code: {form.correspondentSwift}</p>}
                  {form.correspondentConta && <p>Conta: {form.correspondentConta}</p>}
                </div>
              )}

              {temBeneficiary && (
                <div>
                  <p className="font-semibold">
                    Beneficiary Bank (field 57){form.beneficiarySwift && `: ${form.beneficiarySwift}`}
                  </p>
                  {form.beneficiaryBanco && <p>{form.beneficiaryBanco}</p>}
                  {form.beneficiarySwift && <p>Swift Code: {form.beneficiarySwift}</p>}
                  {form.beneficiaryEndereco && <p>{form.beneficiaryEndereco}</p>}
                </div>
              )}

              {temFinal && (
                <div>
                  <p className="font-semibold">
                    Final Beneficiary (field 59){form.finalIban && `: ${form.finalIban}`}
                  </p>
                  {form.finalBeneficiario && <p>{form.finalBeneficiario}</p>}
                  {form.finalIban && <p>{form.finalIban}</p>}
                  {form.finalLocal && <p>{form.finalLocal}</p>}
                  {form.finalBranch && <p>Branch: {form.finalBranch}</p>}
                  {form.finalConta && <p>Account: {form.finalConta}</p>}
                  {form.finalIban && <p>IBAN: {form.finalIban}</p>}
                </div>
              )}
            </div>
          );
        })()}

        <p className="mb-6 text-justify">
          {form.descontaTarifa === "SIM"
            ? `Favor descontar a ordem do banqueiro em conta corrente no valor de ${simbolo} ${
                form.valorTarifa ? Number(form.valorTarifa).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"
              }.`
            : "Favor não descontar a ordem do banqueiro na transferência desta ordem."}
        </p>

        {form.observacoes && <p className="mb-6 text-justify">{form.observacoes}</p>}

        <div className="mt-16 grid grid-cols-1 gap-10 print:mt-24">
          <div className="mx-auto w-2/3 text-center text-xs">
            <div className="border-t border-[#1c2b36] pt-2">Assinatura autorizada</div>
          </div>
        </div>
      </div>

      <Image
        src="/nayme-letterhead-footer.png"
        alt="Nayme Comércio e Exportação de Café - contato"
        width={1962}
        height={441}
        className="mt-auto h-auto w-full"
      />
    </div>
  );
}
