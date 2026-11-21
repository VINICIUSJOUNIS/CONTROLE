"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AlertCircle, Clock, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registrarAtividade } from "@/components/auth/inatividade";

// Aviso quando a sessao foi encerrada pelo controle de inatividade.
function AvisoInatividade() {
  const params = useSearchParams();
  if (params.get("motivo") !== "inatividade") return null;
  return (
    <div className="mb-5 flex gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-3.5 py-3 text-xs leading-relaxed text-warning">
      <Clock size={16} className="mt-0.5 shrink-0" />
      <span>Sessão encerrada após 30 minutos sem uso. Entre novamente com sua senha.</span>
    </div>
  );
}

// Tela de entrada. A foto da lavoura (com a marca Nayme aplicada no centro da
// arte) ocupa a tela inteira, num unico plano - antes ela aparecia recortada na
// metade esquerda e repetida, escurecida, atras do formulario. A imagem fica
// mais larga que a tela e deslocada para a esquerda, para a marca ficar inteira
// do lado oposto ao cartao de acesso (a partir de 1280px; abaixo disso a foto
// fica desfocada e o cartao centralizado, sem disputar espaco com a marca). Sempre no tema escuro (classe "dark"),
// que e o que combina com a foto.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("E-mail ou senha inválidos.");
      return;
    }

    // Novo login: o prazo de inatividade recomeça agora.
    registrarAtividade();
    router.push("/inicio");
    router.refresh();
  }

  return (
    <div className="dark relative isolate flex min-h-screen overflow-hidden bg-[#040e13] text-foreground">
      {/* Foto: no computador, mais larga que a tela e puxada para a esquerda
          (marca inteira a esquerda do cartao); no celular, centralizada e
          desfocada atras do cartao. */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <div className="absolute inset-y-0 left-0 w-full xl:-left-[26%] xl:w-[126%]">
          <Image
            src="/nayme-watermark.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1280px) 126vw, 100vw"
            className="object-cover max-xl:scale-125 max-xl:blur-md"
          />
        </div>
      </div>
      {/* Peliculas: escurece o lado do cartao e as bordas, sem apagar a marca. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-linear-to-b from-black/30 via-transparent to-black/60 xl:bg-linear-to-r xl:from-transparent xl:via-[#040e13]/20 xl:to-[#040e13]/85"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[#040e13]/70 xl:hidden" />

      <main className="flex w-full items-center justify-center px-5 py-10 xl:justify-end xl:pr-[6vw] 2xl:pr-[9vw]">
        <div className="w-full max-w-[400px]">
          <div className="rounded-3xl border border-white/10 bg-[#0b1f26]/70 p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/5 backdrop-blur-2xl sm:p-9">
            <div className="flex items-center gap-3.5">
              <Image
                src="/nayme-logo.png"
                alt="Nayme"
                width={48}
                height={48}
                className="rounded-full ring-2 ring-white/10"
                priority
              />
              <div>
                <p className="text-base font-semibold tracking-wide text-white">Controle</p>
                <p className="text-[11px] tracking-wider text-muted">Nayme Exportadora de Café</p>
              </div>
            </div>

            <div className="mt-8 mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-white">Bem-vindo</h1>
              <p className="mt-1 text-xs text-muted">Entre com seu e-mail e senha para acessar o sistema.</p>
            </div>

            <Suspense>
              <AvisoInatividade />
            </Suspense>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@nayme.com.br"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-3 text-sm normal-case text-white outline-none transition placeholder:normal-case placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="senha" className="mb-1.5 block text-[11px] font-semibold tracking-wider text-muted">
                  Senha
                </label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/25 pl-10 pr-11 text-sm normal-case text-white outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/15"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition hover:bg-white/5 hover:text-white"
                  >
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
                  <AlertCircle size={15} className="shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#3fc6ce] to-[#2aa9b2] text-sm font-semibold tracking-wider text-[#03191c] shadow-lg shadow-[#3fc6ce]/20 transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-[10px] tracking-wider text-muted/80">
              <ShieldCheck size={12} />
              Acesso restrito a usuários autorizados
            </p>
          </div>

          <p className="mt-6 text-center text-[10px] tracking-wider text-white/40">
            © {new Date().getFullYear()} Nayme Exportadora de Café · Manhuaçu-MG
          </p>
        </div>
      </main>
    </div>
  );
}
