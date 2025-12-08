import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDate } from '../lib/storage';
import { SKIP_REASONS } from '../types';
import {
  Search,
  Phone,
  MessageCircle,
  CreditCard,
  Wallet,
  X,
  Check,
  Calendar,
  Users,
  UserCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  SkipForward,
  Banknote,
} from 'lucide-react';
import { exportMonthlyBillToPDF } from '../lib/pdfExport';

type TabType = 'random' | 'fixed';

export default function PendingDues() {
  const {
    customers,
    getCustomerDue,
    payments,
    addPayment,
    settings,
    monthlyRecords,
    getAllMonthlyRecords,
    addPaymentToMonthlyRecord,
    getCurrentMonth,
    initializeMonthlyRecords,
  } = useApp();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('random');
  const [paymentModal, setPaymentModal] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);

  // Initialize monthly records on load
  useEffect(() => {
    initializeMonthlyRecords();
  }, []);

  const currentMonth = getCurrentMonth();
  const currentMonthRecords = getAllMonthlyRecords(currentMonth);

  // Get month name
  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  // Get skip reason label
  const getSkipReasonLabel = (reason: string) => {
    const found = SKIP_REASONS.find(r => r.value === reason);
    return found?.label || reason;
  };

  // Random/Walk-in customers with dues
  const randomCustomersWithDue = customers
    .filter(c => c.type !== 'fixed')
    .map(customer => ({
      ...customer,
      dueAmount: getCustomerDue(customer.id),
      lastPayment: payments
        .filter(p => p.customerId === customer.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0],
    }))
    .filter(c => c.dueAmount > 0)
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
    .sort((a, b) => b.dueAmount - a.dueAmount);

  // Fixed customers with monthly records
  const fixedCustomersWithDue = customers
    .filter(c => c.type === 'fixed')
    .map(customer => {
      const monthlyRecord = currentMonthRecords.find(r => r.customerId === customer.id);
      const legacyDue = getCustomerDue(customer.id);
      return {
        ...customer,
        monthlyRecord,
        dueAmount: monthlyRecord?.balanceDue || legacyDue,
        previousBalance: monthlyRecord?.previousBalance || 0,
        currentMonthTotal: monthlyRecord?.currentMonthTotal || 0,
        deliveredCount: monthlyRecord?.deliveredCount || 0,
        skippedCount: monthlyRecord?.skippedCount || 0,
        totalDeliveryDays: monthlyRecord?.totalDeliveryDays || 0,
        skippedDates: monthlyRecord?.skippedDates || [],
        deliveryDetails: monthlyRecord?.deliveryDetails || [],
        payments: monthlyRecord?.payments || [],
        totalPaid: monthlyRecord?.totalPaid || 0,
      };
    })
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    )
    .sort((a, b) => b.dueAmount - a.dueAmount);

  const randomTotalDue = Math.round(randomCustomersWithDue.reduce((sum, c) => sum + c.dueAmount, 0) * 100) / 100;
  const fixedTotalDue = Math.round(fixedCustomersWithDue.reduce((sum, c) => sum + c.dueAmount, 0) * 100) / 100;

  const handleWhatsApp = (customer: any) => {
    let template = settings.whatsappTemplate ||
      `नमस्ते {customerName} जी, आपका बकाया राशि: ₹{dueAmount}. कृपया जल्द से जल्द भुगतान करें।`;

    const message = template
      .replace(/{shopName}/g, settings.shopName || '')
      .replace(/{shopPhone}/g, settings.phone || '')
      .replace(/{customerName}/g, customer.name)
      .replace(/{dueAmount}/g, customer.dueAmount.toString());

    window.open(`https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.open(`tel:+91${phone}`, '_blank');
  };

  const handlePayment = () => {
    if (!paymentModal || !paymentAmount) return;

    const customer = customers.find(c => c.id === paymentModal);

    if (customer?.type === 'fixed') {
      // Add to monthly record
      addPaymentToMonthlyRecord(paymentModal, {
        date: getTodayDate(),
        amount: Number(paymentAmount),
        mode: paymentMode,
        note: paymentNote,
      });
    }

    // Also add to regular payments
    addPayment({
      customerId: paymentModal,
      amount: Number(paymentAmount),
      paymentMode: paymentMode,
      date: getTodayDate(),
      note: paymentNote,
    });

    setPaymentModal(null);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentMode('cash');
  };

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Total Pending Dues</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(randomTotalDue + fixedTotalDue)}</p>
          </div>
          <div className="p-4 bg-white/20 rounded-xl">
            <CreditCard className="w-8 h-8" />
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-sm">
          <span className="text-white/80">
            Random: {formatCurrency(randomTotalDue)}
          </span>
          <span className="text-white/80">
            Fixed: {formatCurrency(fixedTotalDue)}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('random')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'random'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <Users className="w-4 h-4" />
          Random ({randomCustomersWithDue.length})
        </button>
        <button
          onClick={() => setActiveTab('fixed')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'fixed'
              ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Fixed ({fixedCustomersWithDue.length})
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Random Customers List */}
      {activeTab === 'random' && (
        <div className="space-y-3">
          {randomCustomersWithDue.length > 0 ? (
            randomCustomersWithDue.map((customer) => (
              <div
                key={customer.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(customer.dueAmount)}
                    </p>
                    {customer.lastPayment && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last paid: {formatDate(customer.lastPayment.date)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCall(customer.phone)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">Call</span>
                  </button>
                  <button
                    onClick={() => handleWhatsApp(customer)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentModal(customer.id);
                      setPaymentAmount(customer.dueAmount.toString());
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"
                  >
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm font-medium">Receive</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
              <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No pending dues</p>
            </div>
          )}
        </div>
      )}

      {/* Fixed Customers List */}
      {activeTab === 'fixed' && (
        <div className="space-y-3">
          {/* Month Header */}
          <div className="flex items-center gap-2 px-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-800 dark:text-white">
              {getMonthName(currentMonth)}
            </span>
          </div>

          {fixedCustomersWithDue.length > 0 ? (
            fixedCustomersWithDue.map((customer) => {
              const isExpanded = expandedCustomer === customer.id;

              return (
                <div
                  key={customer.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Customer Header */}
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {customer.name}
                          </h3>
                          <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                            Fixed
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {customer.phone}
                        </p>

                        {/* Quick Stats */}
                        <div className="flex gap-3 mt-2 text-xs">
                          <span className="flex items-center gap-1 text-green-600">
                            <Check className="w-3 h-3" />
                            {customer.deliveredCount} delivered
                          </span>
                          {customer.skippedCount > 0 && (
                            <span className="flex items-center gap-1 text-red-600">
                              <SkipForward className="w-3 h-3" />
                              {customer.skippedCount} skipped
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xl font-bold text-red-600 dark:text-red-400">
                            {formatCurrency(customer.dueAmount)}
                          </p>
                          <p className="text-xs text-gray-500">Balance Due</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                      {/* Financial Summary */}
                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Previous Balance</p>
                          <p className="text-lg font-semibold text-gray-800 dark:text-white">
                            {formatCurrency(customer.previousBalance)}
                          </p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
                          <p className="text-lg font-semibold text-gray-800 dark:text-white">
                            {formatCurrency(customer.currentMonthTotal)}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <p className="text-xs text-green-600 dark:text-green-400">Paid</p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(customer.totalPaid)}
                          </p>
                        </div>
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-xs text-red-600 dark:text-red-400">Balance Due</p>
                          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(customer.dueAmount)}
                          </p>
                        </div>
                      </div>

                      {/* Skipped Dates */}
                      {customer.skippedDates.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Skipped Dates:
                          </p>
                          <div className="space-y-1">
                            {customer.skippedDates.map((skip, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm p-2 bg-red-50 dark:bg-red-900/10 rounded-lg"
                              >
                                <span className="text-gray-700 dark:text-gray-300">
                                  {formatDate(skip.date)}
                                </span>
                                <span className="text-red-600 dark:text-red-400 text-xs">
                                  {getSkipReasonLabel(skip.reason)}
                                  {skip.note && ` - ${skip.note}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payments This Month */}
                      {customer.payments.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Payments Received:
                          </p>
                          <div className="space-y-1">
                            {customer.payments.map((payment, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-sm p-2 bg-green-50 dark:bg-green-900/10 rounded-lg"
                              >
                                <span className="text-gray-700 dark:text-gray-300">
                                  {formatDate(payment.date)} ({payment.mode})
                                </span>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {formatCurrency(payment.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleCall(customer.phone)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg"
                        >
                          <Phone className="w-4 h-4" />
                          Call
                        </button>
                        <button
                          onClick={() => handleWhatsApp(customer)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg"
                        >
                          <MessageCircle className="w-4 h-4" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            setPaymentModal(customer.id);
                            setPaymentAmount(customer.dueAmount.toString());
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg"
                        >
                          <Wallet className="w-4 h-4" />
                          Receive
                        </button>
                      </div>

                      {/* Generate Bill Button */}
                      <button
                        onClick={() => {
                          // Build monthly bill data
                          const deliveries = customer.deliveryDetails
                            .filter((d: any) => d.status === 'delivered')
                            .map((d: any) => ({
                              date: d.date,
                              items: d.items.map((item: any) => ({
                                name: item.productName,
                                quantity: item.quantity,
                                price: item.price,
                                total: item.amount,
                              })),
                              total: d.total,
                              paidAtDelivery: d.paidAmount || 0,
                            }));

                          const paymentsForBill = customer.payments.map((p: any) => ({
                            date: p.date,
                            amount: p.amount,
                            mode: p.mode,
                          }));

                          exportMonthlyBillToPDF({
                            shopName: settings.shopName,
                            shopPhone: settings.phone,
                            shopAddress: settings.address,
                            customerName: customer.name,
                            customerPhone: customer.phone,
                            customerAddress: customer.address || '',
                            month: getMonthName(currentMonth),
                            previousBalance: customer.previousBalance,
                            deliveries,
                            payments: paymentsForBill,
                            monthlyTotal: customer.currentMonthTotal,
                            totalPayments: customer.totalPaid,
                            balanceDue: customer.dueAmount,
                          });
                        }}
                        className="w-full mt-3 flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl"
                      >
                        <FileText className="w-5 h-5" />
                        Generate Monthly Bill
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm text-center">
              <UserCheck className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No fixed customers</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Add fixed customers to track monthly dues
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Receive Payment
              </h3>
              <button
                onClick={() => setPaymentModal(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMode('cash')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 ${
                    paymentMode === 'cash'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Banknote className={`w-5 h-5 ${paymentMode === 'cash' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={paymentMode === 'cash' ? 'text-green-600 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                    Cash
                  </span>
                </button>
                <button
                  onClick={() => setPaymentMode('online')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 ${
                    paymentMode === 'online'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMode === 'online' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={paymentMode === 'online' ? 'text-blue-600 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                    Online
                  </span>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a note"
                />
              </div>

              <button
                onClick={handlePayment}
                disabled={!paymentAmount || Number(paymentAmount) <= 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-5 h-5" />
                Confirm Payment - {formatCurrency(Number(paymentAmount) || 0)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
