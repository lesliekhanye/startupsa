begin;

alter table public.startup_submissions
  add column country text not null default 'South Africa'
    check (char_length(btrim(country)) between 2 and 80);
alter table public.startups
  add column country text not null default 'South Africa'
    check (char_length(btrim(country)) between 2 and 80);

create or replace function public.submit_startup(payload jsonb, request_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare caller uuid := startup_private.require_verified_user(); existing_owner uuid; logo text:=nullif(payload->>'logo_path','');
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(caller::text,1));
 select owner_id into existing_owner from public.startup_submissions where id=request_id;
 if found then
   if existing_owner=caller then return request_id; end if;
   raise exception 'Submission reference is unavailable.' using errcode='42501';
 end if;
 if (select count(*) from public.startup_submissions where owner_id=caller and created_at>now()-interval '24 hours')>=5 then raise exception 'You can submit up to five startups per day.'; end if;
 if jsonb_typeof(payload)<>'object' or payload is null then raise exception 'Invalid submission.'; end if;
 if (payload->>'year')::integer>extract(year from now())::integer then raise exception 'Founded year cannot be in the future.'; end if;
 if logo is not null and (logo<>request_id::text||'.png' or not exists(select 1 from storage.objects where bucket_id='startup-sa-logos' and name=logo and user_metadata->>'owner'=caller::text)) then raise exception 'Invalid logo upload.'; end if;
 insert into public.startup_submissions(id,owner_id,name,website,pitch,story,category,city,country,stage,founded_year,founder,logo_path)
 values(request_id,caller,btrim(payload->>'name'),btrim(payload->>'website'),btrim(payload->>'pitch'),btrim(payload->>'story'),payload->>'category',btrim(payload->>'city'),btrim(payload->>'country'),payload->>'stage',(payload->>'year')::integer,btrim(payload->>'founder'),logo);
 return request_id;
end;
$$;

drop function public.edit_startup_submission(uuid,jsonb,text);
create function public.edit_startup_submission(submission_id uuid,payload jsonb,new_logo_path text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := startup_private.require_verified_user(); item public.startup_submissions;
begin
 select * into item from public.startup_submissions where id=submission_id for update;
 if not found or item.owner_id<>caller then raise exception 'Startup not found.'; end if;
 if item.deleted_at is not null then raise exception 'This startup is in Trash. Ask an administrator to restore it first.'; end if;
 if coalesce(length(btrim(payload->>'name')),0) not between 2 and 80 or coalesce(length(btrim(payload->>'website')),0) not between 8 and 500 or btrim(payload->>'website') !~* '^https?://'
  or coalesce(length(btrim(payload->>'pitch')),0) not between 10 and 120 or coalesce(length(btrim(payload->>'story')),0) not between 50 and 3000
  or payload->>'category' not in ('Fintech','AI','SaaS','Climate / Energy','Health','Education','Commerce','Mobility','AgriTech','Developer Tools','Other')
  or coalesce(length(btrim(payload->>'city')),0) not between 2 and 80 or coalesce(length(btrim(payload->>'country')),0) not between 2 and 80 or payload->>'stage' not in ('Idea','Building','Launched','Revenue','Growing')
  or coalesce(payload->>'year','') !~ '^[0-9]{4}$' or (payload->>'year')::int not between 1900 and extract(year from now())::int
  or coalesce(length(btrim(payload->>'founder')),0) not between 2 and 120 then raise exception 'Please check the startup details.'; end if;
 if new_logo_path is not null and (new_logo_path !~ ('^'||submission_id::text||'/[0-9a-f-]{36}\.png$') or not exists(select 1 from storage.objects where bucket_id='startup-sa-logos' and name=new_logo_path and user_metadata->>'owner'=caller::text)) then raise exception 'Invalid logo upload.'; end if;
 update public.startup_submissions set name=btrim(payload->>'name'),website=btrim(payload->>'website'),pitch=btrim(payload->>'pitch'),story=btrim(payload->>'story'),category=payload->>'category',city=btrim(payload->>'city'),country=btrim(payload->>'country'),stage=payload->>'stage',founded_year=(payload->>'year')::int,founder=btrim(payload->>'founder'),logo_path=coalesce(new_logo_path,logo_path),status='pending',review_note=null,reviewed_by=null,reviewed_at=null where id=submission_id;
end $$;
revoke all on function public.edit_startup_submission(uuid,jsonb,text) from public,anon;
grant execute on function public.edit_startup_submission(uuid,jsonb,text) to authenticated;

create or replace function public.review_startup(submission_id uuid,decision text,note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := startup_private.require_verified_user(); item public.startup_submissions;
begin
 if not public.is_startup_moderator() then raise exception 'Administrator access required.'; end if;
 if decision not in ('approved','rejected') then raise exception 'Invalid review decision.'; end if;
 if decision='rejected' and length(btrim(note))<5 then raise exception 'Add a helpful rejection reason.'; end if;
 select * into item from public.startup_submissions where id=submission_id for update;
 if not found then raise exception 'Submission not found.'; end if;
 if item.status<>'pending' then raise exception 'This submission has already been reviewed.'; end if;
 if decision='approved' then
  insert into public.startups(id,slug,name,website,pitch,story,category,city,country,stage,founded_year,founder,logo_path)
  values(item.id,trim(both '-' from regexp_replace(lower(item.name),'[^a-z0-9]+','-','g'))||'-'||left(item.id::text,8),item.name,item.website,item.pitch,item.story,item.category,item.city,item.country,item.stage,item.founded_year,item.founder,item.logo_path)
  on conflict(id) do update set name=excluded.name,website=excluded.website,pitch=excluded.pitch,story=excluded.story,category=excluded.category,city=excluded.city,country=excluded.country,stage=excluded.stage,founded_year=excluded.founded_year,founder=excluded.founder,logo_path=excluded.logo_path;
 end if;
 update public.startup_submissions set status=decision,review_note=nullif(btrim(note),''),reviewed_at=now(),reviewed_by=caller where id=submission_id;
end $$;

create or replace function public.startup_admin_dashboard() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 perform startup_private.require_verified_user();
 if not public.is_startup_moderator() then raise exception 'Administrator access required'; end if;
 return jsonb_build_object(
  'accounts',(select count(*) from auth.users),
  'verifiedAccounts',(select count(*) from auth.users where email_confirmed_at is not null),
  'items',coalesce((
   select jsonb_agg((to_jsonb(s) - 'owner_id' - 'reviewed_by') || jsonb_build_object(
    'owner_email',u.email,'is_update',p.id is not null,
    'has_pending_changes',p.id is not null and (
      s.name is distinct from p.name or s.website is distinct from p.website or s.pitch is distinct from p.pitch or s.story is distinct from p.story
      or s.category is distinct from p.category or s.city is distinct from p.city or s.country is distinct from p.country
      or s.stage is distinct from p.stage or s.founded_year is distinct from p.founded_year or s.founder is distinct from p.founder or s.logo_path is distinct from p.logo_path
    ),
    'published_version',case when p.id is null then null else jsonb_build_object(
      'name',p.name,'website',p.website,'pitch',p.pitch,'story',p.story,'category',p.category,'city',p.city,'country',p.country,
      'stage',p.stage,'founded_year',p.founded_year,'founder',p.founder,'logo_path',p.logo_path
    ) end
   ) order by s.created_at desc)
   from public.startup_submissions s join auth.users u on u.id=s.owner_id left join public.startups p on p.id=s.id
  ),'[]'::jsonb)
 );
end $$;
revoke all on function public.startup_admin_dashboard() from public,anon;
grant execute on function public.startup_admin_dashboard() to authenticated;

notify pgrst,'reload schema';
commit;
