export type Channel = "online" | "direct";
export type PaymentMethod = "cash" | "top";
export type OrderStatus = "processing" | "completed";

export interface Customer {
  id?: string;
  created_at?: string;
  name: string;
  address: string;
  city: string;
  phone: string;
}

export interface WireType {
  type_id?: string;
  created_at?: string;
  name: string;
}

export interface Wire {
  wire_id?: string;
  created_at?: string;
  name: string;
  type_id?: string | null;
}

export interface TransactionItem {
  wire_id?: string | null;
  name: string;
  qty: number;
  price: number;
  // Optional: the employee who made this line and their commission per pcs.
  // `employee_name` is a snapshot so old invoices keep the name after edits.
  employee_id?: string | null;
  employee_name?: string | null;
  commission_per_pcs?: number | null;
}

export interface Transaction {
  id?: string;
  created_at?: string;
  invoice_date: string;
  invoice_number: string;
  channel: Channel;
  customer_id?: string | null;
  customer: { name: string; address: string; city: string; phone: string };
  items: TransactionItem[];
  shipping: number;
  payment_method: PaymentMethod;
  top_note: string;
  subtotal: number;
  total: number;
  sender_name: string;
  // Marketplace (Shopee) fees deducted from `total`; net received = total - marketplace_fee.
  marketplace_fee?: number;
  marketplace_fees?: MarketplaceFeeBreakdown | null;
  status?: OrderStatus;
  image_drive_id?: string | null;
  image_name?: string | null;
}

// Percentages are plain numbers (8.25 = 8.25%); order_fee is rupiah per order.
export interface MarketplaceFeeRates {
  admin_fee_pct: number;
  ongkir_xtra_pct: number;
  promo_xtra_pct: number;
  order_fee: number;
  pph22_pct: number;
}

// Snapshot stored on a transaction: the rates used plus each fee in rupiah.
export interface MarketplaceFeeBreakdown {
  marketplace: "shopee";
  rates: MarketplaceFeeRates;
  admin_fee: number;
  ongkir_xtra: number;
  promo_xtra: number;
  order_fee: number;
  pph22: number;
  total: number;
}

export interface Warehouse {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
}

export interface StorageLocation {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  warehouse_id: string;
  code: string;
  name: string | null;
  is_active: boolean;
}

export type ItemCategory = "raw_material" | "finished_good";

export interface Item {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  cost_price: number;
  sale_price: number;
  reorder_level: number;
  is_active: boolean;
}

export interface Employee {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  name: string;
  phone: string | null;
  is_active: boolean;
}
