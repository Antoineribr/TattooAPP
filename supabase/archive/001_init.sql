-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- pour lat/lng si besoin futur

-- ─── Profiles ─────────────────────────────────────────────────────────────────
create type user_role as enum ('client', 'artist');

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'client',
  display_name  text not null default '',
  username      text not null unique,
  avatar_url    text,
  bio           text,
  city          text,
  lat           double precision,
  lng           double precision,
  instagram     text,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Lecture publique pour tous les authentifiés
create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');

-- Modification uniquement par le propriétaire
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id);

-- Insertion uniquement par le propriétaire (trigger crée le profil à l'inscription)
create policy "profiles_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- ─── Posts ────────────────────────────────────────────────────────────────────
create type media_type as enum ('video', 'image');

create table public.posts (
  id            uuid primary key default uuid_generate_v4(),
  artist_id     uuid not null references public.profiles(id) on delete cascade,
  media_url     text not null,
  media_type    media_type not null default 'image',
  thumbnail_url text,
  caption       text,
  style_tags    text[] not null default '{}',
  city          text,
  created_at    timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts_select" on public.posts
  for select using (auth.role() = 'authenticated');

create policy "posts_insert" on public.posts
  for insert with check (auth.uid() = artist_id);

create policy "posts_delete" on public.posts
  for delete using (auth.uid() = artist_id);

-- ─── Likes ────────────────────────────────────────────────────────────────────
create table public.likes (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.likes enable row level security;

create policy "likes_select" on public.likes
  for select using (auth.role() = 'authenticated');

create policy "likes_insert" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "likes_delete" on public.likes
  for delete using (auth.uid() = user_id);

-- ─── Saves ────────────────────────────────────────────────────────────────────
create table public.saves (
  id          uuid primary key default uuid_generate_v4(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (post_id, user_id)
);

alter table public.saves enable row level security;

create policy "saves_select" on public.saves
  for select using (auth.uid() = user_id);

create policy "saves_insert" on public.saves
  for insert with check (auth.uid() = user_id);

create policy "saves_delete" on public.saves
  for delete using (auth.uid() = user_id);

-- ─── Follows ──────────────────────────────────────────────────────────────────
create table public.follows (
  id           uuid primary key default uuid_generate_v4(),
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  artist_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (follower_id, artist_id)
);

alter table public.follows enable row level security;

create policy "follows_select" on public.follows
  for select using (auth.role() = 'authenticated');

create policy "follows_insert" on public.follows
  for insert with check (auth.uid() = follower_id);

create policy "follows_delete" on public.follows
  for delete using (auth.uid() = follower_id);

-- ─── Conversations ────────────────────────────────────────────────────────────
create table public.conversations (
  id         uuid primary key default uuid_generate_v4(),
  client_id  uuid not null references public.profiles(id) on delete cascade,
  artist_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (client_id, artist_id)
);

alter table public.conversations enable row level security;

create policy "conversations_select" on public.conversations
  for select using (auth.uid() = client_id or auth.uid() = artist_id);

create policy "conversations_insert" on public.conversations
  for insert with check (auth.uid() = client_id);

-- ─── Messages ─────────────────────────────────────────────────────────────────
create table public.messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  body             text not null,
  created_at       timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Seuls les deux participants voient les messages
create policy "messages_select" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.client_id = auth.uid() or c.artist_id = auth.uid())
    )
  );

create policy "messages_insert" on public.messages
  for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.client_id = auth.uid() or c.artist_id = auth.uid())
    )
  );

-- ─── Trigger : crée un profil à l'inscription ─────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Vue utilitaire : posts avec compteur de likes ───────────────────────────
create or replace view public.posts_with_counts as
select
  p.*,
  pr.display_name,
  pr.username,
  pr.avatar_url,
  pr.city as artist_city,
  count(distinct l.id)::int as likes_count,
  count(distinct s.id)::int as saves_count
from public.posts p
join public.profiles pr on pr.id = p.artist_id
left join public.likes l on l.post_id = p.id
left join public.saves s on s.post_id = p.id
group by p.id, pr.id;
