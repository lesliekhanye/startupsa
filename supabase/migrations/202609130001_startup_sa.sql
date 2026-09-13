-- Startup SA: all writes are authorised in Postgres, not in the browser.
begin;
create schema if not exists startup_private;
revoke all on schema startup_private from public, anon, authenticated;

create table public.startup_moderators (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.startup_moderators enable row level security;
revoke all on public.startup_moderators from anon, authenticated;

create function public.is_startup_moderator() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.startup_moderators where user_id = auth.uid());
$$;

create function startup_private.require_verified_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null or not exists(select 1 from auth.users where id=caller and email_confirmed_at is not null) then
    raise exception 'Sign in with a verified email to continue.' using errcode='42501';
  end if;
  return caller;
end;
$$;

create table public.startup_submissions (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(btrim(name)) between 2 and 80),
  website text not null check(char_length(website)<=500 and website ~ '^https?://[^[:space:]/]+([/?#][^[:space:]]*)?$'),
  pitch text not null check(char_length(btrim(pitch)) between 10 and 120),
  story text not null check(char_length(btrim(story)) between 50 and 3000),
  category text not null check(category in ('Fintech','AI','SaaS','Climate / Energy','Health','Education','Commerce','Mobility','AgriTech','Developer Tools','Other')),
  city text not null check(char_length(btrim(city)) between 2 and 80),
  stage text not null check(stage in ('Idea','Building','Launched','Revenue','Growing')),
  founded_year integer not null check(founded_year between 1900 and 2100),
  founder text not null check(char_length(btrim(founder)) between 2 and 120),
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  review_note text check(char_length(review_note)<=1000),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index startup_submissions_owner_created on public.startup_submissions(owner_id,created_at desc);
create index startup_submissions_queue on public.startup_submissions(created_at) where status='pending';
alter table public.startup_submissions enable row level security;
revoke all on public.startup_submissions from anon, authenticated;
grant select on public.startup_submissions to authenticated;
create policy submissions_read on public.startup_submissions for select to authenticated
using(owner_id=auth.uid() or public.is_startup_moderator());

create table public.startups (
  id uuid primary key references public.startup_submissions(id) on delete cascade,
  slug text not null unique,
  name text not null,
  website text not null,
  pitch text not null,
  story text not null,
  category text not null,
  city text not null,
  stage text not null,
  founded_year integer not null,
  founder text not null,
  published_at timestamptz not null default now(),
  hidden boolean not null default false
);
create unique index startup_unique_website on public.startups(lower(rtrim(website,'/')));
alter table public.startups enable row level security;
revoke all on public.startups from anon, authenticated;
grant select on public.startups to anon,authenticated;
create policy startups_read on public.startups for select using(not hidden);

create table public.startup_votes (
  startup_id uuid not null references public.startups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(startup_id,user_id)
);
create index startup_votes_active on public.startup_votes(startup_id,created_at) where active;
create index startup_votes_user_updated on public.startup_votes(user_id,updated_at);
alter table public.startup_votes enable row level security;
revoke all on public.startup_votes from anon,authenticated;
grant select on public.startup_votes to authenticated;
create policy votes_read_own on public.startup_votes for select to authenticated using(user_id=auth.uid());

create function public.submit_startup(payload jsonb, request_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare caller uuid := startup_private.require_verified_user(); existing_owner uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,1));
  select owner_id into existing_owner from public.startup_submissions where id=request_id;
  if found then
    if existing_owner=caller then return request_id; end if;
    raise exception 'Submission reference is unavailable.' using errcode='42501';
  end if;
  if (select count(*) from public.startup_submissions where owner_id=caller and created_at>now()-interval '24 hours')>=5 then
    raise exception 'You can submit up to five startups per day.';
  end if;
  if jsonb_typeof(payload)<>'object' or payload is null then raise exception 'Invalid submission.'; end if;
  if (payload->>'year')::integer > extract(year from now())::integer then raise exception 'Founded year cannot be in the future.'; end if;
  insert into public.startup_submissions(id,owner_id,name,website,pitch,story,category,city,stage,founded_year,founder)
  values(request_id,caller,btrim(payload->>'name'),btrim(payload->>'website'),btrim(payload->>'pitch'),btrim(payload->>'story'),payload->>'category',btrim(payload->>'city'),payload->>'stage',(payload->>'year')::integer,btrim(payload->>'founder'));
  return request_id;
end;
$$;

create function public.review_startup(submission_id uuid, decision text, note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := startup_private.require_verified_user(); item public.startup_submissions;
begin
  if not public.is_startup_moderator() then raise exception 'Moderator access required.' using errcode='42501'; end if;
  if decision not in ('approved','rejected') or decision is null then raise exception 'Choose approve or reject.'; end if;
  if decision='rejected' and char_length(btrim(coalesce(note,'')))<5 then raise exception 'Add a reason for the founder.'; end if;
  select * into item from public.startup_submissions where id=submission_id for update;
  if not found then raise exception 'Submission not found.'; end if;
  if item.status<>'pending' then raise exception 'This submission has already been reviewed.'; end if;
  if decision='approved' then
    insert into public.startups(id,slug,name,website,pitch,story,category,city,stage,founded_year,founder)
    values(item.id,trim(both '-' from regexp_replace(lower(item.name),'[^a-z0-9]+','-','g'))||'-'||left(item.id::text,8),item.name,item.website,item.pitch,item.story,item.category,item.city,item.stage,item.founded_year,item.founder);
  end if;
  update public.startup_submissions set status=decision,review_note=nullif(btrim(note),''),reviewed_at=now(),reviewed_by=caller where id=submission_id;
end;
$$;

create function public.set_startup_vote(target_id uuid, desired_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := startup_private.require_verified_user();
begin
  if desired_active is null then raise exception 'Choose a vote state.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,2));
  if not exists(select 1 from public.startups where id=target_id and not hidden) then raise exception 'Startup is not available.'; end if;
  if desired_active and (select count(*) from public.startup_votes where user_id=caller and startup_id<>target_id and updated_at>now()-interval '1 hour')>=60 then
    raise exception 'Voting too quickly. Try again later.';
  end if;
  insert into public.startup_votes(startup_id,user_id,active) values(target_id,caller,desired_active)
  on conflict(startup_id,user_id) do update set active=excluded.active,updated_at=now()
  where public.startup_votes.active is distinct from excluded.active;
  -- created_at never changes on reactivation; toggling cannot refresh an old vote.
end;
$$;

create function public.startup_leaderboard() returns jsonb
language sql stable security definer set search_path = '' as $$
  with totals as (
    select s.*,count(v.user_id) filter(where v.active and v.created_at>=date_trunc('day',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg') as today_votes,
      count(v.user_id) filter(where v.active and v.created_at>=date_trunc('week',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg') as week_votes,
      count(v.user_id) filter(where v.active and v.created_at>=date_trunc('month',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg') as month_votes,
      count(v.user_id) filter(where v.active) as total_votes,
      coalesce(bool_or(v.user_id=auth.uid() and v.active),false) as my_vote
    from public.startups s left join public.startup_votes v on v.startup_id=s.id
    where not s.hidden group by s.id
  )
  select coalesce(jsonb_agg(to_jsonb(t)-'hidden' order by week_votes desc,published_at desc,id),'[]'::jsonb) from totals t;
$$;

revoke all on function startup_private.require_verified_user() from public,anon,authenticated;
revoke all on function public.is_startup_moderator() from public,anon;
revoke all on function public.submit_startup(jsonb,uuid) from public,anon;
revoke all on function public.review_startup(uuid,text,text) from public,anon;
revoke all on function public.set_startup_vote(uuid,boolean) from public,anon;
revoke all on function public.startup_leaderboard() from public;
grant execute on function public.is_startup_moderator(),public.submit_startup(jsonb,uuid),public.review_startup(uuid,text,text),public.set_startup_vote(uuid,boolean) to authenticated;
grant execute on function public.startup_leaderboard() to anon,authenticated;
grant all on public.startup_moderators,public.startup_submissions,public.startups,public.startup_votes to service_role;

create table startup_private.email_attempts (
  email_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index email_attempts_email_time on startup_private.email_attempts(email_hash,created_at);
create index email_attempts_ip_time on startup_private.email_attempts(ip_hash,created_at);
create function public.reserve_startup_email(email_hash text,ip_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if email_hash is null or ip_hash is null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(email_hash,3));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ip_hash,4));
  if exists(select 1 from startup_private.email_attempts a where a.email_hash=reserve_startup_email.email_hash and a.created_at>now()-interval '60 seconds')
     or (select count(*) from startup_private.email_attempts a where a.email_hash=reserve_startup_email.email_hash and a.created_at>now()-interval '1 hour')>=5
     or (select count(*) from startup_private.email_attempts a where a.ip_hash=reserve_startup_email.ip_hash and a.created_at>now()-interval '10 minutes')>=10 then
    return false;
  end if;
  delete from startup_private.email_attempts where created_at<now()-interval '24 hours';
  insert into startup_private.email_attempts(email_hash,ip_hash) values(email_hash,ip_hash);
  return true;
end;
$$;
revoke all on function public.reserve_startup_email(text,text) from public,anon,authenticated;
grant execute on function public.reserve_startup_email(text,text) to service_role;
commit;
