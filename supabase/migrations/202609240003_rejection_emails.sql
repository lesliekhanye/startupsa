begin;

alter table public.startup_email_outbox drop constraint if exists startup_email_outbox_event_check;
alter table public.startup_email_outbox add constraint startup_email_outbox_event_check
 check(event in ('submitted','approved','rejected'));
alter table public.startup_email_outbox add column review_note text;
alter table public.startup_email_outbox add column reviewed_at timestamptz;
alter table public.startup_email_outbox drop constraint if exists startup_email_outbox_submission_id_event_key;
create unique index startup_email_review_event on public.startup_email_outbox
 (submission_id,event,coalesce(reviewed_at,'epoch'::timestamptz));

create or replace function startup_private.queue_startup_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.startup_email_outbox(submission_id,owner_id,event)
  values(new.id,new.owner_id,'submitted') on conflict do nothing;
 elsif new.status in ('approved','rejected') and old.status is distinct from new.status then
  insert into public.startup_email_outbox(submission_id,owner_id,event,review_note,reviewed_at)
  values(new.id,new.owner_id,new.status,case when new.status='rejected' then new.review_note else null end,new.reviewed_at) on conflict do nothing;
 end if;
 return new;
end;
$$;
revoke all on function startup_private.queue_startup_email() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
