begin;
alter table public.startup_submissions add column deleted_at timestamptz,
 add column hidden_before_delete boolean;

create function public.startup_admin_dashboard() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 perform startup_private.require_verified_user();
 if not public.is_startup_moderator() then raise exception 'Administrator access required'; end if;
 return jsonb_build_object(
 'accounts',(select count(*) from auth.users),
 'verifiedAccounts',(select count(*) from auth.users where email_confirmed_at is not null),
 'items',coalesce((select jsonb_agg(to_jsonb(s) - 'owner_id' - 'reviewed_by' order by s.created_at desc) from public.startup_submissions s),'[]'::jsonb));
end $$;
revoke all on function public.startup_admin_dashboard() from public, anon;
grant execute on function public.startup_admin_dashboard() to authenticated;

create function public.startup_admin_trash(submission_id uuid, restore boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.startup_submissions;
begin
 perform startup_private.require_verified_user();
 if not public.is_startup_moderator() then raise exception 'Administrator access required'; end if;
 select * into item from public.startup_submissions where id=submission_id for update;
 if not found then raise exception 'Submission not found'; end if;
 if restore and item.deleted_at is not null then
  update public.startups set hidden=coalesce(item.hidden_before_delete,false) where id=submission_id;
  update public.startup_submissions set deleted_at=null,hidden_before_delete=null where id=submission_id;
 elsif not restore and item.deleted_at is null then
  update public.startup_submissions set deleted_at=now(),hidden_before_delete=(select hidden from public.startups where id=submission_id) where id=submission_id;
  update public.startups set hidden=true where id=submission_id;
 end if;
end $$;
revoke all on function public.startup_admin_trash(uuid,boolean) from public, anon;
grant execute on function public.startup_admin_trash(uuid,boolean) to authenticated;

create function startup_private.prevent_trashed_review() returns trigger
language plpgsql set search_path = '' as $$
begin
 if old.deleted_at is not null and new.status is distinct from old.status then raise exception 'Restore this submission before reviewing it'; end if;
 return new;
end $$;
create trigger prevent_trashed_review before update on public.startup_submissions for each row execute function startup_private.prevent_trashed_review();
commit;
