begin;

create table public.startup_admin_email_outbox (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.startup_submissions(id) on delete cascade,
 moderator_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 retry_after timestamptz not null default now(),
 attempts integer not null default 0,
 unique(submission_id,moderator_id)
);
alter table public.startup_admin_email_outbox enable row level security;
revoke all on public.startup_admin_email_outbox from anon,authenticated;
grant all on public.startup_admin_email_outbox to service_role;
create index startup_admin_email_pending on public.startup_admin_email_outbox(retry_after) where sent_at is null;

create function startup_private.queue_admin_review_email() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.startup_admin_email_outbox(submission_id,moderator_id)
 select new.id,m.user_id from public.startup_moderators m
 on conflict do nothing;
 return new;
end;
$$;
create trigger startup_admin_review_email after insert on public.startup_submissions
for each row execute function startup_private.queue_admin_review_email();
revoke all on function startup_private.queue_admin_review_email() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
