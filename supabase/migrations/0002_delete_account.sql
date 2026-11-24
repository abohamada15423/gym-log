-- Gym Log: people delete their own account (phase 1 of docs/coach-plan.md, sections 6.7 and 8)
--
-- Deleting the auth user removes the profile and, through "on delete cascade", everything that
-- belongs to it: workouts, meals, check-ins, habits, settings, comments and the link to a coach
-- (for a coach also their programs, meal plans, notes and invites). Codes the account used stay
-- used: invites.used_at is kept.
--
-- Progress photos are files in Storage, which SQL is not allowed to delete, so the app removes
-- them through the Storage API first (syncDeleteAccount in js/sync.js), then calls this.

begin;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;
  delete from auth.users where id = v_me;
end $$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

commit;
