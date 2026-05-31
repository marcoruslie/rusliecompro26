export type Channel = "online" | "direct";
export type PaymentMethod = "cash" | "top";

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
}
