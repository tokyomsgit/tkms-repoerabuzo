-- 物件移動の共同編集（操作ログ + Realtime）
-- Supabase Dashboard → SQL Editor で実行

create table if not exists public.repoerabuzo_collab_moves (
  id bigserial primary key,
  property_name text not null,
  from_pane text not null check (from_pane in ('repo', 'koma')),
  client_id text not null,
  created_at timestamptz not null default now()
);

create index if not exists repoerabuzo_collab_moves_id_idx
  on public.repoerabuzo_collab_moves (id);

alter table public.repoerabuzo_collab_moves enable row level security;

drop policy if exists "repoerabuzo_collab_moves_select_anon" on public.repoerabuzo_collab_moves;
create policy "repoerabuzo_collab_moves_select_anon"
  on public.repoerabuzo_collab_moves for select to anon using (true);

drop policy if exists "repoerabuzo_collab_moves_insert_anon" on public.repoerabuzo_collab_moves;
create policy "repoerabuzo_collab_moves_insert_anon"
  on public.repoerabuzo_collab_moves for insert to anon with check (true);

-- Realtime 有効化（Publication に未追加の場合のみ）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'repoerabuzo_collab_moves'
  ) then
    alter publication supabase_realtime add table public.repoerabuzo_collab_moves;
  end if;
end $$;
