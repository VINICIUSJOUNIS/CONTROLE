// Abre um PDF guardado da Analise de Credito: confere o login e redireciona
// para uma URL assinada do bucket privado, valida por poucos minutos.
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DOCUMENTOS } from "@/lib/credito/documentos";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Faça login novamente.", { status: 401 });

  const caminho = new URL(request.url).searchParams.get("p") ?? "";
  if (!/^(analise|despesas)\/\d{4}-(\d{2}|T[1-4])\/[^/]+$/.test(caminho)) return new Response("Documento inválido.", { status: 400 });

  const { data, error } = await supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(caminho, 300);
  if (error || !data) return new Response("Documento não encontrado.", { status: 404 });
  return Response.redirect(data.signedUrl, 302);
}
