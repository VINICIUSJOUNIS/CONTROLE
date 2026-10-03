"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Leitura em voz alta pelo sintetizador de voz do navegador (Web Speech API).
// As vozes mais naturais sao as neurais: "Microsoft Francisca/Antonio/Thalita
// Online (Natural)" no Edge e "Google portugues do Brasil" no Chrome. As vozes
// instaladas no Windows (ex.: "Microsoft Maria") sao as mais roboticas.
const CHAVE_VOZ = "hedge-noticias-voz";
const CHAVE_VELOCIDADE = "hedge-noticias-velocidade";

export type OpcaoVoz = { id: string; nome: string; natural: boolean };

const ehPt = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-").startsWith("pt");
const ehBr = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace("_", "-").startsWith("pt-br");

// Pontuacao de naturalidade: neurais primeiro, depois as online, depois as locais.
function pontos(v: SpeechSynthesisVoice) {
  let p = 0;
  if (/natural|neural/i.test(v.name)) p += 100;
  if (/online|google/i.test(v.name) || !v.localService) p += 40;
  if (ehBr(v)) p += 20;
  if (/francisca|antonio|thalita/i.test(v.name)) p += 10;
  return p;
}

function nomeAmigavel(v: SpeechSynthesisVoice) {
  return v.name
    .replace(/^Microsoft\s+/i, "")
    .replace(/\s*-\s*Portuguese \((Brazil|Portugal)\)/i, (_, pais) => (pais === "Brazil" ? " (Brasil)" : " (Portugal)"))
    .replace(/\s*\(Natural\)/i, "")
    .trim();
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

function lerPreferencia(chave: string) {
  try {
    return window.localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravarPreferencia(chave: string, valor: string) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    // navegador sem armazenamento local: a escolha vale so nesta visita
  }
}

export function useLeitorVoz() {
  // No servidor (e na primeira renderizacao) fica false; no navegador, se ha sintetizador.
  const suportado = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false
  );
  const [ativo, setAtivo] = useState<string | null>(null);
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([]);
  const [vozId, setVozIdState] = useState<string | null>(null);
  const [velocidade, setVelocidadeState] = useState(1);
  const sessao = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const carregar = () => {
      const pt = window.speechSynthesis
        .getVoices()
        .filter(ehPt)
        .sort((a, b) => pontos(b) - pontos(a) || a.name.localeCompare(b.name));
      setVozes(pt);
      const salva = lerPreferencia(CHAVE_VOZ);
      setVozIdState(pt.find((v) => v.voiceURI === salva)?.voiceURI ?? pt[0]?.voiceURI ?? null);
      const vel = Number(lerPreferencia(CHAVE_VELOCIDADE));
      if (vel >= 0.7 && vel <= 1.5) setVelocidadeState(vel);
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

  const falar = useCallback(
    (id: string, texto: string) => {
      const s = window.speechSynthesis;
      s.cancel();
      const minhaSessao = ++sessao.current;
      const voz = vozes.find((v) => v.voiceURI === vozId) ?? null;
      const partes = trechos(texto);
      setAtivo(id);
      partes.forEach((parte, i) => {
        const u = new SpeechSynthesisUtterance(parte);
        u.lang = voz?.lang ?? "pt-BR";
        if (voz) u.voice = voz;
        u.rate = velocidade;
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
    },
    [vozes, vozId, velocidade]
  );

  const setVozId = useCallback((id: string) => {
    setVozIdState(id);
    gravarPreferencia(CHAVE_VOZ, id);
  }, []);

  const setVelocidade = useCallback((v: number) => {
    setVelocidadeState(v);
    gravarPreferencia(CHAVE_VELOCIDADE, String(v));
  }, []);

  const opcoes: OpcaoVoz[] = vozes.map((v) => ({
    id: v.voiceURI,
    nome: nomeAmigavel(v),
    natural: /natural|neural|google/i.test(v.name),
  }));
  const temNatural = opcoes.some((o) => o.natural);

  return { suportado, ativo, falar, parar, opcoes, vozId, setVozId, velocidade, setVelocidade, temNatural };
}
