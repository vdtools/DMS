import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDate } from '../lib/storage';
import {
  Milk,
  IndianRupee,
  Wallet,
  AlertCircle,
  UserPlus,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Users,
  Calendar,
  Package,
} from 'lucide-react';

export default function Dashboard() {
  const { getDashboardStats, customers, sales, generateDailyDeliveries, getTodayDeliveries, settings } = useApp();
  const stats = getDashboardStats();
  const todayDeliveries = getTodayDeliveries();
  // Filter out cleared deliveries for Today's popup display
  const visibleTodayDeliveries = todayDeliveries.filter(d => !d.isCleared);
  const pendingDeliveries = visibleTodayDeliveries.filter(d => d.status === 'pending');
  const [productPeriod, setProductPeriod] = useState<'daily' | 'monthly'>('daily');

  // Calculate today's unique buying customers (walk-in + random, excluding fixed customers)
  const getTodayBuyingCustomers = () => {
    const today = getTodayDate();
    const todaySales = sales.filter(s => s.date === today);

    // Count unique walk-in and random customers
    let count = 0;
    const countedCustomerIds = new Set<string>();

    todaySales.forEach(sale => {
      // Walk-in customers (no customerId) - count each sale as 1 customer
      if (!sale.customerId) {
        count++;
        return;
      }

      // Skip if already counted
      if (countedCustomerIds.has(sale.customerId)) return;

      const customer = customers.find(c => c.id === sale.customerId);
      // Count only non-fixed (random) customers
      if (customer && customer.type !== 'fixed') {
        count++;
        countedCustomerIds.add(sale.customerId);
      }
    });

    return count;
  };

  const todayBuyingCustomers = getTodayBuyingCustomers();

  useEffect(() => {
    generateDailyDeliveries();
  }, []);

  // Calculate product-wise stats
  const getProductStats = () => {
    const today = getTodayDate();
    const currentMonth = today.substring(0, 7);

    const relevantSales = productPeriod === 'daily'
      ? sales.filter(s => s.date === today)
      : sales.filter(s => s.date.startsWith(currentMonth));

    const productStats: { [key: string]: number } = {};

    settings.products.forEach(product => {
      productStats[product.id] = 0;
    });

    relevantSales.forEach(sale => {
      sale.items.forEach(item => {
        if (productStats[item.productId] !== undefined) {
          productStats[item.productId] += item.quantity;
        }
      });
    });

    return settings.products
      .filter(p => p.isActive)
      .map(product => ({
        ...product,
        quantity: productStats[product.id] || 0,
      }))
      .filter(p => p.quantity > 0 || productPeriod === 'daily');
  };

  const productStats = getProductStats();

  // Dashboard stats - New order: Total Sales, Total Customers, Total Collection, Pending Dues
  const statCards = [
    {
      title: 'Today Sales',
      value: formatCurrency(stats.todaySales),
      icon: IndianRupee,
      color: 'bg-green-500',
      lightBg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: "Today's Customers",
      value: todayBuyingCustomers.toString(),
      icon: Users,
      color: 'bg-blue-500',
      lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Today Collection',
      value: formatCurrency(stats.todayCollection),
      icon: Wallet,
      color: 'bg-purple-500',
      lightBg: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: 'Pending Dues',
      value: formatCurrency(stats.totalDues),
      icon: AlertCircle,
      color: 'bg-red-500',
      lightBg: 'bg-red-50 dark:bg-red-900/20',
    },
  ];

  const quickActions = [
    {
      title: 'Add Customer',
      icon: UserPlus,
      link: '/add-customer',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      title: 'Add Sale',
      icon: ShoppingCart,
      link: '/add-sale',
      color: 'bg-green-600 hover:bg-green-700',
    },
    {
      title: 'View Dues',
      icon: CreditCard,
      link: '/pending-dues',
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.lightBg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-gray-800 dark:text-white">
              {stat.value}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.title}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              to={action.link}
              className={`flex flex-col items-center justify-center p-4 rounded-xl ${action.color} text-white transition-all hover:scale-105`}
            >
              <action.icon className="w-6 h-6 mb-2" />
              <span className="text-xs lg:text-sm font-medium text-center">{action.title}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Products Summary Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Products Summary
            </h2>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setProductPeriod('daily')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                productPeriod === 'daily'
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setProductPeriod('monthly')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                productPeriod === 'monthly'
                  ? 'bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {productStats.map((product) => (
            <div
              key={product.id}
              className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-center"
            >
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {product.quantity}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {product.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {product.unit}
              </p>
            </div>
          ))}
          {productStats.length === 0 && (
            <div className="col-span-full text-center py-4 text-gray-500 dark:text-gray-400">
              No sales data for this period
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary & Pending Deliveries */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              Monthly Summary
            </h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Total Sales</span>
              <span className="font-semibold text-gray-800 dark:text-white">
                {formatCurrency(stats.monthlySales)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Total Collection</span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(stats.monthlyCollection)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Pending Dues</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {formatCurrency(stats.totalDues)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-300">Milk Sold</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {stats.monthlyMilkSold} Liters
              </span>
            </div>
          </div>
        </div>

        {/* Today's Deliveries */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Today's Deliveries
              </h2>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pendingDeliveries.length} pending
            </span>
          </div>
          {pendingDeliveries.length > 0 ? (
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {pendingDeliveries.slice(0, 5).map((delivery) => (
                <div
                  key={delivery.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">
                      {delivery.customerName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {delivery.items.map(i => `${i.productName}: ${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No pending deliveries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
