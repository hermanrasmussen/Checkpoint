-- Supabase / Postgres schema for Checkpoint

-- Enable UUID generation extension (Supabase usually has this enabled, but keep for completeness)
create extension if not exists "pgcrypto";

-- Games table: cached metadata from RAWG
create table if not exists public.games (
    id uuid primary key default gen_random_uuid(),
    api_id text not null unique,
    title text not null,
    cover_url text,
    grid_url text,
    hero_url text,
    developer text,
    release_year integer,
    genre text[] default '{}'::text[],
    api_source text not null default 'rawg'
);

-- Run this if you already have the games table:
-- alter table public.games add column if not exists grid_url text;
-- alter table public.games add column if not exists hero_url text;
-- alter table public.games add column if not exists developer text;

create index if not exists idx_games_api_id on public.games (api_id);

-- Library entries: per-user tracking data
do $$
begin
    if not exists (select 1 from pg_type where typname = 'library_status') then
        create type library_status as enum ('playing', 'completed', 'backlog', 'dropped');
    end if;
end$$;

create table if not exists public.library_entries (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    game_id uuid not null references public.games(id) on delete cascade,
    status library_status not null default 'backlog',
    rating numeric(2,1),
    added_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint rating_range check (rating is null or (rating >= 0.5 and rating <= 5.0))
);

-- One entry per user per game
create unique index if not exists idx_library_entries_user_game
    on public.library_entries (user_id, game_id);

create index if not exists idx_library_entries_user
    on public.library_entries (user_id);

create index if not exists idx_library_entries_game
    on public.library_entries (game_id);

-- User profiles table referencing Supabase auth.users
create table if not exists public.user_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    username text unique,
    avatar_id integer not null default 1,
    created_at timestamptz not null default now(),
    constraint avatar_id_range check (avatar_id >= 1 and avatar_id <= 10)
);

-- Run this if you already have the user_profiles table without avatar_id:
-- alter table public.user_profiles add column if not exists avatar_id integer not null default 1;
-- alter table public.user_profiles add constraint avatar_id_range check (avatar_id >= 1 and avatar_id <= 10);

-- Feed posts: shared library activity
create table if not exists public.feed_posts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null,
    library_entry_id uuid not null references public.library_entries(id) on delete cascade,
    caption text,
    created_at timestamptz not null default now(),
    constraint feed_posts_unique_entry unique (library_entry_id)
);

create index if not exists idx_feed_posts_created on public.feed_posts (created_at desc);
create index if not exists idx_feed_posts_user on public.feed_posts (user_id);

-- Feed upvotes: one per user per post
create table if not exists public.feed_upvotes (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    user_id uuid not null,
    created_at timestamptz not null default now(),
    constraint feed_upvotes_unique unique (post_id, user_id)
);

create index if not exists idx_feed_upvotes_post on public.feed_upvotes (post_id);

-- Feed comments
create table if not exists public.feed_comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.feed_posts(id) on delete cascade,
    user_id uuid not null,
    body text not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_feed_comments_post on public.feed_comments (post_id, created_at);

-- Follows: who follows whom
create table if not exists public.follows (
    follower_id uuid not null references auth.users(id) on delete cascade,
    following_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, following_id),
    constraint follows_no_self check (follower_id != following_id)
);

create index if not exists idx_follows_follower on public.follows (follower_id);
create index if not exists idx_follows_following on public.follows (following_id);

-- Collections: user-curated groups of games (playlist-like)
create table if not exists public.collections (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_collections_user on public.collections (user_id);

-- Collection items: games in a collection (many-to-many via junction)
create table if not exists public.collection_items (
    id uuid primary key default gen_random_uuid(),
    collection_id uuid not null references public.collections(id) on delete cascade,
    game_id uuid not null references public.games(id) on delete cascade,
    position integer not null default 0,
    added_at timestamptz not null default now(),
    constraint collection_items_unique unique (collection_id, game_id)
);

create index if not exists idx_collection_items_collection on public.collection_items (collection_id);

-- Migration: add collection support to feed_posts (run if you already have feed_posts)
alter table public.feed_posts add column if not exists post_type varchar(32) not null default 'library_entry';
alter table public.feed_posts add column if not exists collection_id uuid references public.collections(id) on delete cascade;
alter table public.feed_posts alter column library_entry_id drop not null;
-- Each collection can only be shared once (partial unique index; NULLs allowed)
create unique index if not exists idx_feed_posts_collection on public.feed_posts (collection_id) where collection_id is not null;

-- Migration: Steam integration
alter table public.user_profiles add column if not exists steam_id text;
alter table public.games add column if not exists steam_appid integer;

