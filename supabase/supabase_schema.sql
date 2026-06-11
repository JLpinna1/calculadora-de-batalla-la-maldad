-- Battle Lab 1914 · Etapa 29
-- Esquema sugerido para cuando se conecte Supabase real.
-- Esta etapa usa almacenamiento local, pero estas tablas dejan preparada la migración.

create table if not exists public.player_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  country text,
  role text default 'General',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mode text default 'basic',
  snapshot jsonb not null,
  visibility text default 'private' check (visibility in ('private','public','shared')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.simulation_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid references public.scenarios(id) on delete set null,
  winner text,
  result jsonb not null,
  scenario_snapshot jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.scenario_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, scenario_id)
);

alter table public.player_profiles enable row level security;
alter table public.scenarios enable row level security;
alter table public.simulation_history enable row level security;
alter table public.scenario_favorites enable row level security;

create policy "profiles_select_own" on public.player_profiles
for select using (auth.uid() = id);

create policy "profiles_update_own" on public.player_profiles
for update using (auth.uid() = id);

create policy "profiles_insert_own" on public.player_profiles
for insert with check (auth.uid() = id);

create policy "scenarios_select_own_or_public" on public.scenarios
for select using (auth.uid() = user_id or visibility = 'public');

create policy "scenarios_insert_own" on public.scenarios
for insert with check (auth.uid() = user_id);

create policy "scenarios_update_own" on public.scenarios
for update using (auth.uid() = user_id);

create policy "scenarios_delete_own" on public.scenarios
for delete using (auth.uid() = user_id);

create policy "history_own" on public.simulation_history
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "favorites_own" on public.scenario_favorites
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- Recomendación para Etapa 23:
-- 1. Crear proyecto en Supabase.
-- 2. Ejecutar este SQL en SQL Editor.
-- 3. Activar Auth > Email.
-- 4. Copiar Project URL y anon public key a la app.
-- 5. Nunca usar service_role key en el navegador.


-- Etapa 24:
-- Las tablas existentes ya soportan escenarios privados, públicos y compartidos.
-- Campo usado:
-- scenarios.visibility in ('private','public','shared')
--
-- Favorites:
-- scenario_favorites permite marcar favoritos por usuario.
--
-- Para mejorar búsquedas más adelante:
create index if not exists idx_scenarios_visibility_created on public.scenarios(visibility, created_at desc);
create index if not exists idx_scenarios_user_created on public.scenarios(user_id, created_at desc);
create index if not exists idx_favorites_user_created on public.scenario_favorites(user_id, created_at desc);


-- Etapa 25 - Historial avanzado
-- Agrega nota opcional al historial si la tabla ya existe.
alter table public.simulation_history
add column if not exists note text;

create index if not exists idx_history_user_created on public.simulation_history(user_id, created_at desc);
create index if not exists idx_history_winner_created on public.simulation_history(winner, created_at desc);


-- Etapa 26 - Compartir escenarios
-- La visibilidad pública usa scenarios.visibility = 'public'.
-- Para búsqueda rápida de escenarios públicos:
create index if not exists idx_scenarios_public_name
on public.scenarios using gin (to_tsvector('simple', coalesce(name,'')))
where visibility = 'public';

-- En esta etapa los links compartidos también pueden ser JSON/código local battlelab://
-- No requiere tabla adicional obligatoria.


-- Etapa 27 - Panel comunitario
-- Usa escenarios públicos:
-- scenarios.visibility = 'public'
--
-- Índices recomendados para feed público:
create index if not exists idx_scenarios_public_created
on public.scenarios(created_at desc)
where visibility = 'public';

create index if not exists idx_scenarios_public_name_lower
on public.scenarios(lower(name))
where visibility = 'public';


-- Etapa 28 - Estadísticas de jugador
-- No requiere tablas nuevas obligatorias.
-- Las estadísticas se calculan desde:
-- scenarios
-- simulation_history
-- scenario_favorites

-- Vista opcional para resumen rápido por usuario:
create or replace view public.player_activity_summary as
select
  p.id as user_id,
  p.username,
  count(distinct s.id) as scenario_count,
  count(distinct h.id) as history_count,
  count(distinct f.id) as favorite_count
from public.player_profiles p
left join public.scenarios s on s.user_id = p.id
left join public.simulation_history h on h.user_id = p.id
left join public.scenario_favorites f on f.user_id = p.id
group by p.id, p.username;


-- Etapa 29 - Producción
-- No requiere tablas nuevas obligatorias.
-- Recomendación:
-- Revisar RLS, usar solo anon public key en frontend y mantener service_role fuera del navegador.
