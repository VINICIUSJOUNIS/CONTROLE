// Logica compartilhada de alerta de prazo (usada tanto no calculo server-side
// da pagina de Alertas de Prazos quanto nos componentes client da Mesa de
// Operacao) - 3 dias antes do vencimento e no dia entram como alerta
// (laranja), depois do vencimento entra como atraso (vermelho).
export function parseISODateLocal(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type AlertaPrazo = { label: string; tone: "warning" | "danger"; dias: number };

export function alertaPrazo(dataPrevisao: string): AlertaPrazo | null {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prevista = parseISODateLocal(dataPrevisao);
  const dias = Math.round((prevista.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (dias < 0) return { label: `Atrasado ${Math.abs(dias)} dia(s)`, tone: "danger", dias };
  if (dias === 0) return { label: "Vence hoje", tone: "warning", dias };
  if (dias <= 3) return { label: `Vence em ${dias} dia(s)`, tone: "warning", dias };
  return null;
}
