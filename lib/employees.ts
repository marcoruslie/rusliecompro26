import type { SupabaseClient } from "@supabase/supabase-js";
import type { Employee, TransactionItem } from "@/lib/types";

export type EmployeeInput = Omit<Employee, "id" | "created_at" | "deleted_at">;

export async function listEmployees(supabase: SupabaseClient): Promise<Employee[]> {
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Employee[];
}

export async function createEmployee(
  supabase: SupabaseClient,
  data: EmployeeInput
): Promise<Employee> {
  const { data: row, error } = await supabase
    .from("employees")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as Employee;
}

export async function updateEmployee(
  supabase: SupabaseClient,
  id: string,
  data: EmployeeInput
): Promise<Employee> {
  const { data: row, error } = await supabase
    .from("employees")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as Employee;
}

export async function softDeleteEmployee(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("employees")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/* ─── Commission recap ──────────────────────────────────────────── */

export interface CommissionLine {
  transaction_id: string;
  created_at: string;
  invoice_number: string;
  customer_name: string;
  item_name: string;
  qty: number;
  commission_per_pcs: number;
}

export interface CommissionSummary {
  employee_id: string;
  employee_name: string;
  total_qty: number;
  total_commission: number;
  lines: CommissionLine[];
}

interface CommissionSourceRow {
  id: string;
  created_at: string;
  invoice_number: string | null;
  customer: { name?: string } | null;
  items: TransactionItem[] | null;
}

// Transactions created within [from, to) — only the columns the recap needs.
export async function listCommissionSource(
  supabase: SupabaseClient,
  from: Date,
  to: Date
): Promise<CommissionSourceRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, invoice_number, customer, items")
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CommissionSourceRow[];
}

// Group every line item that has an employee into per-employee totals.
// The current master name wins over the snapshot so renames show up; the
// snapshot is the fallback for employees that were deleted since.
export function summarizeCommissions(
  rows: CommissionSourceRow[],
  employees: Employee[]
): CommissionSummary[] {
  const names = new Map(employees.map((e) => [e.id, e.name]));
  const byEmployee = new Map<string, CommissionSummary>();
  for (const row of rows) {
    for (const it of row.items ?? []) {
      if (!it.employee_id) continue;
      let s = byEmployee.get(it.employee_id);
      if (!s) {
        s = {
          employee_id: it.employee_id,
          employee_name: names.get(it.employee_id) ?? it.employee_name ?? "(terhapus)",
          total_qty: 0,
          total_commission: 0,
          lines: [],
        };
        byEmployee.set(it.employee_id, s);
      }
      const perPcs = it.commission_per_pcs ?? 0;
      s.total_qty += it.qty;
      s.total_commission += it.qty * perPcs;
      s.lines.push({
        transaction_id: row.id,
        created_at: row.created_at,
        invoice_number: row.invoice_number ?? "",
        customer_name: row.customer?.name ?? "",
        item_name: it.name,
        qty: it.qty,
        commission_per_pcs: perPcs,
      });
    }
  }
  return Array.from(byEmployee.values()).sort((a, b) =>
    a.employee_name.localeCompare(b.employee_name)
  );
}
