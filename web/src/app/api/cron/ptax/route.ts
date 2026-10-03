import { NextResponse, type NextRequest } from "next/server";
import { sincronizarPtax } from "@/lib/hedge-cambial/ptax";

// Agendamento diario da Vercel (vercel.json): grava a PTAX do dia no historico.
// So roda com o CRON_SECRET configurado na Vercel (a Vercel envia o cabecalho
// Authorization automaticamente). Sem ele, a PTAX continua sendo atualizada
// quando alguem abre uma tela do Hedge.
export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "nao autorizado" }, { status: 401 });
  }
  try {
    const r = await sincronizarPtax({ forcar: true });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: e instanceof Error ? e.message : "falha" }, { status: 502 });
  }
}
