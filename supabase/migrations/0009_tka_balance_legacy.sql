-- The legacy DOS books do not balance: some vouchers were saved with debet ≠ kredit
-- (2001–2018) and every year's opening balances (ACD) carry the accumulated
-- difference (Rp 372.602.967,99 since 2018). Book those differences to one
-- equity account so trial balance and balance sheet balance, while keeping the
-- amount visible in a single place. Safe to re-run (it recomputes everything).

create or replace function public.tka_seimbangkan_legacy()
returns table (jenis text, tahun int, nilai numeric)
language plpgsql security invoker as $$
declare
  v_acc constant text := '3.07';
begin
  insert into public.tka_acc (acc, name, accgroup, accinduk, detil, level, dk)
  values (v_acc, 'SELISIH SALDO AWAL PROGRAM LAMA', 3, '3', 'D', 2, 'K')
  on conflict (acc) do nothing;

  -- 1. Unbalanced legacy documents: one balancing ledger line per document and date
  --    (some legacy numbers were reused on several dates), so monthly totals balance too.
  delete from public.tka_jurnal where jnl = 'SLS';
  insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, acc, rem, debet, kredit)
  select max(j.doc_id), j.tahun, j.tanggal, 'SLS', j.nomor, v_acc,
         'SELISIH JURNAL PROGRAM LAMA ' || j.jnl || ' ' || j.nomor,
         greatest(sum(j.kredit) - sum(j.debet), 0), greatest(sum(j.debet) - sum(j.kredit), 0)
    from public.tka_jurnal j
   where j.jnl <> 'SLS'
   group by j.tahun, j.jnl, j.nomor, j.tanggal
  having abs(sum(j.debet) - sum(j.kredit)) >= 0.005;

  -- 2. Opening balances: the yearly difference goes to the same account.
  delete from public.tka_saldo_awal s where s.acc = v_acc;
  insert into public.tka_saldo_awal (tahun, acc, awal)
  select s.tahun, v_acc, round(-sum(s.awal), 2)
    from public.tka_saldo_awal s
   group by s.tahun
  having abs(sum(s.awal)) >= 0.005;

  return query
    select 'JURNAL'::text, j.tahun, round(sum(j.debet - j.kredit), 2)
      from public.tka_jurnal j where j.jnl = 'SLS' group by j.tahun
    union all
    select 'SALDO AWAL', s.tahun, s.awal from public.tka_saldo_awal s where s.acc = v_acc
    order by 1, 2;
end $$;

grant execute on function public.tka_seimbangkan_legacy() to authenticated;

-- Apply to data that is already imported (no-op on an empty database).
select public.tka_seimbangkan_legacy();
