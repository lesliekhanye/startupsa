begin;
create table public.startup_guest_votes(
 startup_id uuid not null references public.startups(id) on delete cascade,
 browser_key text not null check(browser_key ~ '^[0-9a-f]{64}$'),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(startup_id,browser_key)
);
alter table public.startup_guest_votes enable row level security;
revoke all on public.startup_guest_votes from public,anon,authenticated;
grant all on public.startup_guest_votes to service_role;
create index startup_guest_active on public.startup_guest_votes(startup_id,created_at) where active;
create table startup_private.vote_limits(key text primary key,hour timestamptz not null,hits integer not null);

alter function public.startup_leaderboard() rename to startup_account_leaderboard;
create function public.startup_leaderboard() returns jsonb
language sql stable security definer set search_path='' as $$
 with guests as(
 select startup_id,count(*) filter(where active) as total_votes,
 count(*) filter(where active and created_at>=date_trunc('day',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg') as today_votes,
 count(*) filter(where active and created_at>=date_trunc('week',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg') as week_votes,
 count(*) filter(where active and created_at>=date_trunc('month',now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg') as month_votes
 from public.startup_guest_votes group by startup_id
 ), merged as(
 select item||jsonb_build_object('total_votes',(item->>'total_votes')::bigint+coalesce(g.total_votes,0),'today_votes',(item->>'today_votes')::bigint+coalesce(g.today_votes,0),'week_votes',(item->>'week_votes')::bigint+coalesce(g.week_votes,0),'month_votes',(item->>'month_votes')::bigint+coalesce(g.month_votes,0)) as item
 from jsonb_array_elements(public.startup_account_leaderboard()) item left join guests g on g.startup_id=(item->>'id')::uuid
 ) select coalesce(jsonb_agg(item order by (item->>'week_votes')::bigint desc,item->>'published_at' desc,item->>'id'),'[]'::jsonb) from merged;
$$;
create function public.startup_browser_board(browser_key text,legacy_user uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item||jsonb_build_object('my_vote',
 exists(select 1 from public.startup_guest_votes g where g.startup_id=(item->>'id')::uuid and g.browser_key=startup_browser_board.browser_key and g.active)
 or exists(select 1 from public.startup_votes v where v.startup_id=(item->>'id')::uuid and v.user_id=legacy_user and v.active))),'[]'::jsonb)
 from jsonb_array_elements(public.startup_leaderboard()) item;
$$;
create function public.set_startup_browser_vote(target_id uuid,browser_key text,ip_key text,desired_active boolean,legacy_user uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare browser_count integer;ip_count integer;old_date timestamptz;existing boolean;
begin
 if browser_key is null or browser_key !~ '^[0-9a-f]{64}$' or ip_key is null or ip_key !~ '^[0-9a-f]{64}$' or desired_active is null then raise exception 'Invalid vote.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(browser_key,9));
 if legacy_user is not null then perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(legacy_user::text,2)); end if;
 if not exists(select 1 from public.startups where id=target_id and not hidden) then raise exception 'Startup is not available.'; end if;
 select active into existing from public.startup_guest_votes g where g.startup_id=target_id and g.browser_key=set_startup_browser_vote.browser_key;
 select created_at into old_date from public.startup_votes where startup_id=target_id and user_id=legacy_user and active;
 if coalesce(existing,false)=desired_active and old_date is null then return; end if;
 delete from startup_private.vote_limits where hour<now()-interval '24 hours';
 insert into startup_private.vote_limits as l values('browser:'||browser_key,date_trunc('hour',now()),1)
 on conflict(key) do update set hour=excluded.hour,hits=case when l.hour=excluded.hour then l.hits+1 else 1 end returning hits into browser_count;
 insert into startup_private.vote_limits as l values('ip:'||ip_key,date_trunc('hour',now()),1)
 on conflict(key) do update set hour=excluded.hour,hits=case when l.hour=excluded.hour then l.hits+1 else 1 end returning hits into ip_count;
 if browser_count>60 or ip_count>200 then raise exception 'Too many votes. Please try again later.' using errcode='P0002'; end if;
 insert into public.startup_guest_votes as g(startup_id,browser_key,active,created_at) values(target_id,browser_key,desired_active,coalesce(old_date,now()))
 on conflict on constraint startup_guest_votes_pkey do update set active=excluded.active,updated_at=now(),created_at=least(g.created_at,excluded.created_at);
 -- Move a known account vote into this browser without counting it twice.
 update public.startup_votes set active=false,updated_at=now() where startup_id=target_id and user_id=legacy_user and active;
end;
$$;
revoke all on function public.startup_browser_board(text,uuid),public.set_startup_browser_vote(uuid,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function public.startup_browser_board(text,uuid),public.set_startup_browser_vote(uuid,text,text,boolean,uuid) to service_role;
revoke all on function public.startup_leaderboard() from public;
grant execute on function public.startup_leaderboard() to anon,authenticated,service_role;
notify pgrst,'reload schema';
commit;
