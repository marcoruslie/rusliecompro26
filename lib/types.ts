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
  status?: OrderStatus;
  image_drive_id?: string | null;
  image_name?: string | null;
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
