// Relatorios das telas do Hedge (no navegador): exportacao para Excel (CSV com
// separador ";" e virgula decimal, que o Excel em portugues abre direto) e
// versao para imprimir / salvar em PDF.

export type TabelaRelatorio = {
  titulo: string;
  colunas: string[];
  linhas: (string | number | null)[][];
  /** Colunas numericas (alinhadas a direita na impressao). */
  numericas?: boolean[];
  rodape?: (string | number | null)[];
};

const escaparCsv = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

function celulaCsv(v: string | number | null) {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return String(Math.round(v * 1e6) / 1e6).replace(".", ",");
  return escaparCsv(v);
}

export function baixarCsv(nomeArquivo: string, tabelas: TabelaRelatorio[]) {
  const partes: string[] = [];
  for (const t of tabelas) {
    if (partes.length) partes.push("");
    partes.push(escaparCsv(t.titulo));
    partes.push(t.colunas.map(escaparCsv).join(";"));
    for (const l of t.linhas) partes.push(l.map(celulaCsv).join(";"));
    if (t.rodape) partes.push(t.rodape.map(celulaCsv).join(";"));
  }
  const blob = new Blob(["﻿" + partes.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(a.href);
}

const html = (s: string | number | null) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Abre uma janela com o relatorio formatado e chama a impressao (no dialogo de
// impressao, "Salvar como PDF" gera o arquivo).
export function imprimirRelatorio(opcoes: {
  titulo: string;
  subtitulo: string;
  indicadores: { label: string; valor: string }[];
  tabelas: TabelaRelatorio[];
}) {
  const janela = window.open("", "_blank");
  if (!janela) {
    window.alert("O navegador bloqueou a janela do relatorio. Permita pop-ups para este site e tente de novo.");
    return;
  }
  const tabelaHtml = (t: TabelaRelatorio) => `
    <h2>${html(t.titulo)}</h2>
    <table>
      <thead><tr>${t.colunas.map((c, i) => `<th class="${t.numericas?.[i] ? "n" : ""}">${html(c)}</th>`).join("")}</tr></thead>
      <tbody>${t.linhas
        .map((l) => `<tr>${l.map((v, i) => `<td class="${t.numericas?.[i] ? "n" : ""}">${html(v)}</td>`).join("")}</tr>`)
        .join("")}</tbody>
      ${t.rodape ? `<tfoot><tr>${t.rodape.map((v, i) => `<td class="${t.numericas?.[i] ? "n" : ""}">${html(v)}</td>`).join("")}</tr></tfoot>` : ""}
    </table>`;
  janela.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${html(opcoes.titulo)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 10px; margin: 0; }
      h1 { font-size: 16px; margin: 0 0 2px; }
      h2 { font-size: 12px; margin: 14px 0 4px; }
      .sub { color: #555; margin-bottom: 8px; }
      .ind { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 4px; }
      .ind div { border: 1px solid #ccc; border-radius: 4px; padding: 4px 8px; }
      .ind b { display: block; font-size: 11px; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border-bottom: 1px solid #ddd; padding: 2px 4px; text-align: left; white-space: nowrap; }
      th { background: #f0f0f0; font-weight: bold; }
      td.n, th.n { text-align: right; }
      tfoot td { font-weight: bold; border-top: 2px solid #999; }
      tr { page-break-inside: avoid; }
    </style></head><body>
    <h1>${html(opcoes.titulo)}</h1>
    <div class="sub">${html(opcoes.subtitulo)}</div>
    ${opcoes.indicadores.length ? `<div class="ind">${opcoes.indicadores.map((i) => `<div>${html(i.label)}<b>${html(i.valor)}</b></div>`).join("")}</div>` : ""}
    ${opcoes.tabelas.map(tabelaHtml).join("")}
    <script>window.onload = function () { window.print(); };</script>
    </body></html>`);
  janela.document.close();
}
