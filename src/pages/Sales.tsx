import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/storage';
import {
  Plus,
  Search,
  ShoppingCart,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function Sales() {
  const { sales, getCustomerById, customers } = useApp();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);

  const getDateRange = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      return { start: todayStr, end: todayStr };
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return { start: weekAgo.toISOString().split('T')[0], end: todayStr };
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return { start: monthAgo.toISOString().split('T')[0], end: todayStr };
    }
    return null;
  };

  const filteredSales = sales
    .filter((sale) => {
      const matchesSearch = sale.customerName.toLowerCase().includes(search.toLowerCase());
      const dateRange = getDateRange();
      if (dateRange) {
        return matchesSearch && sale.date >= dateRange.start && sale.date <= dateRange.end;
      }
      return matchesSearch;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getPaymentBadge = (type: string) => {
    switch (type) {
      case 'cash':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'online':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'due':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Add Sale Button */}
      <Link
        to="/add-sale"
        className="flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
      >
        <Plus className="w-5 h-5" />
        Add New Sale
      </Link>

      {/* Sales List */}
      <div className="space-y-3">
        {filteredSales.length > 0 ? (
          filteredSales.map((sale) => (
            <div
              key={sale.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)}
                className="w-full p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <ShoppingCart className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                          {sale.customerName || 'Walk-in Customer'}
                        </h3>
                        {sale.customerId && (() => {
                          const customer = customers.find(c => c.id === sale.customerId);
                          if (customer) {
                            return (
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                customer.type === 'fixed'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                {customer.type === 'fixed' ? 'Fixed' : 'Random'}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-3 h-3 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(sale.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">
                        {formatCurrency(sale.totalAmount)}
                      </p>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${getPaymentBadge(sale.paymentType)}`}>
                        {sale.paymentType.charAt(0).toUpperCase() + sale.paymentType.slice(1)}
                      </span>
                    </div>
                    {expandedSale === sale.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedSale === sale.id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="mt-3 space-y-2">
                    {sale.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-gray-700 dark:text-gray-200">
                          {item.productName} x {item.quantity}
                        </span>
                        <span className="font-medium text-gray-800 dark:text-white">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 mt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        Total
                      </span>
                      <span className="font-bold text-lg text-gray-800 dark:text-white">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                    {sale.paymentType === 'due' && sale.paidAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Paid</span>
                        <span className="text-green-600 dark:text-green-400">
                          {formatCurrency(sale.paidAmount)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No sales found</p>
            <Link
              to="/add-sale"
              className="inline-flex items-center gap-1 mt-3 text-green-600 dark:text-green-400 font-medium"
            >
              <Plus className="w-4 h-4" />
              Create your first sale
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
