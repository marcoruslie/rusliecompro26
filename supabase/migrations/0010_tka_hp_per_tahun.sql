-- TKA: invoice register keyed per year, year re-posting, stable report ordering.
--
-- 1. Supplier faktur numbers (BLI) restart at 001 every year, but the register was
--    unique on (id_cs, nkey): every new year's faktur overwrote the previous year's
--    (no 2025 faktur survived the import, and faktur 001/2027 would have replaced an
--    unpaid 001/2026). The register is now unique on (id_cs, nkey, tahun) and every
--    payment / return records which year's invoice it settles (nota_tahun), taken
--    from the line's invoice date (d.notadate, present on every legacy payment line)
--    or else the latest invoice with that number not after the payment.
-- 2. tka_posting_ulang(tahun) re-posts every document of a year. The legacy 2024
--    posting files were lost (RACC/RHPP/RHP/RGR__24 hold a few dozen rows), so the
--    importer rebuilds that year's books from its documents.
-- 3. tka_cairkan_giro_legacy() applies the legacy giro-clearing list (BMG) to giros.
-- 4. Ledger / stock / sub-ledger cards get an explicit ORDER BY: their rows are read
--    in pages of 1000, which needs a deterministic order.
--
-- Run after 0008 and 0009. Existing data is migrated in place, but supplier invoices
-- that were already overwritten can only come back through a re-import
-- (npm run tka:import -- --reset).

-- ── register: one row per (side, number, invoice year) ──

alter table public.tka_hp add column if not exists tahun int;
update public.tka_hp set tahun = coalesce(extract(year from coalesce(tanggal, notadate))::int, 0) where tahun is null;
alter table public.tka_hp alter column tahun set default 0, alter column tahun set not null;
alter table public.tka_hp drop constraint if exists tka_hp_id_cs_nkey_key;
alter table public.tka_hp drop constraint if exists tka_hp_id_cs_nkey_tahun_key;
alter table public.tka_hp add constraint tka_hp_id_cs_nkey_tahun_key unique (id_cs, nkey, tahun);

alter table public.tka_bayar add column if not exists nota_tahun int;
-- One set-based pass: a correlated subquery per payment row ran past the SQL
-- Editor's time limit.
update public.tka_bayar b
   set nota_tahun = coalesce(x.th, extract(year from b.tanggal)::int)
  from (select b2.id, max(h.tahun) as th
          from public.tka_bayar b2
          left join public.tka_hp h
            on h.id_cs = b2.id_cs and h.nkey = b2.nkey and h.tahun <= extract(year from b2.tanggal)::int
         where b2.nota_tahun is null
         group by b2.id) x
 where x.id = b.id;
alter table public.tka_bayar alter column nota_tahun set not null;
drop index if exists public.tka_bayar_key_idx;
create index if not exists tka_bayar_key_idx on public.tka_bayar (id_cs, nkey, nota_tahun);

-- Which year's invoice a payment / return line settles.
create or replace function public.tka_nota_tahun(p_id_cs text, p_nota text, p_notadate date, p_tanggal date)
returns int language sql stable as $$
  select coalesce(
    extract(year from p_notadate)::int,
    (select max(h.tahun) from public.tka_hp h
      where h.id_cs = p_id_cs and h.nkey = public.tka_nkey(p_nota) and h.tahun <= extract(year from p_tanggal)::int),
    extract(year from p_tanggal)::int)
$$;

-- ── posting engine (unchanged except for nota_tahun and p_strict) ──

-- p_strict = false skips the debet = kredit check: used when re-posting legacy
-- vouchers, which the DOS program sometimes saved unbalanced (0009 books the
-- difference to 3.07).
drop function if exists public.tka_post(bigint);
create or replace function public.tka_post(p_doc_id bigint, p_strict boolean default true)
returns void language plpgsql security invoker as $$
declare
  d public.tka_doc%rowtype;
  s public.tka_setting%rowtype;
  l record;
  v_acc text;
  v_hpp numeric;
  v_cost numeric;
  v_code text;
  v_id_cs text;
  v_d numeric; v_k numeric;
  v_disc numeric; v_ppn numeric;
begin
  select * into d from public.tka_doc where id = p_doc_id;
  if not found then raise exception 'Dokumen % tidak ditemukan', p_doc_id; end if;
  select * into s from public.tka_setting where id = 1;
  v_code := public.tka_jnl_code(d.jnl);

  delete from public.tka_jurnal where doc_id = p_doc_id;
  delete from public.tka_mutasi where doc_id = p_doc_id;
  delete from public.tka_bayar where doc_id = p_doc_id;
  delete from public.tka_giro where doc_id = p_doc_id and cair = '';

  -- Cash / bank vouchers and general journal: every line is a ledger line.
  if d.jnl in ('KM','KK','BM','BK','JNL') then
    v_id_cs := case when d.jnl in ('KM','BM') then 'C' when d.jnl in ('KK','BK') then 'S' else '' end;
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.acc = '' or l.val = 0 then continue; end if;
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, bg, bgdue, rem, debet, kredit)
      values (p_doc_id, d.tahun, d.tanggal, v_code, d.nomor, v_id_cs, d.sub, d.subname, l.acc,
              coalesce(l.d->>'bg', ''), nullif(l.d->>'bgdue', '')::date, l.rem,
              case when l.dk = 'D' then l.val else 0 end, case when l.dk = 'K' then l.val else 0 end);
      if l.nota <> '' and ((v_id_cs = 'C' and l.dk = 'K') or (v_id_cs = 'S' and l.dk = 'D')) then
        insert into public.tka_bayar (doc_id, id_cs, kind, nkey, nota, nota_tahun, tanggal, nomor, val)
        values (p_doc_id, v_id_cs, 'P', public.tka_nkey(l.nota), l.nota,
                public.tka_nota_tahun(v_id_cs, l.nota, nullif(l.d->>'notadate', '')::date, d.tanggal),
                d.tanggal, d.nomor, l.val);
      end if;
      if coalesce(l.d->>'bg', '') <> '' and v_id_cs <> ''
         and ((v_id_cs = 'C' and l.dk = 'D') or (v_id_cs = 'S' and l.dk = 'K'))
         and not exists (select 1 from public.tka_giro g where g.bg = l.d->>'bg' and g.cair <> '') then
        insert into public.tka_giro (doc_id, status, nomor, tanggal, sub, subname, bg, acc, bank, bgdue, bgval, bgrem)
        values (p_doc_id, case when v_id_cs = 'S' then '1' else '' end, d.nomor, d.tanggal, d.sub, d.subname,
                l.d->>'bg', l.acc, coalesce(l.d->>'bank', ''), nullif(l.d->>'bgdue', '')::date, l.val,
                coalesce(nullif(l.d->>'bgrem', ''), l.rem));
      end if;
    end loop;
    select coalesce(sum(debet), 0), coalesce(sum(kredit), 0) into v_d, v_k from public.tka_jurnal where doc_id = p_doc_id;
    if p_strict and round(v_d, 2) <> round(v_k, 2) then
      raise exception 'Jurnal tidak seimbang: debet % ≠ kredit %', v_d, v_k;
    end if;

  -- Nota penjualan: piutang / penjualan per line, HPP / persediaan barang jadi at standard cost.
  elsif d.jnl = 'JLH' then
    select coalesce(nullif(c.acc, ''), s.accpiut) into v_acc from public.tka_cus c where c.cus = d.sub;
    v_acc := coalesce(v_acc, s.accpiut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      if l.val <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, v_acc, l.invname, l.val, 0),
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname,
           case coalesce(l.d->>'tk', '') when 'E' then s.accjlhe when 'T' then s.accjlht else s.accjlhp end, l.invname, 0, l.val);
      end if;
      if v_cost <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname,
           case coalesce(l.d->>'tk', '') when 'E' then s.acchppe when 'T' then s.acchppt else s.acchppp end, l.invname, v_cost, 0),
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, s.accinvbj, l.invname, 0, v_cost);
      end if;
      if l.inv <> '' then
        insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, jnlno, sub, subname, loc, gol, inv, unit, price, qout, vout)
        values (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, l.jnlno, d.sub, d.subname, coalesce(nullif(d.h->>'loc', ''), '01'),
                l.gol, l.inv, l.unit, l.price, l.qty, v_cost);
      end if;
    end loop;
    v_disc := coalesce(nullif(d.h->>'discval', '')::numeric, 0);
    v_ppn := coalesce(nullif(d.h->>'ppnval', '')::numeric, 0);
    if v_disc <> 0 then
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, s.accdisc, 'DISKON PENJUALAN', v_disc, 0),
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, v_acc, 'DISKON PENJUALAN', 0, v_disc);
    end if;
    if v_ppn <> 0 and s.accppnjlh <> '' then
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, v_acc, 'PPN KELUARAN', v_ppn, 0),
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, s.accppnjlh, 'PPN KELUARAN', 0, v_ppn);
    end if;
    perform public.tka_upsert_hp(d, 'C');

  -- Retur penjualan: retur / piutang, barang kembali ke persediaan.
  elsif d.jnl = 'RJL' then
    select coalesce(nullif(c.acc, ''), s.accpiut) into v_acc from public.tka_cus c where c.cus = d.sub;
    v_acc := coalesce(v_acc, s.accpiut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      if l.val <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, s.accrjl, l.invname, l.val, 0),
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, v_acc, l.invname, 0, l.val);
        if l.nota <> '' then
          insert into public.tka_bayar (doc_id, id_cs, kind, nkey, nota, nota_tahun, tanggal, nomor, val)
          values (p_doc_id, 'C', 'R', public.tka_nkey(l.nota), l.nota,
                  public.tka_nota_tahun('C', l.nota, nullif(l.d->>'notadate', '')::date, d.tanggal),
                  d.tanggal, d.nomor, l.val);
        end if;
      end if;
      if v_cost <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, s.accinvbj, l.invname, v_cost, 0),
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, s.acchppp, l.invname, 0, v_cost);
      end if;
      if l.inv <> '' then
        insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, nota, loc, gol, inv, unit, price, qin, vin)
        values (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, d.sub, d.subname, l.nota, coalesce(nullif(d.h->>'loc', ''), '01'),
                l.gol, l.inv, l.unit, l.price, l.qty, v_cost);
      end if;
    end loop;

  -- Penerimaan barang: stock in; value comes from the matching faktur pembelian line.
  elsif d.jnl = 'BPB' then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      select coalesce(sum(fl.val), 0), max(fl.price) into v_cost, v_hpp
        from public.tka_doc_line fl join public.tka_doc f on f.id = fl.doc_id
       where f.jnl = 'BLI' and fl.jnlno = d.nomor and fl.gol = l.gol and fl.inv = l.inv
         and extract(year from nullif(fl.d->>'jnldate', '')::date) = d.tahun;
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, nota, loc, gol, inv, unit, price, qin, vin)
      values (p_doc_id, d.tahun, d.tanggal, 'BPB', d.nomor, d.sub, d.subname, d.nomor, coalesce(nullif(d.h->>'loc', ''), '01'),
              l.gol, l.inv, l.unit, coalesce(v_hpp, 0), l.qty, v_cost);
    end loop;

  -- Faktur pembelian: persediaan bahan baku / hutang. Re-values the referenced BPB.
  elsif d.jnl = 'BLI' then
    select coalesce(nullif(x.acc, ''), s.acchut) into v_acc from public.tka_sup x where x.sup = d.sub;
    v_acc := coalesce(v_acc, s.acchut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.val = 0 then continue; end if;
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, s.accinvbb, l.invname, l.val, 0),
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, v_acc, l.invname, 0, l.val);
    end loop;
    v_ppn := coalesce(nullif(d.h->>'ppnval', '')::numeric, 0);
    if v_ppn <> 0 and s.accppnbli <> '' then
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, s.accppnbli, 'PPN MASUKAN', v_ppn, 0),
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, v_acc, 'PPN MASUKAN', 0, v_ppn);
    end if;
    perform public.tka_upsert_hp(d, 'S');
    update public.tka_mutasi m
       set vin = x.val, price = x.price
      from (select fl.jnlno, extract(year from nullif(fl.d->>'jnldate', '')::date)::int as th, fl.gol, fl.inv,
                   sum(fl.val) as val, max(fl.price) as price
              from public.tka_doc_line fl where fl.doc_id = p_doc_id and fl.jnlno <> ''
             group by 1, 2, 3, 4) x
     where m.jnl = 'BPB' and m.nomor = x.jnlno and m.tahun = x.th and m.gol = x.gol and m.inv = x.inv;

  -- Retur pembelian: hutang / persediaan bahan baku, stock out.
  elsif d.jnl = 'RBL' then
    select coalesce(nullif(x.acc, ''), s.acchut) into v_acc from public.tka_sup x where x.sup = d.sub;
    v_acc := coalesce(v_acc, s.acchut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.val <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'RBL', d.nomor, 'S', d.sub, d.subname, v_acc, l.invname, l.val, 0),
          (p_doc_id, d.tahun, d.tanggal, 'RBL', d.nomor, 'S', d.sub, d.subname, s.accinvbb, l.invname, 0, l.val);
        if l.nota <> '' then
          insert into public.tka_bayar (doc_id, id_cs, kind, nkey, nota, nota_tahun, tanggal, nomor, val)
          values (p_doc_id, 'S', 'R', public.tka_nkey(l.nota), l.nota,
                  public.tka_nota_tahun('S', l.nota, nullif(l.d->>'notadate', '')::date, d.tanggal),
                  d.tanggal, d.nomor, l.val);
        end if;
      end if;
      if l.inv <> '' then
        insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, nota, loc, gol, inv, unit, price, qout, vout)
        values (p_doc_id, d.tahun, d.tanggal, 'RBL', d.nomor, d.sub, d.subname, l.nota, coalesce(nullif(d.h->>'loc', ''), '01'),
                l.gol, l.inv, l.unit, l.price, l.qty, l.val);
      end if;
    end loop;

  -- Bahan keluar ke pekerja: raw material out at standard cost (no ledger lines, as legacy).
  elsif d.jnl = 'BBK' then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, loc, gol, inv, unit, price, qout, vout)
      values (p_doc_id, d.tahun, d.tanggal, 'BBK', d.nomor, d.sub, d.subname, coalesce(nullif(d.h->>'loc', ''), '01'),
              l.gol, l.inv, l.unit, case when l.qty <> 0 then round(v_cost / l.qty, 4) else 0 end, l.qty, v_cost);
    end loop;

  -- Hasil produksi: barang jadi masuk at standard cost; persediaan barang jadi / bahan baku.
  elsif d.jnl = 'BHP' then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, loc, gol, inv, unit, price, qin, vin)
      values (p_doc_id, d.tahun, d.tanggal, 'BHP', d.nomor, coalesce(nullif(l.tka, ''), d.sub),
              coalesce(nullif(l.d->>'tkaname', ''), d.subname), coalesce(nullif(d.h->>'loc', ''), '01'),
              l.gol, l.inv, l.unit, case when l.qty <> 0 then round(v_cost / l.qty, 4) else 0 end, l.qty, v_cost);
      if v_cost <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'BHP', d.nomor, coalesce(nullif(l.tka, ''), d.sub), d.subname, s.accinvbj, 'Prod. ' || l.invname, v_cost, 0),
          (p_doc_id, d.tahun, d.tanggal, 'BHP', d.nomor, coalesce(nullif(l.tka, ''), d.sub), d.subname, s.accinvbb, 'Prod. ' || l.invname, 0, v_cost);
      end if;
    end loop;

  -- Koreksi persediaan / stock opname: + masuk, - keluar, value as entered.
  elsif d.jnl in ('KOR','OPN') then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, loc, gol, inv, unit, price, qin, qout, vin, vout)
      values (p_doc_id, d.tahun, d.tanggal, d.jnl, d.nomor, coalesce(nullif(d.h->>'loc', ''), '01'), l.gol, l.inv, l.unit, l.price,
              case when l.dk = '-' then 0 else l.qty end, case when l.dk = '-' then l.qty else 0 end,
              case when l.dk = '-' then 0 else l.val end, case when l.dk = '-' then l.val else 0 end);
    end loop;
  end if;
  -- POP / POE (orders) have no postings.
end $$;

-- Register row of a nota penjualan / faktur pembelian. A document whose number or
-- year changed leaves its old row behind: drop it (or zero it when payments exist).
create or replace function public.tka_upsert_hp(d public.tka_doc, p_id_cs text)
returns void language plpgsql as $$
begin
  delete from public.tka_hp h
   where h.doc_id = d.id and h.id_cs = p_id_cs and (h.nkey <> public.tka_nkey(d.nomor) or h.tahun <> d.tahun)
     and h.payment_legacy = 0 and h.valret_legacy = 0
     and not exists (select 1 from public.tka_bayar b where b.id_cs = h.id_cs and b.nkey = h.nkey and b.nota_tahun = h.tahun);
  update public.tka_hp h set val = 0
   where h.doc_id = d.id and h.id_cs = p_id_cs and (h.nkey <> public.tka_nkey(d.nomor) or h.tahun <> d.tahun);
  insert into public.tka_hp (id_cs, nomor, nkey, tahun, tanggal, sub, subname, nota, notadate, duedate, val, rem, doc_id)
  values (p_id_cs, d.nomor, public.tka_nkey(d.nomor), d.tahun, d.tanggal, d.sub, d.subname, d.nomor, d.tanggal,
          coalesce(nullif(d.h->>'duedate', '')::date, d.tanggal), d.total, d.rem, d.id)
  on conflict (id_cs, nkey, tahun) do update
     set nomor = excluded.nomor, tanggal = excluded.tanggal, sub = excluded.sub, subname = excluded.subname,
         notadate = excluded.notadate, duedate = excluded.duedate, val = excluded.val, doc_id = excluded.doc_id;
end $$;

create or replace function public.tka_delete_doc(p_id bigint)
returns void language plpgsql security invoker as $$
begin
  delete from public.tka_hp where doc_id = p_id and payment_legacy = 0 and valret_legacy = 0
     and not exists (select 1 from public.tka_bayar b where b.id_cs = tka_hp.id_cs and b.nkey = tka_hp.nkey and b.nota_tahun = tka_hp.tahun);
  update public.tka_hp set val = 0 where doc_id = p_id;
  delete from public.tka_doc where id = p_id;
end $$;

-- ── re-posting a whole year ──

-- Invoices first, so payments in the same year can find the invoice they settle.
-- Returns the documents that could not be posted.
create or replace function public.tka_posting_ulang(p_tahun int)
returns table (jnl text, nomor text, pesan text)
language plpgsql security invoker as $$
declare
  r record;
begin
  for r in
    select x.id, x.jnl, x.nomor from public.tka_doc x
     where x.tahun = p_tahun
     order by case x.jnl when 'BPB' then 1 when 'BLI' then 2 when 'JLH' then 3 when 'RJL' then 4 when 'RBL' then 5 else 6 end,
              x.tanggal, x.id
  loop
    begin
      perform public.tka_post(r.id, false);
    exception when others then
      jnl := r.jnl; nomor := r.nomor; pesan := sqlerrm;
      return next;
    end;
  end loop;
end $$;

-- Apply the legacy giro-clearing list (BMG: bg, cair, cairdate, acc1) of a re-posted
-- year, then post the clearing journal of every giro the register already marks as
-- cleared in that year but whose RGR lines were lost. tka_giro_status re-posts from
-- scratch, so this is safe to repeat. Returns what could not be applied.
create or replace function public.tka_cairkan_giro_legacy(p jsonb, p_tahun int)
returns table (bg text, pesan text)
language plpgsql security invoker as $$
declare
  r record;
  v_id bigint;
begin
  for r in select * from jsonb_to_recordset(coalesce(p, '[]'::jsonb)) as x(bg text, cair text, cairdate date, acc1 text) loop
    select g.id into v_id from public.tka_giro g
     where g.bg = r.bg and (g.tanggal is null or g.tanggal <= r.cairdate)
     order by (g.cair = '') desc, g.tanggal desc nulls last, g.id desc limit 1;
    if v_id is null then
      bg := r.bg; pesan := 'giro tidak ditemukan'; return next;
      continue;
    end if;
    begin
      perform public.tka_giro_status(v_id, coalesce(nullif(r.cair, ''), 'C'), r.cairdate, r.acc1);
    exception when others then
      bg := r.bg; pesan := sqlerrm; return next;
    end;
  end loop;

  for r in select g.id, g.bg, g.cair, g.cairdate, g.acc1 from public.tka_giro g
            where g.cair <> '' and extract(year from g.cairdate) = p_tahun
              and not exists (select 1 from public.tka_jurnal j where j.giro_id = g.id) loop
    begin
      perform public.tka_giro_status(r.id, r.cair, r.cairdate, r.acc1);
    exception when others then
      bg := r.bg; pesan := sqlerrm; return next;
    end;
  end loop;
end $$;

-- ── sub-ledger reports matched per invoice year ──

create or replace function public.tka_hp_outstanding(p_id_cs text, p_per date, p_sub text default null)
returns table (id bigint, nomor text, tanggal date, duedate date, sub text, subname text,
               val numeric, bayar numeric, retur numeric, sisa numeric, umur int, doc_id bigint)
language sql stable as $$
  select h.id, h.nomor, h.tanggal, h.duedate, h.sub, h.subname, h.val,
         h.payment_legacy + coalesce(b.p, 0), h.valret_legacy + coalesce(b.r, 0),
         h.val - h.payment_legacy - h.valret_legacy - coalesce(b.p, 0) - coalesce(b.r, 0),
         (p_per - coalesce(h.duedate, h.tanggal))::int, h.doc_id
    from public.tka_hp h
    left join lateral (
      select sum(case when kind = 'P' then val else 0 end) as p, sum(case when kind = 'R' then val else 0 end) as r
        from public.tka_bayar x
       where x.id_cs = h.id_cs and x.nkey = h.nkey and x.nota_tahun = h.tahun and x.tanggal <= p_per
    ) b on true
   where h.id_cs = p_id_cs and (h.tanggal is null or h.tanggal <= p_per)
     and (p_sub is null or h.sub = p_sub)
     and abs(h.val - h.payment_legacy - h.valret_legacy - coalesce(b.p, 0) - coalesce(b.r, 0)) >= 1
   order by h.sub, h.tanggal, h.nomor, h.id
$$;

create or replace function public.tka_hp_kartu(p_id_cs text, p_sub text, p_dari date, p_sampai date)
returns table (tanggal date, jenis text, nomor text, nota text, rem text, tambah numeric, kurang numeric, saldo numeric, doc_id bigint)
language sql stable as $$
  with ev as (
    select h.tanggal, 'NOTA'::text as jenis, h.nomor, h.nomor as nota, h.rem, h.val as tambah, 0::numeric as kurang, h.doc_id, 1 as ord, h.id as k
      from public.tka_hp h where h.id_cs = p_id_cs and h.sub = p_sub
    union all
    select h.tanggal, 'BAYAR (LAMA)', h.rem, h.nomor, 'Pelunasan tercatat di program lama', 0, h.payment_legacy + h.valret_legacy, null, 2, h.id
      from public.tka_hp h where h.id_cs = p_id_cs and h.sub = p_sub and h.payment_legacy + h.valret_legacy <> 0
    union all
    select b.tanggal, case when b.kind = 'R' then 'RETUR' else 'BAYAR' end, b.nomor, b.nota, '', 0, b.val, b.doc_id, 2, b.id
      from public.tka_bayar b join public.tka_hp h on h.id_cs = b.id_cs and h.nkey = b.nkey and h.tahun = b.nota_tahun
     where b.id_cs = p_id_cs and h.sub = p_sub
  ), awal as (
    select coalesce(sum(tambah - kurang), 0) as v from ev where tanggal < p_dari
  )
  select x.tanggal, x.jenis, x.nomor, x.nota, x.rem, x.tambah, x.kurang, x.saldo, x.doc_id from (
    select p_dari as tanggal, 'AWAL'::text as jenis, ''::text as nomor, ''::text as nota, 'SALDO AWAL'::text as rem,
           0::numeric as tambah, 0::numeric as kurang, (select v from awal) as saldo, null::bigint as doc_id,
           0 as o1, 0 as ord, ''::text as nk, 0::bigint as k
    union all
    select e.tanggal, e.jenis, e.nomor, e.nota, e.rem, e.tambah, e.kurang,
           (select v from awal) + sum(e.tambah - e.kurang) over (order by e.tanggal, e.ord, e.nomor, e.k), e.doc_id,
           1, e.ord, e.nomor, e.k
      from ev e where e.tanggal between p_dari and p_sampai
  ) x
  order by x.o1, x.tanggal, x.ord, x.nk, x.k
$$;

-- ── ledger and stock cards: same rows as before, in a fixed order ──

create or replace function public.tka_buku_besar(p_acc text, p_dari date, p_sampai date)
returns table (tanggal date, jnl text, nomor text, sub text, subname text, rem text, bg text, debet numeric, kredit numeric, saldo numeric, doc_id bigint)
language sql stable as $$
  with awal as (
    select coalesce((select awal from public.tka_saldo_awal where tahun = extract(year from p_dari)::int and acc = p_acc), 0)
         + coalesce((select sum(debet - kredit) from public.tka_jurnal
                      where acc = p_acc and tahun = extract(year from p_dari)::int and tanggal < p_dari), 0) as v
  ), rows as (
    select j.tanggal, j.jnl, j.nomor, j.sub, j.subname, j.rem, j.bg, j.debet, j.kredit, j.doc_id, j.id
      from public.tka_jurnal j
     where j.acc = p_acc and j.tanggal between p_dari and p_sampai
  )
  select x.tanggal, x.jnl, x.nomor, x.sub, x.subname, x.rem, x.bg, x.debet, x.kredit, x.saldo, x.doc_id from (
    select p_dari as tanggal, 'AWAL'::text as jnl, ''::text as nomor, ''::text as sub, ''::text as subname, 'SALDO AWAL'::text as rem,
           ''::text as bg, 0::numeric as debet, 0::numeric as kredit, (select v from awal) as saldo, null::bigint as doc_id, 0::bigint as k
    union all
    select r.tanggal, r.jnl, r.nomor, r.sub, r.subname, r.rem, r.bg, r.debet, r.kredit,
           (select v from awal) + sum(r.debet - r.kredit) over (order by r.tanggal, r.id), r.doc_id, r.id
      from rows r
  ) x
  order by x.k = 0 desc, x.tanggal, x.k
$$;

create or replace function public.tka_kartu_stok(p_gol text, p_inv text, p_dari date, p_sampai date)
returns table (tanggal date, jnl text, nomor text, sub text, subname text, price numeric,
               qin numeric, qout numeric, q_saldo numeric, vin numeric, vout numeric, v_saldo numeric, doc_id bigint)
language sql stable as $$
  with awal as (
    select coalesce((select sum(qty) from public.tka_stok_awal where tahun = extract(year from p_dari)::int and gol = p_gol and inv = p_inv), 0)
         + coalesce((select sum(qin - qout) from public.tka_mutasi where gol = p_gol and inv = p_inv
                        and tahun = extract(year from p_dari)::int and tanggal < p_dari), 0) as q,
           coalesce((select sum(val) from public.tka_stok_awal where tahun = extract(year from p_dari)::int and gol = p_gol and inv = p_inv), 0)
         + coalesce((select sum(vin - vout) from public.tka_mutasi where gol = p_gol and inv = p_inv
                        and tahun = extract(year from p_dari)::int and tanggal < p_dari), 0) as v
  ), rows as (
    select * from public.tka_mutasi m where m.gol = p_gol and m.inv = p_inv and m.tanggal between p_dari and p_sampai
  )
  select x.tanggal, x.jnl, x.nomor, x.sub, x.subname, x.price, x.qin, x.qout, x.q_saldo, x.vin, x.vout, x.v_saldo, x.doc_id from (
    select p_dari as tanggal, 'AWAL'::text as jnl, ''::text as nomor, ''::text as sub, 'SALDO AWAL'::text as subname, 0::numeric as price,
           0::numeric as qin, 0::numeric as qout, (select q from awal) as q_saldo,
           0::numeric as vin, 0::numeric as vout, (select v from awal) as v_saldo, null::bigint as doc_id, 0::bigint as k
    union all
    select r.tanggal, r.jnl, r.nomor, r.sub, r.subname, r.price, r.qin, r.qout,
           (select q from awal) + sum(r.qin - r.qout) over (order by r.tanggal, r.id),
           r.vin, r.vout,
           (select v from awal) + sum(r.vin - r.vout) over (order by r.tanggal, r.id), r.doc_id, r.id
      from rows r
  ) x
  order by x.k = 0 desc, x.tanggal, x.k
$$;

grant execute on function public.tka_nota_tahun(text, text, date, date) to authenticated;
grant execute on function public.tka_post(bigint, boolean) to authenticated;
grant execute on function public.tka_posting_ulang(int) to authenticated;
grant execute on function public.tka_cairkan_giro_legacy(jsonb, int) to authenticated;
