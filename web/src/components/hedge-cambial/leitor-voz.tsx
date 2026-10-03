"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Leitura em voz alta pelo sintetizador de voz do navegador (Web Speech API),
// com a melhor voz em portugues do Brasil disponivel (as vozes "Natural"/
// "Online" do Edge e as do Google no Chrome sao neurais).
const VOZES_PREFERIDAS = /natural|neural|online|google|francisca|thalita|antonio/i;

function escolherVoz(vozes: SpeechSynthesisVoice[]) {
  const pt = vozes.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("pt-br"));
  return pt.find((v) => VOZES_PREFERIDAS.test(v.name)) ?? pt[0] ?? vozes.find((v) => v.lang.toLowerCase().startsWith("pt")) ?? null;
}

// O Chrome interrompe falas longas (~15 s): o texto vai em trechos por frase.
function trechos(texto: string) {
  const frases = texto.replace(/\s+/g, " ").match(/[^.!?;]+[.!?;]*/g) ?? [texto];
  const out: string[] = [];
  let atual = "";
  for (const f of frases) {
    if ((atual + f).length > 220 && atual) {
      out.push(atual.trim());
      atual = "";
    }
    atual += f;
  }
  if (atual.trim()) out.push(atual.trim());
  return out;
}

export function useLeitorVoz() {
  // No servidor (e na primeira renderizacao) fica false; no navegador, se ha sintetizador.
  const suportado = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false
  );
  const [ativo, setAtivo] = useState<string | null>(null);
  const voz = useRef<SpeechSynthesisVoice | null>(null);
  const sessao = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const carregar = () => {
      voz.current = escolherVoz(window.speechSynthesis.getVoices());
    };
    carregar();
    window.speechSynthesis.addEventListener("voiceschanged", carregar);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", carregar);
      window.speechSynthesis.cancel();
    };
  }, []);

  const parar = useCallback(() => {
    sessao.current++;
    window.speechSynthesis.cancel();
    setAtivo(null);
  }, []);

  const falar = useCallback((id: string, texto: string) => {
    const s = window.speechSynthesis;
    s.cancel();
    const minhaSessao = ++sessao.current;
    const partes = trechos(texto);
    setAtivo(id);
    partes.forEach((parte, i) => {
      const u = new SpeechSynthesisUtterance(parte);
      u.lang = "pt-BR";
      if (voz.current) u.voice = voz.current;
      u.rate = 1.02;
      if (i === partes.length - 1) {
        u.onend = () => {
          if (sessao.current === minhaSessao) setAtivo(null);
        };
      }
      u.onerror = () => {
        if (sessao.current === minhaSessao) setAtivo(null);
      };
      s.speak(u);
    });
  }, []);

  return { suportado, ativo, falar, parar };
}
