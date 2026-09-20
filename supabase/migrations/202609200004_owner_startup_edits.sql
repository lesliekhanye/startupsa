begin;

create function public.edit_startup_submission(submission_id uuid,payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare caller uuid := startup_private.require_verified_user(); item public.startup_submissions;
begin
 select * into item from public.startup_submissions where id=submission_id for update;
 if not found or item.owner_id<>caller then raise exception 'Startup not found.'; end if;
 if item.deleted_at is not null then raise exception 'This startup is in Trash. Ask an administrator to restore it first.'; end if;
 if coalesce(length(btrim(payload->>'name')),0) not between 2 and 80
  or coalesce(length(btrim(payload->>'website')),0) not between 8 and 500
  or btrim(payload->>'website') !~* '^https?://'
  or coalesce(length(btrim(payload->>'pitch')),0) not between 10 and 120
  or coalesce(length(btrim(payload->>'story')),0) not between 50 and 3000
  or payload->>'category' not in ('Fintech','AI','SaaS','Climate / Energy','Health','Education','Commerce','Mobility','AgriTech','Developer Tools','Other')
  or coalesce(length(btrim(payload->>'city')),0) not between 2 and 80
  or payload->>'stage' not in ('Idea','Building','Launched','Revenue','Growing')
  or coalesce(payload->>'year','') !~ '^[0-9]{4}$'
  or (payload->>'year')::int not between 1900 and extract(year from now())::int
  or coalesce(length(btrim(payload->>'founder')),0) not between 2 and 120 then
  raise exception 'Please check the startup details.';
 end if;
 update public.startup_submissions set
  name=btrim(payload->>'name'),website=btrim(payload->>'website'),pitch=btrim(payload->>'pitch'),story=btrim(payload->>'story'),
  category=payload->>'category',city=btrim(payload->>'city'),stage=payload->>'stage',founded_year=(payload->>'year')::int,founder=btrim(payload->>'founder'),
  status='pending',review_note=null,reviewed_by=null,reviewed_at=null
 where id=submission_id;
end $$;
revoke all on function public.edit_startup_submission(uuid,jsonb) from public,anon;
grant execute on function public.edit_startup_submission(uuid,jsonb) to authenticated;

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
  insert into public.startups(id,slug,name,website,pitch,story,category,city,stage,founded_year,founder)
  values(item.id,trim(both '-' from regexp_replace(lower(item.name),'[^a-z0-9]+','-','g'))||'-'||left(item.id::text,8),item.name,item.website,item.pitch,item.story,item.category,item.city,item.stage,item.founded_year,item.founder)
  on conflict(id) do update set name=excluded.name,website=excluded.website,pitch=excluded.pitch,story=excluded.story,
   category=excluded.category,city=excluded.city,stage=excluded.stage,founded_year=excluded.founded_year,founder=excluded.founder;
 end if;
 update public.startup_submissions set status=decision,review_note=nullif(btrim(note),''),reviewed_at=now(),reviewed_by=caller where id=submission_id;
end $$;
revoke all on function public.review_startup(uuid,text,text) from public,anon;
grant execute on function public.review_startup(uuid,text,text) to authenticated;

commit;
