"use client";

import { Info, Landmark, LineChart, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Atuacao, PainelCambio, Sinal } from "@/lib/hedge-cambial/cambio-bcb";
import { atualizarCambio } from "@/app/(dashboard)/hedge-cambial/cambio-bcb/actions";
import { BarraAtualizacao } from "@/components/hedge-cambial/atualizacao-automatica";

const INTERVALO_MS = 5 * 60 * 1000;

const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const taxa = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const usdBi = (v: number | null) =>
  v === null ? "-" : `US$ ${(v / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi`;

function Seta({ direcao }: { direcao: Sinal["direcao"] }) {
  if (direcao === "ALTA") return <TrendingUp size={16} className="text-danger" />;
  if (direcao === "QUEDA") return <TrendingDown size={16} className="text-primary" />;
  return <Minus size={16} className="text-muted" />;
}

// Efeito de cada tipo de atuacao do BCB sobre o dolar.
function efeito(a: Atuacao): { texto: string; tipo: "oferta" | "demanda" | "neutro" } {
  if (a.composto) return { texto: "Troca swap por dolar a vista (neutro)", tipo: "neutro" };
  if (a.instrumento === "Venda a Vista") return { texto: "BC vende dolar: segura alta", tipo: "oferta" };
  if (a.instrumento === "Compra a Vista") return { texto: "BC compra dolar: segura queda", tipo: "demanda" };
  if (a.instrumento === "Swap Cambial" && a.modalidade === "Tradicional")
    return { texto: "Oferta de hedge (dolar futuro): segura alta - inclui rolagens", tipo: "oferta" };
  if (a.instrumento === "Swap Cambial" && a.modalidade === "Reverso") return { texto: "Compra de dolar futuro: segura queda", tipo: "demanda" };
  if (a.instrumento === "Venda com Recompra") return { texto: "Linha: dolar emprestado com recompra (liquidez)", tipo: "oferta" };
  return { texto: a.instrumento, tipo: "neutro" };
}

export function CambioBcbView({ painel }: { painel: PainelCambio }) {
  const comDados = painel.dias.filter((d) => d.boletins.length);
  const hoje = comDados.at(-1);
  const anterior = comDados.filter((d) => d.fechamento !== null && hoje && d.data < hoje.data).at(-1);
  const altas = painel.sinais.filter((s) => s.direcao === "ALTA").length;
  const quedas = painel.sinais.filter((s) => s.direcao === "QUEDA").length;
  const leitura = altas > quedas ? "ALTA" : quedas > altas ? "QUEDA" : "ESTAVEL";
  const fechamentos = painel.dias.filter((d) => d.fechamento !== null).slice(-10);
  const min = Math.min(...fechamentos.map((d) => d.fechamento!));
  const max = Math.max(...fechamentos.map((d) => d.fechamento!));

  return (
    <div className="space-y-6">
      <BarraAtualizacao
        buscadoEm={painel.buscadoEm}
        intervaloMs={INTERVALO_MS}
        descartarCache={atualizarCambio}
        rotulo="os dados do Banco Central"
      />
      {painel.falhas.length > 0 && (
        <p className="text-sm text-warning">Banco Central nao respondeu nesta busca: {painel.falhas.join(", ")}. Clique em Atualizar agora.</p>
      )}

      {/* Termometro */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">Tendencia do dolar pelos dados oficiais</span>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-semibold",
              leitura === "ALTA" && "bg-danger/15 text-danger",
              leitura === "QUEDA" && "bg-primary/15 text-primary",
              leitura === "ESTAVEL" && "bg-border/50 text-muted"
            )}
          >
            {leitura === "ESTAVEL" ? "SEM DIRECAO CLARA" : `PRESSAO DE ${leitura}`} ({altas} de alta, {quedas} de queda)
          </span>
        </div>
        <ul>
          {painel.sinais.map((s) => (
            <li key={s.nome} className="flex items-start gap-3 border-b border-border/60 px-4 py-2.5 text-sm last:border-0">
              <Seta direcao={s.direcao} />
              <div>
                <p className="font-medium">
                  {s.nome}: {s.direcao === "ESTAVEL" ? "estavel" : s.direcao === "SEM DADO" ? "sem dado" : s.direcao}
                </p>
                <p className="text-xs text-muted">{s.detalhe}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="border-t border-border bg-border/20 px-4 py-2 text-[11px] text-muted">
          Leitura automatica de 3 sinais oficiais (PTAX no dia, PTAX em 5 pregoes e mediana do Focus). Indica a direcao recente,
          nao e previsao nem recomendacao de operacao.
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PTAX do dia */}
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
            <LineChart size={16} className="text-primary" />
            PTAX {hoje ? `- ${dataBr(hoje.data)}` : ""}
          </div>
          {hoje ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">Boletim</th>
                  <th className="px-4 py-2 font-medium">Hora</th>
                  <th className="px-4 py-2 text-right font-medium">Compra</th>
                  <th className="px-4 py-2 text-right font-medium">Venda</th>
                  <th className="px-4 py-2 text-right font-medium">x fech. anterior</th>
                </tr>
              </thead>
              <tbody>
                {hoje.boletins.map((b) => {
                  const v = anterior?.fechamento ? ((b.venda - anterior.fechamento) / anterior.fechamento) * 100 : null;
                  return (
                    <tr key={b.dataHora + b.tipo} className={cn("border-b border-border/60", b.tipo === "Fechamento" && "font-semibold")}>
                      <td className="px-4 py-2">{b.tipo}</td>
                      <td className="px-4 py-2">{b.dataHora.slice(11, 16)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{taxa(b.compra)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{taxa(b.venda)}</td>
                      <td className={cn("px-4 py-2 text-right tabular-nums", v !== null && v > 0 && "text-danger", v !== null && v < 0 && "text-primary")}>
                        {v === null ? "-" : `${v >= 0 ? "+" : ""}${v.toFixed(2).replace(".", ",")}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-6 text-sm text-muted">Sem boletins no periodo.</p>
          )}
          <p className="px-4 py-2 text-[11px] text-muted">
            O BCB publica a PTAX em 4 boletins (cerca de 10h, 11h, 12h e 13h) e o fechamento por volta das 13h10, em dias uteis.
            {anterior?.fechamento ? ` Fechamento anterior (${dataBr(anterior.data)}): ${taxa(anterior.fechamento)}.` : ""}
          </p>
        </Card>

        {/* Fechamentos e Focus */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">PTAX de fechamento - ultimos pregoes</div>
          <div className="space-y-1.5 px-4 py-3">
            {fechamentos.map((d) => {
              const largura = max > min ? 15 + ((d.fechamento! - min) / (max - min)) * 85 : 50;
              return (
                <div key={d.data} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-muted">{dataBr(d.data)}</span>
                  <div className="h-2.5 flex-1 rounded bg-border/40">
                    <div className="h-2.5 rounded bg-primary/70" style={{ width: `${largura}%` }} />
                  </div>
                  <span className="w-14 text-right tabular-nums">{taxa(d.fechamento!)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-sm font-semibold">Focus - projecao do mercado para o dolar</p>
            {painel.projecoes.length === 0 ? (
              <p className="text-xs text-muted">Sem projecao disponivel.</p>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {painel.projecoes.map((f) => (
                    <tr key={f.ano} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5">Fim de {f.ano}</td>
                      <td className="py-1.5 text-right tabular-nums font-semibold">R$ {taxa(f.mediana)}</td>
                      <td className="py-1.5 text-right text-muted">
                        {f.medianaAnterior !== null ? `4 semanas antes: R$ ${taxa(f.medianaAnterior)}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {painel.projecoes[0] && (
              <p className="mt-1 text-[11px] text-muted">Mediana do Focus de {dataBr(painel.projecoes[0].data)} (o BCB divulga as segundas).</p>
            )}
          </div>
        </Card>
      </div>

      {/* Atuacoes do BCB */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
          <Landmark size={16} className="text-primary" />
          Atuacoes do Banco Central no cambio - ultimos 90 dias
          {painel.atuacoesAte && <span className="font-normal text-muted">(arquivo do BCB atualizado ate {dataBr(painel.atuacoesAte)})</span>}
        </div>
        {painel.atuacoes.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">Nenhuma atuacao no periodo.</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Instrumento</th>
                  <th className="px-4 py-2 font-medium">Efeito no dolar</th>
                  <th className="px-4 py-2 text-right font-medium">Ofertado</th>
                  <th className="px-4 py-2 text-right font-medium">Aceito</th>
                  <th className="px-4 py-2 text-right font-medium">Taxa de corte</th>
                  <th className="px-4 py-2 font-medium">Vencimento</th>
                </tr>
              </thead>
              <tbody>
                {painel.atuacoes.map((a, i) => {
                  const e = efeito(a);
                  return (
                    <tr key={i} className="border-b border-border/60">
                      <td className="whitespace-nowrap px-4 py-1.5">{dataBr(a.data)}</td>
                      <td className="whitespace-nowrap px-4 py-1.5">
                        {a.instrumento}
                        {a.modalidade && <span className="text-muted"> - {a.modalidade}</span>}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-1.5",
                          e.tipo === "oferta" && "text-primary",
                          e.tipo === "demanda" && "text-danger",
                          e.tipo === "neutro" && "text-muted"
                        )}
                      >
                        {e.texto}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums">{usdBi(a.ofertado)}</td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums">{usdBi(a.aceito)}</td>
                      <td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums">
                        {a.taxaCorte === null ? "-" : a.taxaCorte.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-1.5">{a.vencimento ? dataBr(a.vencimento) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="flex gap-3 p-4 text-xs text-muted">
        <Info size={16} className="mt-0.5 shrink-0 text-primary" />
        <div className="space-y-1">
          <p>
            <strong className="text-foreground">Oferta de compra e venda de dolar em tempo real:</strong> o Banco Central nao publica.
            O livro de ofertas do dolar (a vista e futuro) e dado de mercado da B3, vendido por distribuidores de cotacao.
          </p>
          <p>
            <strong className="text-foreground">Fluxo cambial (entradas e saidas de dolares):</strong> o BCB divulga em nota semanal
            (quartas-feiras, com dados ate a sexta anterior), sem API aberta para o sistema buscar.
          </p>
        </div>
      </Card>
    </div>
  );
}
