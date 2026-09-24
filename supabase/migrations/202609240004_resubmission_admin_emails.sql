begin;

alter table public.startup_admin_email_outbox
 drop constraint if exists startup_admin_email_outbox_submission_id_moderator_id_key;
alter table public.startup_admin_email_outbox
 add column event text not null default 'submitted'
 check(event in ('submitted','resubmitted'));

create or replace function startup_private.queue_admin_review_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  insert into public.startup_admin_email_outbox(submission_id,moderator_id,event)
  select new.id,m.user_id,'submitted' from public.startup_moderators m;
 elsif old.status is distinct from new.status and new.status='pending' then
  insert into public.startup_admin_email_outbox(submission_id,moderator_id,event)
  select new.id,m.user_id,'resubmitted' from public.startup_moderators m;
 end if;
 return new;
end;
$$;
drop trigger startup_admin_review_email on public.startup_submissions;
create trigger startup_admin_review_email
after insert or update of status on public.startup_submissions
for each row execute function startup_private.queue_admin_review_email();
revoke all on function startup_private.queue_admin_review_email() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
