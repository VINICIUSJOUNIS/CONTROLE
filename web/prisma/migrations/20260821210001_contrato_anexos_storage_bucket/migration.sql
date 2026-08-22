-- Bucket publico do Supabase Storage para os anexos de contrato (contrato
-- assinado, amostras, documentos de embarque, etc). Publico so para leitura
-- via URL direta; escrita continua restrita por policy a usuarios logados.
insert into storage.buckets (id, name, public)
values ('contrato-anexos', 'contrato-anexos', true)
on conflict (id) do nothing;

create policy "Usuarios logados podem enviar anexos de contrato"
on storage.objects for insert
to authenticated
with check (bucket_id = 'contrato-anexos');

create policy "Qualquer um pode ler anexos de contrato"
on storage.objects for select
to public
using (bucket_id = 'contrato-anexos');

create policy "Usuarios logados podem excluir anexos de contrato"
on storage.objects for delete
to authenticated
using (bucket_id = 'contrato-anexos');
