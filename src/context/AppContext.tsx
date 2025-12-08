import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  getUser,
  setUser as saveUser,
  isLoggedIn as checkLoggedIn,
  setLoggedIn,
  logout as doLogout,
  getCustomers,
  setCustomers,
  addCustomer as saveCustomer,
  updateCustomer as modifyCustomer,
  deleteCustomer as removeCustomer,
  getSales,
  addSale as saveSale,
  getPayments,
  addPayment as savePayment,
  getDeliveries,
  setDeliveries,
  addDelivery as saveDelivery,
  updateDelivery as modifyDelivery,
  getSettings,
  setSettings as saveSettings,
  generateId,
  getTodayDate,
  getISTDate,
  getMonthlyRecords,
  setMonthlyRecords as saveMonthlyRecords,
} from '../lib/storage';
import { User, Customer, Sale, Payment, Delivery, Settings, DashboardStats, MonthlyRecord, MonthlyDeliveryDetail, MonthlyPayment } from '../types';

interface AppContextType {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  register: (user: Omit<User, 'id' | 'createdAt'>) => boolean;
  logout: () => void;

  // Customers
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerById: (id: string) => Customer | undefined;

  // Sales
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'id' | 'createdAt'>) => void;

  // Payments
  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;

  // Deliveries
  deliveries: Delivery[];
  addDelivery: (delivery: Omit<Delivery, 'id'>) => void;
  updateDelivery: (id: string, updates: Partial<Delivery>) => void;
  getTodayDeliveries: () => Delivery[];
  getRecentDeliveries: (days?: number) => { date: string; deliveries: Delivery[] }[];
  generateDailyDeliveries: () => void;

  // Settings
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;

  // Dashboard
  getDashboardStats: () => DashboardStats;
  getCustomerDue: (customerId: string) => number;

  // Monthly Records (v2.0)
  monthlyRecords: MonthlyRecord[];
  initializeMonthlyRecords: () => void;
  getMonthlyRecord: (customerId: string, month?: string) => MonthlyRecord | undefined;
  getAllMonthlyRecords: (month?: string) => MonthlyRecord[];
  addPaymentToMonthlyRecord: (customerId: string, payment: Omit<MonthlyPayment, 'id'>) => void;
  closeMonth: (month: string) => void;
  getCurrentMonth: () => string;

  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [customers, setCustomersState] = useState<Customer[]>([]);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [payments, setPaymentsState] = useState<Payment[]>([]);
  const [deliveries, setDeliveriesState] = useState<Delivery[]>([]);
  const [monthlyRecords, setMonthlyRecordsState] = useState<MonthlyRecord[]>([]);
  const [settings, setSettingsState] = useState<Settings>(getSettings());
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const userData = getUser();
    const loggedIn = checkLoggedIn();
    if (userData && loggedIn) {
      setUserState(userData);
      setIsAuthenticated(true);
    }
    setCustomersState(getCustomers());
    setSalesState(getSales());
    setPaymentsState(getPayments());
    setDeliveriesState(getDeliveries());
    setMonthlyRecordsState(getMonthlyRecords());
    const savedSettings = getSettings();
    setSettingsState(savedSettings);
    setTheme(savedSettings.theme || 'light');
  }, []);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // v2.0: Listen for monthly record updates
  useEffect(() => {
    const handleMonthlyRecordUpdate = (event: CustomEvent<Delivery>) => {
      const delivery = event.detail;
      if (!delivery.customerId) return;

      const customer = customers.find(c => c.id === delivery.customerId);
      if (!customer || customer.type !== 'fixed') return;

      const month = delivery.date.substring(0, 7);
      let record = monthlyRecords.find(
        r => r.customerId === delivery.customerId && r.month === month
      );

      if (!record) {
        // Create new record
        const prevMonthDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        const prevRecord = monthlyRecords.find(
          r => r.customerId === delivery.customerId && r.month === prevMonthStr
        );

        record = {
          id: generateId(),
          customerId: delivery.customerId,
          customerName: delivery.customerName,
          month,
          totalDeliveryDays: 0,
          deliveredCount: 0,
          skippedCount: 0,
          skippedDates: [],
          deliveryDetails: [],
          previousBalance: prevRecord?.balanceDue || 0,
          currentMonthTotal: 0,
          totalDue: prevRecord?.balanceDue || 0,
          payments: [],
          totalPaid: 0,
          balanceDue: prevRecord?.balanceDue || 0,
          status: 'active',
          createdAt: new Date().toISOString(),
        };
      }

      // Calculate delivery total
      let deliveryTotal = 0;
      const items = delivery.items.map(item => {
        const amount = Math.round((item.price || 0) * item.quantity * 100) / 100;
        deliveryTotal += amount;
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price || 0,
          amount,
        };
      });

      const extraItems = delivery.extraItems?.map(item => {
        const amount = Math.round((item.price || 0) * item.quantity * 100) / 100;
        deliveryTotal += amount;
        return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price || 0,
          amount,
        };
      });

      const existingDetailIndex = record.deliveryDetails.findIndex(d => d.date === delivery.date);
      const newDetail: MonthlyDeliveryDetail = {
        date: delivery.date,
        status: delivery.status,
        items,
        extraItems,
        total: deliveryTotal,
        paidAmount: delivery.paidAmount || 0,
        paymentMode: delivery.paymentMode,
        skipReason: delivery.skipReason,
        skipNote: delivery.skipNote,
      };

      if (existingDetailIndex >= 0) {
        record.deliveryDetails[existingDetailIndex] = newDetail;
      } else {
        record.deliveryDetails.push(newDetail);
      }

      record.deliveredCount = record.deliveryDetails.filter(d => d.status === 'delivered').length;
      record.skippedCount = record.deliveryDetails.filter(d => d.status === 'skipped').length;
      record.totalDeliveryDays = record.deliveryDetails.length;

      record.skippedDates = record.deliveryDetails
        .filter(d => d.status === 'skipped')
        .map(d => ({ date: d.date, reason: d.skipReason || '', note: d.skipNote }));

      record.currentMonthTotal = record.deliveryDetails
        .filter(d => d.status === 'delivered')
        .reduce((sum, d) => sum + d.total, 0);

      record.totalDue = record.previousBalance + record.currentMonthTotal;
      record.totalPaid = record.payments.reduce((sum, p) => sum + p.amount, 0) +
                         record.deliveryDetails.reduce((sum, d) => sum + d.paidAmount, 0);
      record.balanceDue = Math.round((record.totalDue - record.totalPaid) * 100) / 100;

      const updatedRecords = monthlyRecords.filter(
        r => !(r.customerId === record!.customerId && r.month === record!.month)
      );
      updatedRecords.push(record);
      saveMonthlyRecords(updatedRecords);
      setMonthlyRecordsState(updatedRecords);
    };

    window.addEventListener('updateMonthlyRecord', handleMonthlyRecordUpdate as EventListener);
    return () => {
      window.removeEventListener('updateMonthlyRecord', handleMonthlyRecordUpdate as EventListener);
    };
  }, [customers, monthlyRecords]);

  // Auth functions
  const login = (email: string, password: string): boolean => {
    const savedUser = getUser();
    if (savedUser && savedUser.email === email && savedUser.password === password) {
      setUserState(savedUser);
      setIsAuthenticated(true);
      setLoggedIn(true);
      return true;
    }
    return false;
  };

  const register = (userData: Omit<User, 'id' | 'createdAt'>): boolean => {
    const newUser: User = {
      ...userData,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    saveUser(newUser);
    setUserState(newUser);
    setIsAuthenticated(true);
    setLoggedIn(true);

    // Sync shop info to settings
    const updatedSettings = {
      ...settings,
      shopName: userData.shopName,
      ownerName: userData.ownerName,
      phone: userData.phone,
    };
    saveSettings(updatedSettings);
    setSettingsState(updatedSettings);

    return true;
  };

  const logout = () => {
    doLogout();
    setIsAuthenticated(false);
  };

  // Customer functions
  const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const newCustomer: Customer = {
      ...customer,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    saveCustomer(newCustomer);
    setCustomersState([...customers, newCustomer]);
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    modifyCustomer(id, updates);
    setCustomersState(customers.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteCustomer = (id: string) => {
    removeCustomer(id);
    setCustomersState(customers.filter(c => c.id !== id));
  };

  const getCustomerById = (id: string) => customers.find(c => c.id === id);

  // Sales functions
  const addSale = (sale: Omit<Sale, 'id' | 'createdAt'>) => {
    const newSale: Sale = {
      ...sale,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    saveSale(newSale);
    setSalesState([...sales, newSale]);
  };

  // Payment functions
  const addPayment = (payment: Omit<Payment, 'id'>) => {
    const newPayment: Payment = {
      ...payment,
      id: generateId(),
    };
    savePayment(newPayment);
    setPaymentsState([...payments, newPayment]);
  };

  // Delivery functions
  const addDelivery = (delivery: Omit<Delivery, 'id'>) => {
    const newDelivery: Delivery = {
      ...delivery,
      id: generateId(),
    };
    saveDelivery(newDelivery);
    setDeliveriesState([...deliveries, newDelivery]);
  };

  const updateDelivery = (id: string, updates: Partial<Delivery>) => {
    modifyDelivery(id, updates);
    const updatedDeliveries = deliveries.map(d => d.id === id ? { ...d, ...updates } : d);
    setDeliveriesState(updatedDeliveries);

    // v2.0: Update monthly record when delivery is completed
    if (updates.status === 'delivered' || updates.status === 'skipped') {
      const updatedDelivery = updatedDeliveries.find(d => d.id === id);
      if (updatedDelivery) {
        // Schedule monthly record update (will be called after state is set)
        setTimeout(() => {
          const customer = customers.find(c => c.id === updatedDelivery.customerId);
          if (customer?.type === 'fixed') {
            // Trigger monthly record update via effect
            window.dispatchEvent(new CustomEvent('updateMonthlyRecord', { detail: updatedDelivery }));
          }
        }, 0);
      }
    }
  };

  const getTodayDeliveries = () => {
    const today = getTodayDate();
    return deliveries.filter(d => d.date === today);
  };

  // Get deliveries for recent days, grouped by date
  const getRecentDeliveries = (days: number = 7): { date: string; deliveries: Delivery[] }[] => {
    const result: { date: string; deliveries: Delivery[] }[] = [];
    const istToday = getISTDate();

    for (let i = 0; i < days; i++) {
      const date = new Date(istToday);
      date.setDate(date.getDate() - i);
      // Format as YYYY-MM-DD without using toISOString (which converts to UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayDeliveries = deliveries.filter(d => d.date === dateStr);
      if (dayDeliveries.length > 0 || i === 0) { // Always include today even if empty
        result.push({ date: dateStr, deliveries: dayDeliveries });
      }
    }

    return result;
  };

  const generateDailyDeliveries = () => {
    const today = getTodayDate();
    const todayDeliveries = deliveries.filter(d => d.date === today);
    const istDate = getISTDate(); // Use IST date instead of local/UTC
    const dayOfWeek = istDate.getDay(); // 0 = Sunday
    const dateOfMonth = istDate.getDate();

    // Get fixed customers
    const fixedCustomers = customers.filter(c => c.type === 'fixed');

    const newDeliveries: Delivery[] = [];

    fixedCustomers.forEach(customer => {
      // v2.2: Check both legacy defaultItems and new defaultItemsBySlot
      const hasLegacyItems = customer.defaultItems.length > 0;
      const hasSlotItems = customer.defaultItemsBySlot && Object.values(customer.defaultItemsBySlot).some(items => items && items.length > 0);
      if (!hasLegacyItems && !hasSlotItems) return;

      // Check if customer should have delivery today based on schedule
      const schedule = customer.schedule;
      let shouldDeliver = true;

      if (schedule) {
        switch (schedule.frequency) {
          case 'daily':
            shouldDeliver = true;
            break;
          case 'weekly':
            shouldDeliver = schedule.days?.includes(dayOfWeek) || false;
            break;
          case 'specific_days':
            shouldDeliver = schedule.days?.includes(dayOfWeek) || false;
            break;
          case 'specific_dates':
            shouldDeliver = schedule.dates?.includes(dateOfMonth) || false;
            break;
        }
      }

      if (shouldDeliver) {
        // Get time slots - support both old timeSlot and new timeSlots format
        const scheduleAny = schedule as any;
        const timeSlots = schedule?.timeSlots || (scheduleAny?.timeSlot ? [scheduleAny.timeSlot] : ['morning']);

        // Create delivery for each time slot if not already exists
        timeSlots.forEach((slot: 'morning' | 'noon' | 'evening') => {
          // Check if delivery already exists for this customer + slot combination
          const existsForSlot = todayDeliveries.some(
            d => d.customerId === customer.id && d.timeSlot === slot
          );

          if (!existsForSlot) {
            // v2.2: Use per-slot items if available, otherwise fall back to legacy defaultItems
            const slotItems = customer.defaultItemsBySlot?.[slot];
            const itemsToUse = (slotItems && slotItems.length > 0) ? slotItems : customer.defaultItems;

            const items = itemsToUse.map(item => {
              const product = settings.products.find(p => p.id === item.productId);
              return {
                productId: item.productId,
                productName: product?.name || 'Unknown',
                quantity: item.quantity,
                price: product?.price || 0,
              };
            });

            if (items.length > 0) {
              newDeliveries.push({
                id: generateId(),
                customerId: customer.id,
                customerName: customer.name,
                items,
                status: 'pending',
                isOneTime: false,
                timeSlot: slot,
                date: today,
                deliveredAt: null,
                paymentStatus: 'unpaid',
                paidAmount: 0,
              });
            }
          }
        });
      }
    });

    if (newDeliveries.length > 0) {
      const allDeliveries = [...deliveries, ...newDeliveries];
      setDeliveries(allDeliveries);
      setDeliveriesState(allDeliveries);
    }
  };

  // Settings functions
  const updateSettings = (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    saveSettings(newSettings);
    setSettingsState(newSettings);
    if (updates.theme) {
      setTheme(updates.theme);
    }
  };

  // Get customer due - Round to 2 decimal places to avoid floating point precision issues
  const getCustomerDue = (customerId: string): number => {
    const customerSales = sales.filter(s => s.customerId === customerId);
    const customerPayments = payments.filter(p => p.customerId === customerId);

    const totalDue = customerSales.reduce((sum, sale) => {
      if (sale.paymentType === 'due') {
        return sum + (sale.totalAmount - sale.paidAmount);
      }
      return sum;
    }, 0);

    const totalPaid = customerPayments.reduce((sum, payment) => sum + payment.amount, 0);

    // Round to 2 decimal places to avoid floating point precision issues like 0.40000000000036
    return Math.round((totalDue - totalPaid) * 100) / 100;
  };

  // Dashboard stats
  const getDashboardStats = (): DashboardStats => {
    const today = getTodayDate();
    const currentMonth = today.substring(0, 7);

    // Helper to check if a customer is fixed
    const isFixedCustomer = (customerId: string | null | undefined): boolean => {
      if (!customerId) return false;
      const customer = customers.find(c => c.id === customerId);
      return customer?.type === 'fixed';
    };

    // All sales for today and month
    const allTodaySales = sales.filter(s => s.date === today);
    const monthlySales = sales.filter(s => s.date.startsWith(currentMonth));

    // Today sales excluding fixed customers (for dashboard cards)
    const todaySalesNonFixed = allTodaySales.filter(s => !isFixedCustomer(s.customerId));

    // Today payments excluding fixed customers
    const allTodayPayments = payments.filter(p => p.date === today);
    const todayPaymentsNonFixed = allTodayPayments.filter(p => !isFixedCustomer(p.customerId));
    const monthlyPayments = payments.filter(p => p.date.startsWith(currentMonth));

    // Calculate milk sold (assuming product id '1' is milk)
    const getMilkQuantity = (salesList: Sale[]) => {
      return salesList.reduce((total, sale) => {
        const milkItem = sale.items.find(item => item.productId === '1');
        return total + (milkItem?.quantity || 0);
      }, 0);
    };

    // Calculate total dues - excluding fixed customers for dashboard
    const totalDuesNonFixed = customers
      .filter(c => c.type !== 'fixed')
      .reduce((sum, customer) => sum + getCustomerDue(customer.id), 0);

    // Round all currency values to avoid floating point precision issues
    return {
      todayMilkSold: Math.round(getMilkQuantity(todaySalesNonFixed) * 100) / 100,
      todaySales: Math.round(todaySalesNonFixed.reduce((sum, s) => sum + s.totalAmount, 0) * 100) / 100,
      todayCollection: Math.round((todaySalesNonFixed.reduce((sum, s) => sum + s.paidAmount, 0) +
                       todayPaymentsNonFixed.reduce((sum, p) => sum + p.amount, 0)) * 100) / 100,
      totalDues: Math.round(totalDuesNonFixed * 100) / 100,
      // Monthly stats include all customers (fixed + non-fixed)
      monthlyMilkSold: Math.round(getMilkQuantity(monthlySales) * 100) / 100,
      monthlySales: Math.round(monthlySales.reduce((sum, s) => sum + s.totalAmount, 0) * 100) / 100,
      monthlyCollection: Math.round((monthlySales.reduce((sum, s) => sum + s.paidAmount, 0) +
                         monthlyPayments.reduce((sum, p) => sum + p.amount, 0)) * 100) / 100,
    };
  };

  // v2.0 - Monthly Records Management
  const getCurrentMonth = (): string => {
    const istDate = getISTDate();
    const year = istDate.getFullYear();
    const month = String(istDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const initializeMonthlyRecords = () => {
    const currentMonth = getCurrentMonth();
    const fixedCustomers = customers.filter(c => c.type === 'fixed');

    const newRecords: MonthlyRecord[] = [];

    fixedCustomers.forEach(customer => {
      // Check if record already exists for this customer and month
      const existingRecord = monthlyRecords.find(
        r => r.customerId === customer.id && r.month === currentMonth
      );

      if (!existingRecord) {
        // Get previous month's balance
        const istDate = getISTDate();
        const prevMonth = new Date(istDate.getFullYear(), istDate.getMonth() - 1, 1);
        const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
        const prevRecord = monthlyRecords.find(
          r => r.customerId === customer.id && r.month === prevMonthStr
        );
        const previousBalance = prevRecord?.balanceDue || 0;

        const newRecord: MonthlyRecord = {
          id: generateId(),
          customerId: customer.id,
          customerName: customer.name,
          month: currentMonth,
          totalDeliveryDays: 0,
          deliveredCount: 0,
          skippedCount: 0,
          skippedDates: [],
          deliveryDetails: [],
          previousBalance,
          currentMonthTotal: 0,
          totalDue: previousBalance,
          payments: [],
          totalPaid: 0,
          balanceDue: previousBalance,
          status: 'active',
          createdAt: new Date().toISOString(),
        };

        newRecords.push(newRecord);
      }
    });

    if (newRecords.length > 0) {
      const allRecords = [...monthlyRecords, ...newRecords];
      saveMonthlyRecords(allRecords);
      setMonthlyRecordsState(allRecords);
    }
  };

  const getMonthlyRecord = (customerId: string, month?: string): MonthlyRecord | undefined => {
    const targetMonth = month || getCurrentMonth();
    return monthlyRecords.find(r => r.customerId === customerId && r.month === targetMonth);
  };

  const getAllMonthlyRecords = (month?: string): MonthlyRecord[] => {
    const targetMonth = month || getCurrentMonth();
    return monthlyRecords.filter(r => r.month === targetMonth);
  };

  const updateMonthlyRecordDelivery = (delivery: Delivery) => {
    if (!delivery.customerId) return;

    const customer = customers.find(c => c.id === delivery.customerId);
    if (!customer || customer.type !== 'fixed') return;

    const month = delivery.date.substring(0, 7); // "2024-12"
    let record = monthlyRecords.find(
      r => r.customerId === delivery.customerId && r.month === month
    );

    if (!record) {
      // Create new record if doesn't exist
      const prevMonthDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]) - 2, 1);
      const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
      const prevRecord = monthlyRecords.find(
        r => r.customerId === delivery.customerId && r.month === prevMonthStr
      );

      record = {
        id: generateId(),
        customerId: delivery.customerId,
        customerName: delivery.customerName,
        month,
        totalDeliveryDays: 0,
        deliveredCount: 0,
        skippedCount: 0,
        skippedDates: [],
        deliveryDetails: [],
        previousBalance: prevRecord?.balanceDue || 0,
        currentMonthTotal: 0,
        totalDue: prevRecord?.balanceDue || 0,
        payments: [],
        totalPaid: 0,
        balanceDue: prevRecord?.balanceDue || 0,
        status: 'active',
        createdAt: new Date().toISOString(),
      };
    }

    // Calculate delivery total
    let deliveryTotal = 0;
    const items = delivery.items.map(item => {
      const amount = Math.round((item.price || 0) * item.quantity * 100) / 100;
      deliveryTotal += amount;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price || 0,
        amount,
      };
    });

    const extraItems = delivery.extraItems?.map(item => {
      const amount = Math.round((item.price || 0) * item.quantity * 100) / 100;
      deliveryTotal += amount;
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price || 0,
        amount,
      };
    });

    // Check if this date already exists in delivery details
    const existingDetailIndex = record.deliveryDetails.findIndex(d => d.date === delivery.date);
    const newDetail: MonthlyDeliveryDetail = {
      date: delivery.date,
      status: delivery.status,
      items,
      extraItems,
      total: deliveryTotal,
      paidAmount: delivery.paidAmount || 0,
      paymentMode: delivery.paymentMode,
      skipReason: delivery.skipReason,
      skipNote: delivery.skipNote,
    };

    if (existingDetailIndex >= 0) {
      record.deliveryDetails[existingDetailIndex] = newDetail;
    } else {
      record.deliveryDetails.push(newDetail);
    }

    // Update counts
    record.deliveredCount = record.deliveryDetails.filter(d => d.status === 'delivered').length;
    record.skippedCount = record.deliveryDetails.filter(d => d.status === 'skipped').length;
    record.totalDeliveryDays = record.deliveryDetails.length;

    // Update skipped dates
    record.skippedDates = record.deliveryDetails
      .filter(d => d.status === 'skipped')
      .map(d => ({ date: d.date, reason: d.skipReason || '', note: d.skipNote }));

    // Calculate current month total (only delivered items)
    record.currentMonthTotal = record.deliveryDetails
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + d.total, 0);

    // Calculate total due and balance
    record.totalDue = record.previousBalance + record.currentMonthTotal;
    record.totalPaid = record.payments.reduce((sum, p) => sum + p.amount, 0) +
                       record.deliveryDetails.reduce((sum, d) => sum + d.paidAmount, 0);
    record.balanceDue = Math.round((record.totalDue - record.totalPaid) * 100) / 100;

    // Update records
    const updatedRecords = monthlyRecords.filter(
      r => !(r.customerId === record!.customerId && r.month === record!.month)
    );
    updatedRecords.push(record);
    saveMonthlyRecords(updatedRecords);
    setMonthlyRecordsState(updatedRecords);
  };

  const addPaymentToMonthlyRecord = (customerId: string, payment: Omit<MonthlyPayment, 'id'>) => {
    const currentMonth = getCurrentMonth();
    const record = monthlyRecords.find(
      r => r.customerId === customerId && r.month === currentMonth
    );

    if (!record) return;

    const newPayment: MonthlyPayment = {
      id: generateId(),
      ...payment,
    };

    const updatedRecord: MonthlyRecord = {
      ...record,
      payments: [...record.payments, newPayment],
      totalPaid: record.totalPaid + payment.amount,
      balanceDue: Math.round((record.balanceDue - payment.amount) * 100) / 100,
    };

    const updatedRecords = monthlyRecords.map(r =>
      r.id === record.id ? updatedRecord : r
    );

    saveMonthlyRecords(updatedRecords);
    setMonthlyRecordsState(updatedRecords);
  };

  const closeMonth = (month: string) => {
    const monthRecords = monthlyRecords.filter(r => r.month === month);

    const updatedRecords = monthlyRecords.map(r => {
      if (r.month === month) {
        return {
          ...r,
          status: 'closed' as const,
          closedAt: new Date().toISOString(),
        };
      }
      return r;
    });

    saveMonthlyRecords(updatedRecords);
    setMonthlyRecordsState(updatedRecords);

    // Initialize next month records
    setTimeout(() => initializeMonthlyRecords(), 100);
  };

  // Theme toggle
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerById,
        sales,
        addSale,
        payments,
        addPayment,
        deliveries,
        addDelivery,
        updateDelivery,
        getTodayDeliveries,
        getRecentDeliveries,
        generateDailyDeliveries,
        settings,
        updateSettings,
        getDashboardStats,
        getCustomerDue,
        monthlyRecords,
        initializeMonthlyRecords,
        getMonthlyRecord,
        getAllMonthlyRecords,
        addPaymentToMonthlyRecord,
        closeMonth,
        getCurrentMonth,
        theme,
        toggleTheme,
        sidebarOpen,
        setSidebarOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
