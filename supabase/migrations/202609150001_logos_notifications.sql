begin;
alter table public.startup_submissions add column logo_path text;
alter table public.startups add column logo_path text;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('startup-sa-logos','startup-sa-logos',false,1048576,array['image/png']);

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
 insert into public.startup_submissions(id,owner_id,name,website,pitch,story,category,city,stage,founded_year,founder,logo_path)
 values(request_id,caller,btrim(payload->>'name'),btrim(payload->>'website'),btrim(payload->>'pitch'),btrim(payload->>'story'),payload->>'category',btrim(payload->>'city'),payload->>'stage',(payload->>'year')::integer,btrim(payload->>'founder'),logo);
 return request_id;
end;
$$;
create function startup_private.copy_logo() returns trigger language plpgsql security definer set search_path='' as $$
begin select logo_path into new.logo_path from public.startup_submissions where id=new.id; return new; end;
$$;
create trigger startup_copy_logo before insert on public.startups for each row execute function startup_private.copy_logo();

create table public.startup_email_outbox(
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.startup_submissions(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 event text not null check(event in ('submitted','approved')),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 retry_after timestamptz not null default now(),
 attempts integer not null default 0,
 unique(submission_id,event)
);
alter table public.startup_email_outbox enable row level security;
revoke all on public.startup_email_outbox from anon,authenticated;
grant all on public.startup_email_outbox to service_role;
create index startup_email_pending on public.startup_email_outbox(retry_after) where sent_at is null;
create function startup_private.queue_startup_email() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
   insert into public.startup_email_outbox(submission_id,owner_id,event) values(new.id,new.owner_id,'submitted') on conflict do nothing;
 elsif new.status='approved' and old.status is distinct from new.status then
   insert into public.startup_email_outbox(submission_id,owner_id,event) values(new.id,new.owner_id,'approved') on conflict do nothing;
 end if;
 return new;
end;
$$;
create trigger startup_submission_email after insert or update of status on public.startup_submissions for each row execute function startup_private.queue_startup_email();
revoke all on function startup_private.copy_logo(),startup_private.queue_startup_email() from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
