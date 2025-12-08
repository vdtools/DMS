import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/storage';
import {
  Search,
  Plus,
  Phone,
  MapPin,
  Filter,
  UserCheck,
  User,
  ChevronRight,
  Trash2,
} from 'lucide-react';

export default function Customers() {
  const location = useLocation();
  const isFixedOnly = location.pathname === '/fixed-customers';
  const { customers, getCustomerDue, deleteCustomer, sales, settings } = useApp();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with-due'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // For /customers page - show only non-fixed (random) customers
  // For /fixed-customers page - show only fixed customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      customer.name.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone.includes(search);

    // First filter by page type
    if (isFixedOnly) {
      if (customer.type !== 'fixed') return false;
    } else {
      // Customers page shows only non-fixed customers
      if (customer.type === 'fixed') return false;
    }

    // Then apply additional filters
    if (filter === 'with-due') return matchesSearch && getCustomerDue(customer.id) > 0;
    return matchesSearch;
  });

  const handleDelete = (id: string) => {
    deleteCustomer(id);
    setShowDeleteConfirm(null);
  };

  // Calculate stats for current tab
  const tabCustomers = customers.filter(c => isFixedOnly ? c.type === 'fixed' : c.type !== 'fixed');
  const totalCustomers = tabCustomers.length;
  const totalDues = tabCustomers.reduce((sum, c) => sum + getCustomerDue(c.id), 0);

  // v2.2: Calculate daily amount for fixed customers using per-slot items
  const calculateCustomerDailyAmount = (customer: any) => {
    let totalAmount = 0;
    const timeSlots = customer.schedule?.timeSlots || ['morning'];

    timeSlots.forEach((slot: string) => {
      // v2.2: Use per-slot items if available, otherwise fall back to legacy defaultItems
      const slotItems = customer.defaultItemsBySlot?.[slot];
      const itemsToUse = (slotItems && slotItems.length > 0) ? slotItems : customer.defaultItems;

      const slotAmount = itemsToUse.reduce((itemSum: number, item: any) => {
        const product = settings.products.find(p => p.id === item.productId);
        return itemSum + (product?.price || 0) * item.quantity;
      }, 0);
      totalAmount += slotAmount;
    });

    return totalAmount;
  };

  const dailyAmount = isFixedOnly
    ? tabCustomers.reduce((sum, customer) => sum + calculateCustomerDailyAmount(customer), 0)
    : 0;

  // v2.2: Calculate monthly amount with pro-rata from customer creation date
  const calculateProRataMonthlyAmount = () => {
    if (!isFixedOnly) return 0;

    const now = new Date();
    // Get IST date properly
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istNow = new Date(utc + (5.5 * 60 * 60000));
    const currentYear = istNow.getFullYear();
    const currentMonth = istNow.getMonth();
    const currentDate = istNow.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let totalMonthlyAmount = 0;

    tabCustomers.forEach(customer => {
      const customerDailyAmount = calculateCustomerDailyAmount(customer);

      // Parse customer creation date
      const createdAt = new Date(customer.createdAt);
      const createdYear = createdAt.getFullYear();
      const createdMonth = createdAt.getMonth();
      const createdDate = createdAt.getDate();

      // Calculate remaining days for this customer
      let remainingDays = daysInMonth;

      // If customer was created this month, calculate pro-rata
      if (createdYear === currentYear && createdMonth === currentMonth) {
        // Customer added today or later = remaining days from creation date
        remainingDays = daysInMonth - createdDate + 1; // +1 to include creation day
      }

      totalMonthlyAmount += customerDailyAmount * remainingDays;
    });

    return Math.round(totalMonthlyAmount);
  };

  const monthlyAmount = calculateProRataMonthlyAmount();

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total {isFixedOnly ? 'Fixed' : 'Random'} Customers</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalCustomers}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Dues</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDues)}</p>
        </div>
        {isFixedOnly && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily Amount</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(dailyAmount)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Amount</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(monthlyAmount)}</p>
            </div>
          </>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="with-due">With Due</option>
            </select>
          </div>
        </div>
      </div>

      {/* Add Customer Button */}
      <Link
        to="/add-customer"
        className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add New Customer
      </Link>

      {/* Customer List */}
      <div className="space-y-3">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => {
            const due = getCustomerDue(customer.id);
            return (
              <div
                key={customer.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <Link to={`/customer/${customer.id}`} className="flex-1">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          customer.type === 'fixed'
                            ? 'bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}
                      >
                        {customer.type === 'fixed' ? (
                          <UserCheck className="w-5 h-5 text-blue-500" />
                        ) : (
                          <User className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {customer.name}
                          </h3>
                          {customer.type === 'fixed' && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              Fixed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                        {customer.address && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <MapPin className="w-3 h-3" />
                            {customer.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    {due > 0 && (
                      <span className="px-2 py-1 text-sm font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                        {formatCurrency(due)}
                      </span>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(customer.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link to={`/customer/${customer.id}`}>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === customer.id && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                      Are you sure you want to delete this customer?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
            <User className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No customers found</p>
            <Link
              to="/add-customer"
              className="inline-flex items-center gap-1 mt-3 text-blue-600 dark:text-blue-400 font-medium"
            >
              <Plus className="w-4 h-4" />
              Add your first customer
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
