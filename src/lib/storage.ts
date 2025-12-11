// Local Storage Utilities for Dairy Management System

const STORAGE_KEYS = {
  USER: 'dairy_user',
  CUSTOMERS: 'dairy_customers',
  SALES: 'dairy_sales',
  PAYMENTS: 'dairy_payments',
  DELIVERIES: 'dairy_deliveries',
  ADVANCE_PAYMENTS: 'dairy_advance_payments', // v2.3.5: Advance payments
  SETTINGS: 'dairy_settings',
  IS_LOGGED_IN: 'dairy_logged_in',
  MONTHLY_RECORDS: 'dairy_monthly_records',
};

// Generic storage functions
export function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}

// User/Auth functions
export function getUser() {
  return getItem(STORAGE_KEYS.USER, null);
}

export function setUser(user: any) {
  setItem(STORAGE_KEYS.USER, user);
}

export function isLoggedIn(): boolean {
  return getItem(STORAGE_KEYS.IS_LOGGED_IN, false);
}

export function setLoggedIn(value: boolean) {
  setItem(STORAGE_KEYS.IS_LOGGED_IN, value);
}

export function logout() {
  setLoggedIn(false);
}

// Customers functions
export function getCustomers() {
  return getItem(STORAGE_KEYS.CUSTOMERS, []);
}

export function setCustomers(customers: any[]) {
  setItem(STORAGE_KEYS.CUSTOMERS, customers);
}

export function addCustomer(customer: any) {
  const customers = getCustomers();
  customers.push(customer);
  setCustomers(customers);
}

export function updateCustomer(id: string, updates: any) {
  const customers = getCustomers();
  const index = customers.findIndex((c: any) => c.id === id);
  if (index !== -1) {
    customers[index] = { ...customers[index], ...updates };
    setCustomers(customers);
  }
}

export function deleteCustomer(id: string) {
  const customers = getCustomers().filter((c: any) => c.id !== id);
  setCustomers(customers);
}

// Sales functions
export function getSales() {
  return getItem(STORAGE_KEYS.SALES, []);
}

export function setSales(sales: any[]) {
  setItem(STORAGE_KEYS.SALES, sales);
}

export function addSale(sale: any) {
  const sales = getSales();
  sales.push(sale);
  setSales(sales);
}

// Payments functions
export function getPayments() {
  return getItem(STORAGE_KEYS.PAYMENTS, []);
}

export function setPayments(payments: any[]) {
  setItem(STORAGE_KEYS.PAYMENTS, payments);
}

export function addPayment(payment: any) {
  const payments = getPayments();
  payments.push(payment);
  setPayments(payments);
}

// v2.3.5: Advance Payments functions
export function getAdvancePayments() {
  return getItem(STORAGE_KEYS.ADVANCE_PAYMENTS, []);
}

export function setAdvancePayments(payments: any[]) {
  setItem(STORAGE_KEYS.ADVANCE_PAYMENTS, payments);
}

export function addAdvancePayment(payment: any) {
  const payments = getAdvancePayments();
  payments.push(payment);
  setAdvancePayments(payments);
}

// Deliveries functions
export function getDeliveries() {
  return getItem(STORAGE_KEYS.DELIVERIES, []);
}

export function setDeliveries(deliveries: any[]) {
  setItem(STORAGE_KEYS.DELIVERIES, deliveries);
}

export function addDelivery(delivery: any) {
  const deliveries = getDeliveries();
  deliveries.push(delivery);
  setDeliveries(deliveries);
}

export function updateDelivery(id: string, updates: any) {
  const deliveries = getDeliveries();
  const index = deliveries.findIndex((d: any) => d.id === id);
  if (index !== -1) {
    deliveries[index] = { ...deliveries[index], ...updates };
    setDeliveries(deliveries);
  }
}

// Monthly Records functions (v2.0)
export function getMonthlyRecords() {
  return getItem(STORAGE_KEYS.MONTHLY_RECORDS, []);
}

export function setMonthlyRecords(records: any[]) {
  setItem(STORAGE_KEYS.MONTHLY_RECORDS, records);
}

export function addMonthlyRecord(record: any) {
  const records = getMonthlyRecords();
  records.push(record);
  setMonthlyRecords(records);
}

export function updateMonthlyRecord(id: string, updates: any) {
  const records = getMonthlyRecords();
  const index = records.findIndex((r: any) => r.id === id);
  if (index !== -1) {
    records[index] = { ...records[index], ...updates };
    setMonthlyRecords(records);
  }
}

export function getMonthlyRecordByCustomer(customerId: string, month: string) {
  const records = getMonthlyRecords();
  return records.find((r: any) => r.customerId === customerId && r.month === month);
}

// Settings functions
interface SettingsData {
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  theme: 'light' | 'dark';
  language: 'en' | 'hi';
  products: { id: string; name: string; unit: string; price: number; isActive: boolean }[];
  whatsappTemplate: string;
}

const DEFAULT_WHATSAPP_TEMPLATE = `🏪 *{shopName}*

नमस्ते {customerName} जी,

आपका बकाया राशि: *₹{dueAmount}*

कृपया जल्द से जल्द भुगतान करें।

धन्यवाद!
📞 {shopPhone}`;

export function getSettings(): SettingsData {
  return getItem<SettingsData>(STORAGE_KEYS.SETTINGS, {
    shopName: 'My Dairy Shop',
    ownerName: '',
    phone: '',
    address: '',
    theme: 'light',
    language: 'en',
    products: [
      { id: '1', name: 'Milk', unit: 'Liter', price: 60, isActive: true },
      { id: '2', name: 'Curd', unit: 'Kg', price: 80, isActive: true },
      { id: '3', name: 'Paneer', unit: 'Kg', price: 350, isActive: true },
      { id: '4', name: 'Ghee', unit: 'Kg', price: 600, isActive: true },
      { id: '5', name: 'Butter', unit: 'Kg', price: 500, isActive: true },
      { id: '6', name: 'Buttermilk', unit: 'Liter', price: 30, isActive: true },
    ],
    whatsappTemplate: DEFAULT_WHATSAPP_TEMPLATE,
  });
}

export function setSettings(settings: any) {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Date utilities - Indian Standard Time (IST = UTC+5:30)
export function getISTDate(): Date {
  const now = new Date();
  // Convert to IST by adding 5 hours 30 minutes to UTC
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const utc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utc + istOffset);
}

export function getTodayDate(): string {
  const istDate = getISTDate();
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  const day = String(istDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentISTHour(): number {
  return getISTDate().getHours();
}

export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export { STORAGE_KEYS };
