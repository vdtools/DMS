import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate } from '../lib/storage';
import { exportReportToPDF } from '../lib/pdfExport';
import {
  Calendar,
  TrendingUp,
  Download,
  ChevronLeft,
  ChevronRight,
  Milk,
  IndianRupee,
  Wallet,
  Users,
} from 'lucide-react';

type ReportType = 'daily' | 'monthly' | 'yearly';

export default function Reports() {
  const { sales, payments, customers, getCustomerDue, settings } = useApp();
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDateRange = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const date = selectedDate.getDate();

    if (reportType === 'daily') {
      const start = new Date(year, month, date).toISOString().split('T')[0];
      return { start, end: start };
    } else if (reportType === 'monthly') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      return { start, end };
    } else {
      const start = new Date(year, 0, 1).toISOString().split('T')[0];
      const end = new Date(year, 11, 31).toISOString().split('T')[0];
      return { start, end };
    }
  };

  const dateRange = getDateRange();

  const filteredSales = sales.filter(
    s => s.date >= dateRange.start && s.date <= dateRange.end
  );

  const filteredPayments = payments.filter(
    p => p.date >= dateRange.start && p.date <= dateRange.end
  );

  // Calculate statistics
  const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCollection = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0) +
                          filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = totalSales - totalCollection + filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  // Milk quantity
  const milkSold = filteredSales.reduce((total, sale) => {
    const milkItem = sale.items.find(item => item.productId === '1');
    return total + (milkItem?.quantity || 0);
  }, 0);

  // Product-wise breakdown
  const productBreakdown = settings.products.map(product => {
    const quantity = filteredSales.reduce((total, sale) => {
      const item = sale.items.find(i => i.productId === product.id);
      return total + (item?.quantity || 0);
    }, 0);
    const amount = filteredSales.reduce((total, sale) => {
      const item = sale.items.find(i => i.productId === product.id);
      return total + (item?.total || 0);
    }, 0);
    return { ...product, quantity, amount };
  }).filter(p => p.quantity > 0);

  // Payment method breakdown
  const paymentBreakdown = {
    cash: filteredSales.filter(s => s.paymentType === 'cash').reduce((sum, s) => sum + s.totalAmount, 0),
    online: filteredSales.filter(s => s.paymentType === 'online').reduce((sum, s) => sum + s.totalAmount, 0),
    due: filteredSales.filter(s => s.paymentType === 'due').reduce((sum, s) => sum + s.totalAmount, 0),
  };

  const navigateDate = (direction: number) => {
    const newDate = new Date(selectedDate);
    if (reportType === 'daily') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (reportType === 'monthly') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setSelectedDate(newDate);
  };

  const getDateLabel = () => {
    if (reportType === 'daily') {
      return formatDate(selectedDate.toISOString().split('T')[0]);
    } else if (reportType === 'monthly') {
      return selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } else {
      return selectedDate.getFullYear().toString();
    }
  };

  const exportToPDF = () => {
    exportReportToPDF({
      shopName: settings.shopName,
      reportTitle: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
      dateRange: getDateLabel(),
      stats: [
        { label: 'Total Sales', value: formatCurrency(totalSales) },
        { label: 'Total Collection', value: formatCurrency(totalCollection) },
        { label: 'Milk Sold', value: `${milkSold} Liters` },
        { label: 'Total Transactions', value: filteredSales.length.toString() },
        { label: 'Pending Dues', value: formatCurrency(paymentBreakdown.due - filteredPayments.reduce((s, p) => s + p.amount, 0)) },
      ],
      products: productBreakdown.map(p => ({
        name: p.name,
        quantity: `${p.quantity} ${p.unit}`,
        amount: formatCurrency(p.amount),
      })),
      payments: [
        { type: 'Cash', amount: formatCurrency(paymentBreakdown.cash) },
        { type: 'Online', amount: formatCurrency(paymentBreakdown.online) },
        { type: 'Due', amount: formatCurrency(paymentBreakdown.due) },
      ],
    });
  };

  return (
    <div className="space-y-4">
      {/* Report Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow-sm">
        <div className="grid grid-cols-3 gap-2">
          {(['daily', 'monthly', 'yearly'] as ReportType[]).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`py-3 rounded-lg font-medium transition-all ${
                reportType === type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Date Navigator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-800 dark:text-white">
              {getDateLabel()}
            </span>
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <IndianRupee className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatCurrency(totalSales)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
              <Wallet className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {formatCurrency(totalCollection)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Collection</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <Milk className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {milkSold} L
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Milk Sold</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                {filteredSales.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Breakdown */}
      {productBreakdown.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
            Product Breakdown
          </h3>
          <div className="space-y-3">
            {productBreakdown.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">{product.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {product.quantity} {product.unit}
                  </p>
                </div>
                <span className="font-semibold text-gray-800 dark:text-white">
                  {formatCurrency(product.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">
          Payment Breakdown
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="font-medium text-green-700 dark:text-green-400">Cash</span>
            <span className="font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(paymentBreakdown.cash)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="font-medium text-blue-700 dark:text-blue-400">Online</span>
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              {formatCurrency(paymentBreakdown.online)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <span className="font-medium text-red-700 dark:text-red-400">Due</span>
            <span className="font-semibold text-red-700 dark:text-red-400">
              {formatCurrency(paymentBreakdown.due)}
            </span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={exportToPDF}
        className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
      >
        <Download className="w-5 h-5" />
        Export Report
      </button>
    </div>
  );
}
