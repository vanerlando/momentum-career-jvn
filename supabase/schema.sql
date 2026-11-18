create table if not exists public.momentum_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  record_type text not null,
  record_id text not null,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  primary key (user_id, record_type, record_id),
  constraint momentum_record_type_check check (record_type in ('activity','task','journal','daily_review','weekly_review','transaction','budget','target','settings'))
);
alter table public.momentum_records enable row level security;
revoke all on table public.momentum_records from anon;
grant select, insert, update, delete on table public.momentum_records to authenticated;
drop policy if exists "users manage own momentum records" on public.momentum_records;
create policy "users manage own momentum records" on public.momentum_records for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create or replace function public.touch_momentum_record() returns trigger language plpgsql security invoker set search_path = public as $$
begin new.updated_at = now();new.revision = old.revision + 1;return new;end;
$$;
drop trigger if exists touch_momentum_record on public.momentum_records;
create trigger touch_momentum_record before update on public.momentum_records for each row execute function public.touch_momentum_record();
