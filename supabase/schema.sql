create table if not exists public.strava_connections (
  id integer primary key default 1 check (id = 1),
  athlete_id bigint,
  access_token text not null,
  refresh_token text not null,
  expires_at bigint,
  scope text,
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_activities (
  strava_id bigint primary key,
  athlete_id bigint not null,
  name text,
  sport_type text,
  start_date timestamptz,
  start_date_local timestamptz,
  distance_m numeric,
  moving_time_s integer,
  elapsed_time_s integer,
  total_elevation_gain_m numeric,
  average_speed_mps numeric,
  max_speed_mps numeric,
  average_heartrate numeric,
  max_heartrate numeric,
  average_cadence numeric,
  average_watts numeric,
  kilojoules numeric,
  suffer_score numeric,
  raw_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.strava_webhook_events (
  event_id text primary key,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- This database is accessed only by the server-side service role key.
-- Do not expose that key in the webapp.
