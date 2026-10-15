"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// Encerra a sessao depois de 30 minutos sem uso: o usuario volta para o login
// e so entra de novo com a senha. A ultima atividade fica no localStorage para
// valer entre abas (mexer numa aba mantem as outras vivas) e para pegar o caso
// de fechar o navegador e voltar depois do prazo.
export const TEMPO_INATIVIDADE_MS = 30 * 60 * 1000;
export const CHAVE_ULTIMA_ATIVIDADE = "controle:ultima-atividade";

const EVENTOS = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart"] as const;

export function registrarAtividade() {
  try {
    localStorage.setItem(CHAVE_ULTIMA_ATIVIDADE, String(Date.now()));
  } catch {}
}

function ultimaAtividade(): number | null {
  try {
    const v = Number(localStorage.getItem(CHAVE_ULTIMA_ATIVIDADE));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function ControleInatividade() {
  useEffect(() => {
    let encerrando = false;
    let ultimaGravacao = 0;

    async function encerrar() {
      if (encerrando) return;
      encerrando = true;
      try {
        localStorage.removeItem(CHAVE_ULTIMA_ATIVIDADE);
      } catch {}
      try {
        await createClient().auth.signOut();
      } finally {
        window.location.replace("/login?motivo=inatividade");
      }
    }

    function verificar() {
      const ultima = ultimaAtividade();
      if (ultima !== null && Date.now() - ultima >= TEMPO_INATIVIDADE_MS) void encerrar();
    }

    // Ao abrir: se a ultima atividade registrada passou do prazo, pede a senha.
    const inicial = ultimaAtividade();
    if (inicial !== null && Date.now() - inicial >= TEMPO_INATIVIDADE_MS) {
      void encerrar();
      return;
    }
    registrarAtividade();

    // Grava no maximo a cada 5s para nao escrever no localStorage a cada pixel do mouse.
    const aoAgir = () => {
      const agora = Date.now();
      if (agora - ultimaGravacao < 5000) return;
      ultimaGravacao = agora;
      registrarAtividade();
    };

    EVENTOS.forEach((e) => window.addEventListener(e, aoAgir, { passive: true }));
    document.addEventListener("visibilitychange", verificar);
    const timer = window.setInterval(verificar, 15000);
    return () => {
      EVENTOS.forEach((e) => window.removeEventListener(e, aoAgir));
      document.removeEventListener("visibilitychange", verificar);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
