// Types for Dairy Management System

export interface User {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  email: string;
  password: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  unit: string;
  price: number;
  isActive: boolean;
}

export interface DeliverySchedule {
  frequency: 'daily' | 'weekly' | 'specific_dates' | 'specific_days';
  timeSlots: ('morning' | 'noon' | 'evening')[]; // Multiple time slots support
  days?: number[]; // 0=Sunday to 6=Saturday (for weekly/specific_days)
  dates?: number[]; // 1-31 (for specific_dates)
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: 'fixed' | 'random';
  defaultItems: DefaultItem[];
  schedule?: DeliverySchedule; // Only for fixed customers
  createdAt: string;
}

export interface DefaultItem {
  productId: string;
  quantity: number;
}

export interface Sale {
  id: string;
  customerId: string | null;
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  paymentType: 'cash' | 'online' | 'due';
  paidAmount: number;
  date: string;
  createdAt: string;
  deliveryId?: string; // Link to delivery if created from delivery
  isFromDelivery?: boolean; // Flag to identify delivery-based sales
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Payment {
  id: string;
  customerId: string;
  amount: number;
  paymentMode: 'cash' | 'online'; // Payment mode
  date: string;
  note: string;
}

// Skip reasons in Hinglish
export const SKIP_REASONS = [
  { value: 'ghar_pe_nahi', label: 'Ghar pe nahi the' },
  { value: 'aaj_nahi_chahiye', label: 'Aaj nahi chahiye' },
  { value: 'bahar_gaye', label: 'Bahar gaye hain' },
  { value: 'ghar_band', label: 'Ghar band tha' },
  { value: 'chutti_pe', label: 'Chutti pe hain' },
  { value: 'phone_nahi_uthaya', label: 'Phone nahi uthaya' },
  { value: 'customer_mana', label: 'Customer ne mana kiya' },
  { value: 'other', label: 'Other' },
] as const;

export type SkipReason = typeof SKIP_REASONS[number]['value'];

export interface Delivery {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string; // For walk-in customers
  customerAddress?: string; // For walk-in customers
  items: DeliveryItem[];
  extraItems?: DeliveryItem[]; // Extra items added for the day
  status: 'pending' | 'delivered' | 'skipped';
  skipReason?: SkipReason; // Reason for skipping
  skipNote?: string; // Custom note if reason is 'other'
  isOneTime: boolean;
  isWalkIn?: boolean; // For walk-in customers
  timeSlot: 'morning' | 'noon' | 'evening';
  date: string;
  deliveredAt: string | null;
  // Payment tracking
  paymentStatus?: 'unpaid' | 'partial' | 'paid';
  paidAmount?: number;
  paymentMode?: 'cash' | 'online' | 'due';
  saleId?: string; // Link to created sale
}

export interface DeliveryItem {
  productId: string;
  productName: string;
  quantity: number;
  price?: number; // Price at time of delivery
}

export interface Settings {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  theme: 'light' | 'dark';
  language: 'en' | 'hi';
  products: Product[];
  whatsappTemplate: string; // WhatsApp message template with placeholders
}

export interface DashboardStats {
  todayMilkSold: number;
  todaySales: number;
  todayCollection: number;
  totalDues: number;
  monthlyMilkSold: number;
  monthlySales: number;
  monthlyCollection: number;
}

// Bill related types
export interface MonthlyBill {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  month: string; // Format: YYYY-MM
  previousDue: number;
  deliveries: BillDeliveryItem[];
  payments: BillPaymentItem[];
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
}

export interface BillDeliveryItem {
  date: string;
  items: { name: string; quantity: number; price: number; total: number }[];
  total: number;
  paidAtDelivery: number;
}

export interface BillPaymentItem {
  date: string;
  amount: number;
  mode: 'cash' | 'online';
  note?: string;
}

// v2.0 - Monthly Record for Fixed Customers
export interface MonthlyRecord {
  id: string;
  customerId: string;
  customerName: string;
  month: string; // "2024-12" format

  // Deliveries tracking
  totalDeliveryDays: number; // Expected deliveries based on schedule
  deliveredCount: number;
  skippedCount: number;
  skippedDates: { date: string; reason: string; note?: string }[];

  // Delivery Details
  deliveryDetails: MonthlyDeliveryDetail[];

  // Financial
  previousBalance: number; // Carry forward from last month
  currentMonthTotal: number; // This month's deliveries total
  totalDue: number; // previous + current

  // Payments
  payments: MonthlyPayment[];
  totalPaid: number;
  balanceDue: number; // totalDue - totalPaid

  // Status
  status: 'active' | 'closed' | 'billed';
  createdAt: string;
  billGeneratedAt?: string;
  closedAt?: string;
}

export interface MonthlyDeliveryDetail {
  date: string;
  status: 'delivered' | 'skipped' | 'pending';
  items: { productId: string; productName: string; quantity: number; price: number; amount: number }[];
  extraItems?: { productId: string; productName: string; quantity: number; price: number; amount: number }[];
  total: number;
  paidAmount: number;
  paymentMode?: 'cash' | 'online' | 'due';
  skipReason?: string;
  skipNote?: string;
}

export interface MonthlyPayment {
  id: string;
  date: string;
  amount: number;
  mode: 'cash' | 'online';
  note?: string;
}
