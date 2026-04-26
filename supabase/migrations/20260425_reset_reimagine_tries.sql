-- Reset all avatar reimagination usage after the Soul Cycle rules update.
-- This gives every user a fresh set of tries immediately.

update public.hubs
set regen_count = 0
where regen_count is distinct from 0;
