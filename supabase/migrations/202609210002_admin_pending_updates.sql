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
    (to_jsonb(s) - 'owner_id' - 'reviewed_by') || jsonb_build_object(
     'owner_email',u.email,
     'is_update',p.id is not null,
     'has_pending_changes',p.id is not null and (
      s.name is distinct from p.name or s.website is distinct from p.website
      or s.pitch is distinct from p.pitch or s.story is distinct from p.story
      or s.category is distinct from p.category or s.city is distinct from p.city
      or s.stage is distinct from p.stage or s.founded_year is distinct from p.founded_year
      or s.founder is distinct from p.founder or s.logo_path is distinct from p.logo_path
     )
    )
    order by s.created_at desc
   )
   from public.startup_submissions s
   join auth.users u on u.id=s.owner_id
   left join public.startups p on p.id=s.id
  ),'[]'::jsonb)
 );
end $$;

revoke all on function public.startup_admin_dashboard() from public, anon;
grant execute on function public.startup_admin_dashboard() to authenticated;

notify pgrst,'reload schema';
commit;
