-- Analise de Credito: guarda os PDFs enviados (balanco/DRE e balancete) num
-- bucket privado do Supabase Storage, para consulta posterior. A coluna
-- documentos tem o caminho de cada arquivo no bucket, na ordem de arquivos.
ALTER TABLE "analises_credito" ADD COLUMN "documentos" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "balancetes_despesas" ADD COLUMN "documentos" TEXT[] DEFAULT ARRAY[]::TEXT[];

insert into storage.buckets (id, name, public)
values ('credito-documentos', 'credito-documentos', false)
on conflict (id) do nothing;

create policy "Usuarios logados podem enviar documentos de credito"
on storage.objects for insert
to authenticated
with check (bucket_id = 'credito-documentos');

create policy "Usuarios logados podem ler documentos de credito"
on storage.objects for select
to authenticated
using (bucket_id = 'credito-documentos');

create policy "Usuarios logados podem excluir documentos de credito"
on storage.objects for delete
to authenticated
using (bucket_id = 'credito-documentos');
