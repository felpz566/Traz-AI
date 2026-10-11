create policy "chat uploads: usuário lê seus arquivos"
on storage.objects for select to authenticated
using (bucket_id = 'chat-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat uploads: usuário envia seus arquivos"
on storage.objects for insert to authenticated
with check (bucket_id = 'chat-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "chat uploads: usuário apaga seus arquivos"
on storage.objects for delete to authenticated
using (bucket_id = 'chat-uploads' and (storage.foldername(name))[1] = auth.uid()::text);