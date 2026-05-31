-- ─────────────────────────────────────────────────────────────────────────
-- Public invoice lookup.
--
-- The `transactions` table is locked down to authenticated users (see 0001).
-- This SECURITY DEFINER function lets an anonymous visitor fetch a single
-- invoice ONLY if they supply the last 4 digits of the customer's phone
-- number that is stored on that invoice. The gate is enforced in the database,
-- so the public/anon API key can never read arbitrary transactions.
-- ─────────────────────────────────────────────────────────────────────────

create or replace function public.get_public_invoice(p_id uuid, p_last4 text)
returns setof public.transactions
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.transactions t
  where t.id = p_id
    -- strip everything that isn't a digit, then compare the trailing 4
    and right(regexp_replace(coalesce(t.customer->>'phone', ''), '\D', '', 'g'), 4) = p_last4
    and length(p_last4) = 4;
$$;

-- Only allow calling it; never grant table access to anon.
revoke all on function public.get_public_invoice(uuid, text) from public;
grant execute on function public.get_public_invoice(uuid, text) to anon, authenticated;
