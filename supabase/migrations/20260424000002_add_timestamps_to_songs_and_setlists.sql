alter table public.songs
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.setlists
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists songs_set_updated_at on public.songs;
create trigger songs_set_updated_at before update on public.songs
  for each row execute function public.set_updated_at();

drop trigger if exists setlists_set_updated_at on public.setlists;
create trigger setlists_set_updated_at before update on public.setlists
  for each row execute function public.set_updated_at();
