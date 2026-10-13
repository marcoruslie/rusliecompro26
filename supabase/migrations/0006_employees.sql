-- Master karyawan (employees). Transaction line items may optionally reference
-- an employee plus a commission-per-pcs; those live inside transactions.items
-- (JSONB) as `employee_id`, `employee_name` (snapshot), `commission_per_pcs`.
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,                         -- soft delete: null = active
  name text not null,
  phone text,
  is_active boolean not null default true
);
create unique index if not exists employees_name_active_uq
  on public.employees (lower(name)) where deleted_at is null;

alter table public.employees enable row level security;
create policy "authenticated full access to employees"
  on public.employees for all to authenticated using (true) with check (true);

-- The public invoice lookup (0002) returns full transaction rows to anonymous
-- visitors. Commission data is internal, so strip the employee/commission keys
-- from every line item before it leaves the database (line order preserved).
create or replace function public.get_public_invoice(p_id uuid, p_last4 text)
returns setof public.transactions
language sql
stable
security definer
set search_path = public
as $$
  select (jsonb_populate_record(
    null::public.transactions,
    to_jsonb(t) || jsonb_build_object(
      'items',
      coalesce(
        (select jsonb_agg(e.item - 'employee_id' - 'employee_name' - 'commission_per_pcs' order by e.n)
           from jsonb_array_elements(t.items) with ordinality as e(item, n)),
        '[]'::jsonb
      )
    )
  )).*
  from public.transactions t
  where t.id = p_id
    and right(regexp_replace(coalesce(t.customer->>'phone', ''), '\D', '', 'g'), 4) = p_last4
    and length(p_last4) = 4;
$$;

revoke all on function public.get_public_invoice(uuid, text) from public;
grant execute on function public.get_public_invoice(uuid, text) to anon, authenticated;
