begin;

create or replace function public.startup_admin_dashboard() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 perform startup_private.require_verified_user();
 if not public.is_startup_moderator() then raise exception 'Administrator access required'; end if;
 return jsonb_build_object(
  'accounts',(select count(*) from auth.users),
  'verifiedAccounts',(select count(*) from auth.users where email_confirmed_at is not null),
  'items',coalesce((
   select jsonb_agg(
    (to_jsonb(s) - 'owner_id' - 'reviewed_by') || jsonb_build_object('owner_email',u.email)
    order by s.created_at desc
   )
   from public.startup_submissions s
   join auth.users u on u.id=s.owner_id
  ),'[]'::jsonb)
 );
end $$;

revoke all on function public.startup_admin_dashboard() from public, anon;
grant execute on function public.startup_admin_dashboard() to authenticated;

commit;
