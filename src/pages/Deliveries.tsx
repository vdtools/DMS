import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate, getTodayDate, formatCurrency } from '../lib/storage';
import { SKIP_REASONS, SkipReason } from '../types';
import {
  Truck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  UserCheck,
  Filter,
  Sun,
  Sunset,
  Plus,
  X,
  Check,
  Wallet,
  Banknote,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Calendar,
  SkipForward,
} from 'lucide-react';

type TimeSlot = 'morning' | 'noon' | 'evening';
type StatusFilter = 'all' | 'pending' | 'delivered' | 'skipped';
type TypeFilter = 'all' | 'fixed' | 'random';

const TIME_SLOTS = {
  morning: { label: 'Morning', time: '5:00 AM', icon: Sun, order: 1 },
  noon: { label: 'Noon', time: '12:00 PM', icon: Clock, order: 2 },
  evening: { label: 'Evening', time: '6:00 PM', icon: Sunset, order: 3 },
};

export default function Deliveries() {
  const { getTodayDeliveries, getRecentDeliveries, generateDailyDeliveries, updateDelivery, addSale, customers, settings } = useApp();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [timeSlotFilter, setTimeSlotFilter] = useState<TimeSlot | 'all'>('all');
  const [addItemModal, setAddItemModal] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemAmount, setItemAmount] = useState('');
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'due'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  // Skip modal state
  const [showSkipModal, setShowSkipModal] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<SkipReason>('ghar_pe_nahi');
  const [skipNote, setSkipNote] = useState<string>('');
  // Date-wise expanded state - today open by default
  const today = getTodayDate();
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set([today]));

  useEffect(() => {
    generateDailyDeliveries();
  }, []);

  const deliveries = getTodayDeliveries();
  const recentDeliveries = getRecentDeliveries(7); // Last 7 days

  const toggleDateExpand = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const isToday = (dateStr: string) => dateStr === today;

  // Calculate total for a delivery
  const calculateDeliveryTotal = (delivery: any): number => {
    let total = 0;
    delivery.items.forEach((item: any) => {
      const product = settings.products.find(p => p.id === item.productId);
      total += (product?.price || 0) * item.quantity;
    });
    if (delivery.extraItems) {
      delivery.extraItems.forEach((item: any) => {
        const product = settings.products.find(p => p.id === item.productId);
        total += (product?.price || 0) * item.quantity;
      });
    }
    return Math.round(total);
  };

  // Filter and sort deliveries
  const filteredDeliveries = deliveries
    .filter(d => {
      // Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // Time slot filter
      if (timeSlotFilter !== 'all' && d.timeSlot !== timeSlotFilter) return false;

      // Type filter (fixed/random based on customer type)
      if (typeFilter !== 'all') {
        const customer = customers.find(c => c.id === d.customerId);
        if (typeFilter === 'fixed' && (!customer || customer.type !== 'fixed')) return false;
        if (typeFilter === 'random' && customer?.type === 'fixed') return false;
      }

      return true;
    })
    // Sort: pending first, then by time slot
    .sort((a, b) => {
      // First sort by status (pending first, then delivered, then skipped)
      const statusOrder = { pending: 0, delivered: 1, skipped: 2 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) -
                        (statusOrder[b.status as keyof typeof statusOrder] || 0);
      if (statusDiff !== 0) return statusDiff;

      // Then sort by time slot
      const slotOrderA = TIME_SLOTS[a.timeSlot as TimeSlot]?.order || 1;
      const slotOrderB = TIME_SLOTS[b.timeSlot as TimeSlot]?.order || 1;
      return slotOrderA - slotOrderB;
    });

  // Mark as delivered (Due mode - no payment)
  const handleMarkDelivered = (id: string) => {
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;

    const total = calculateDeliveryTotal(delivery);

    // Create sale items
    const saleItems = delivery.items.map((item: any) => {
      const product = settings.products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: product?.price || 0,
        total: Math.round((product?.price || 0) * item.quantity),
      };
    });

    // Add extra items if any
    if (delivery.extraItems) {
      delivery.extraItems.forEach((item: any) => {
        const product = settings.products.find(p => p.id === item.productId);
        saleItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: product?.price || 0,
          total: Math.round((product?.price || 0) * item.quantity),
        });
      });
    }

    // Create sale with due payment type
    addSale({
      customerId: delivery.isWalkIn ? null : delivery.customerId,
      customerName: delivery.customerName,
      items: saleItems,
      totalAmount: total,
      paymentType: 'due',
      paidAmount: 0,
      date: getTodayDate(),
      deliveryId: delivery.id,
      isFromDelivery: true,
    });

    // Update delivery status
    updateDelivery(id, {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      paymentStatus: 'unpaid',
      paidAmount: 0,
      paymentMode: 'due',
    });
  };

  // Handle payment modal submission
  const handlePaymentSubmit = () => {
    if (!showPaymentModal) return;
    const delivery = deliveries.find(d => d.id === showPaymentModal);
    if (!delivery) return;

    const total = calculateDeliveryTotal(delivery);
    const paidAmount = paymentMode === 'due' ? 0 : Math.round(parseInt(paymentAmount) || total);

    // Create sale items
    const saleItems = delivery.items.map((item: any) => {
      const product = settings.products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: product?.price || 0,
        total: Math.round((product?.price || 0) * item.quantity),
      };
    });

    // Add extra items if any
    if (delivery.extraItems) {
      delivery.extraItems.forEach((item: any) => {
        const product = settings.products.find(p => p.id === item.productId);
        saleItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: product?.price || 0,
          total: Math.round((product?.price || 0) * item.quantity),
        });
      });
    }

    // Create sale
    addSale({
      customerId: delivery.isWalkIn ? null : delivery.customerId,
      customerName: delivery.customerName,
      items: saleItems,
      totalAmount: total,
      paymentType: paymentMode,
      paidAmount: paidAmount,
      date: getTodayDate(),
      deliveryId: delivery.id,
      isFromDelivery: true,
    });

    // Determine payment status
    let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
    if (paidAmount >= total) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    // Update delivery
    updateDelivery(showPaymentModal, {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
      paymentStatus,
      paidAmount,
      paymentMode,
    });

    // Reset payment modal
    setShowPaymentModal(null);
    setPaymentMode('cash');
    setPaymentAmount('');
  };

  const handleSkipDelivery = () => {
    if (!showSkipModal) return;
    updateDelivery(showSkipModal, {
      status: 'skipped',
      skipReason: skipReason,
      skipNote: skipReason === 'other' ? skipNote : undefined,
    });
    setShowSkipModal(null);
    setSkipReason('ghar_pe_nahi');
    setSkipNote('');
  };

  const handleAddItem = () => {
    if (!addItemModal || !selectedProduct || Number(itemQuantity) <= 0) return;

    const delivery = deliveries.find(d => d.id === addItemModal);
    if (!delivery) return;

    const product = settings.products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newExtraItem = {
      productId: product.id,
      productName: product.name,
      quantity: Number(itemQuantity),
    };

    const existingExtras = delivery.extraItems || [];
    const existingIndex = existingExtras.findIndex((e: any) => e.productId === selectedProduct);

    let updatedExtras;
    if (existingIndex >= 0) {
      updatedExtras = existingExtras.map((e: any, i: number) =>
        i === existingIndex ? { ...e, quantity: e.quantity + Number(itemQuantity) } : e
      );
    } else {
      updatedExtras = [...existingExtras, newExtraItem];
    }

    updateDelivery(addItemModal, { extraItems: updatedExtras });
    setAddItemModal(null);
    setSelectedProduct('');
    setItemQuantity('1');
    setItemAmount('');
  };

  // Handle quantity change and sync amount
  const handleQuantityChange = (qty: string) => {
    setItemQuantity(qty);
    if (selectedProduct) {
      const product = settings.products.find(p => p.id === selectedProduct);
      if (product && qty) {
        setItemAmount(Math.round(product.price * parseFloat(qty)).toString());
      }
    }
  };

  // Handle amount change and sync quantity
  const handleAmountChange = (amt: string) => {
    setItemAmount(amt);
    if (selectedProduct) {
      const product = settings.products.find(p => p.id === selectedProduct);
      if (product && amt) {
        const qty = Math.round((parseFloat(amt) / product.price) * 100) / 100;
        setItemQuantity(qty > 0 ? qty.toString() : '0.01');
      }
    }
  };

  // Update amount when product changes
  const handleProductChange = (productId: string) => {
    setSelectedProduct(productId);
    const product = settings.products.find(p => p.id === productId);
    if (product) {
      setItemAmount(Math.round(product.price).toString());
      setItemQuantity('1');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'skipped':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'skipped':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
    }
  };

  // Stats
  const totalDeliveries = deliveries.length;
  const deliveredCount = deliveries.filter(d => d.status === 'delivered').length;
  const pendingCount = deliveries.filter(d => d.status === 'pending').length;
  const skippedCount = deliveries.filter(d => d.status === 'skipped').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Today's Deliveries</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(getTodayDate())}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{totalDeliveries}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-red-600">{skippedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Skipped</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters</span>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Status Filter */}
          <div className="flex gap-1">
            {(['all', 'pending', 'delivered', 'skipped'] as StatusFilter[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                typeFilter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Users className="w-3 h-3" />
              All
            </button>
            <button
              onClick={() => setTypeFilter('fixed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                typeFilter === 'fixed'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              Fixed
            </button>
            <button
              onClick={() => setTypeFilter('random')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1 ${
                typeFilter === 'random'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              <Users className="w-3 h-3" />
              Random
            </button>
          </div>

          {/* Time Slot Filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setTimeSlotFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                timeSlotFilter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              All Time
            </button>
            {(Object.entries(TIME_SLOTS) as [TimeSlot, typeof TIME_SLOTS[TimeSlot]][]).map(([slot, config]) => (
              <button
                key={slot}
                onClick={() => setTimeSlotFilter(slot)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  timeSlotFilter === slot
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date-wise Deliveries List */}
      <div className="space-y-4">
        {recentDeliveries.map(({ date, deliveries: dayDeliveries }) => {
          const isExpanded = expandedDates.has(date);
          const todayFlag = isToday(date);

          // Filter deliveries for this date based on current filters
          const filteredDayDeliveries = dayDeliveries
            .filter(d => {
              if (statusFilter !== 'all' && d.status !== statusFilter) return false;
              if (timeSlotFilter !== 'all' && d.timeSlot !== timeSlotFilter) return false;
              if (typeFilter !== 'all') {
                const customer = customers.find(c => c.id === d.customerId);
                if (typeFilter === 'fixed' && (!customer || customer.type !== 'fixed')) return false;
                if (typeFilter === 'random' && customer?.type === 'fixed') return false;
              }
              return true;
            })
            .sort((a, b) => {
              const statusOrder = { pending: 0, delivered: 1, skipped: 2 };
              const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) -
                                (statusOrder[b.status as keyof typeof statusOrder] || 0);
              if (statusDiff !== 0) return statusDiff;
              const slotOrderA = TIME_SLOTS[a.timeSlot as TimeSlot]?.order || 1;
              const slotOrderB = TIME_SLOTS[b.timeSlot as TimeSlot]?.order || 1;
              return slotOrderA - slotOrderB;
            });

          const pendingCount = dayDeliveries.filter(d => d.status === 'pending').length;
          const deliveredCount = dayDeliveries.filter(d => d.status === 'delivered').length;
          const skippedCount = dayDeliveries.filter(d => d.status === 'skipped').length;

          return (
            <div key={date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              {/* Date Header - Collapsible */}
              <button
                onClick={() => toggleDateExpand(date)}
                className={`w-full flex items-center justify-between p-4 ${
                  todayFlag ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className={`w-5 h-5 ${todayFlag ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <p className={`font-semibold ${todayFlag ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-white'}`}>
                      {todayFlag ? "Today" : formatDate(date)}
                    </p>
                    <div className="flex gap-3 text-xs mt-0.5">
                      <span className="text-green-600">{deliveredCount} delivered</span>
                      <span className="text-yellow-600">{pendingCount} pending</span>
                      {skippedCount > 0 && <span className="text-red-600">{skippedCount} skipped</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {dayDeliveries.length} total
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Deliveries for this date */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {filteredDayDeliveries.length > 0 ? (
                    filteredDayDeliveries.map((delivery) => {
                      const customer = customers.find(c => c.id === delivery.customerId);
                      const total = calculateDeliveryTotal(delivery);
                      return (
                        <div
                          key={delivery.id}
                          className={`rounded-xl p-4 border-l-4 bg-gray-50 dark:bg-gray-700 ${
                            delivery.status === 'delivered'
                              ? 'border-green-500'
                              : delivery.status === 'skipped'
                              ? 'border-red-500'
                              : 'border-yellow-500'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(delivery.status)}
                              <div>
                                <p className="font-medium text-gray-800 dark:text-white">
                                  {delivery.customerName}
                                </p>
                                <div className="flex gap-2 text-xs">
                                  <span className={`px-2 py-0.5 rounded-full ${
                                    customer?.type === 'fixed'
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                      : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {customer?.type === 'fixed' ? 'Fixed' : delivery.isWalkIn ? 'Walk-in' : 'Random'}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {TIME_SLOTS[delivery.timeSlot as TimeSlot]?.label || 'Morning'}
                                  </span>
                                  {delivery.isOneTime && (
                                    <span className="text-purple-600 dark:text-purple-400">One-time</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(delivery.status)}`}>
                              {delivery.status}
                            </span>
                          </div>

                          {/* Items */}
                          <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            {delivery.items.map((item: any, idx: number) => (
                              <span key={item.productId}>
                                {item.productName}: {item.quantity}
                                {idx < delivery.items.length - 1 ? ', ' : ''}
                              </span>
                            ))}
                          </div>

                          {/* Extra Items */}
                          {delivery.extraItems && delivery.extraItems.length > 0 && (
                            <div className="text-sm text-blue-600 dark:text-blue-400 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <span className="font-medium">Extra: </span>
                              {delivery.extraItems.map((item: any, idx: number) => (
                                <span key={item.productId}>
                                  {item.productName}: {item.quantity}
                                  {idx < delivery.extraItems!.length - 1 ? ', ' : ''}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Total Amount */}
                          <div className="flex items-center justify-between mb-2 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Total:</span>
                            <span className="font-bold text-gray-800 dark:text-white">
                              {formatCurrency(total)}
                            </span>
                          </div>

                          {/* Actions for pending deliveries - only for today */}
                          {delivery.status === 'pending' && todayFlag && (
                            <div className="flex gap-2 mt-3">
                              {/* Deliver button - not for walk-in customers */}
                              {!delivery.isWalkIn && (
                                <button
                                  onClick={() => handleMarkDelivered(delivery.id)}
                                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                                  title="Mark Delivered (Due)"
                                >
                                  <Check className="w-4 h-4" />
                                  Deliver
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setPaymentAmount(total.toString());
                                  setPaymentMode('cash');
                                  setShowPaymentModal(delivery.id);
                                }}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg"
                                title="Receive Payment"
                              >
                                <Wallet className="w-4 h-4" />
                                Payment
                              </button>
                              <button
                                onClick={() => setAddItemModal(delivery.id)}
                                className="flex items-center justify-center gap-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setShowSkipModal(delivery.id)}
                                className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded-lg"
                                title="Skip Delivery"
                              >
                                <SkipForward className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Show payment info for delivered items */}
                          {delivery.status === 'delivered' && delivery.paymentStatus && (
                            <div className={`text-xs px-2 py-1 rounded mt-1 inline-block ${
                              delivery.paymentStatus === 'paid'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : delivery.paymentStatus === 'partial'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {delivery.paymentStatus === 'paid' ? 'Paid' :
                               delivery.paymentStatus === 'partial' ? `Partial: ${formatCurrency(delivery.paidAmount || 0)}` :
                               'Unpaid (Due)'}
                            </div>
                          )}

                          {delivery.deliveredAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Delivered at {new Date(delivery.deliveredAt).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No deliveries match filters</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {recentDeliveries.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <Truck className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No deliveries found</p>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {addItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Add Extra Items
              </h3>
              <button
                onClick={() => setAddItemModal(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product
                </label>
                <select
                  value={selectedProduct}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="">Select Product</option>
                  {settings.products.filter(p => p.isActive).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Rs.{product.price}/{product.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={itemQuantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    or Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemAmount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <button
                onClick={handleAddItem}
                disabled={!selectedProduct || Number(itemQuantity) <= 0}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (() => {
        const delivery = deliveries.find(d => d.id === showPaymentModal);
        if (!delivery) return null;
        const total = calculateDeliveryTotal(delivery);
        const paidAmt = parseInt(paymentAmount) || 0;
        const remainingDue = paymentMode === 'due' ? total : Math.max(0, total - paidAmt);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Payment - {delivery.customerName}
                </h3>
                <button
                  onClick={() => {
                    setShowPaymentModal(null);
                    setPaymentMode('cash');
                    setPaymentAmount('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Items Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Items:</p>
                {delivery.items.map((item: any) => {
                  const product = settings.products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.productName} x {item.quantity}
                      </span>
                      <span className="text-gray-800 dark:text-white">
                        {formatCurrency(Math.round((product?.price || 0) * item.quantity))}
                      </span>
                    </div>
                  );
                })}
                {delivery.extraItems?.map((item: any) => {
                  const product = settings.products.find(p => p.id === item.productId);
                  return (
                    <div key={`extra-${item.productId}`} className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
                      <span>{item.productName} x {item.quantity} (Extra)</span>
                      <span>{formatCurrency(Math.round((product?.price || 0) * item.quantity))}</span>
                    </div>
                  );
                })}
                <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-gray-800 dark:text-white">Total</span>
                  <span className="text-gray-800 dark:text-white">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <button
                  onClick={() => {
                    setPaymentMode('cash');
                    setPaymentAmount(total.toString());
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMode === 'cash'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Banknote className={`w-5 h-5 ${paymentMode === 'cash' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${paymentMode === 'cash' ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>
                    Cash
                  </span>
                </button>

                <button
                  onClick={() => {
                    setPaymentMode('online');
                    setPaymentAmount(total.toString());
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMode === 'online'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <CreditCard className={`w-5 h-5 ${paymentMode === 'online' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${paymentMode === 'online' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                    Online
                  </span>
                </button>

                <button
                  onClick={() => {
                    setPaymentMode('due');
                    setPaymentAmount('0');
                  }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                    paymentMode === 'due'
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Wallet className={`w-5 h-5 ${paymentMode === 'due' ? 'text-red-500' : 'text-gray-400'}`} />
                  <span className={`text-xs font-medium ${paymentMode === 'due' ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>
                    Due
                  </span>
                </button>
              </div>

              {/* Amount Input (for Cash/Online) */}
              {paymentMode !== 'due' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount Received
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-bold"
                  />
                  {remainingDue > 0 && paidAmt < total && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      Remaining Due: {formatCurrency(remainingDue)}
                    </p>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handlePaymentSubmit}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
              >
                <Check className="w-5 h-5" />
                {paymentMode === 'due' ? 'Mark as Due' : `Receive ${formatCurrency(paidAmt)}`}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Skip Reason Modal */}
      {showSkipModal && (() => {
        const allDeliveries = recentDeliveries.flatMap(rd => rd.deliveries);
        const delivery = allDeliveries.find(d => d.id === showSkipModal);
        if (!delivery) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Skip - {delivery.customerName}
                </h3>
                <button
                  onClick={() => {
                    setShowSkipModal(null);
                    setSkipReason('ghar_pe_nahi');
                    setSkipNote('');
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Skip Reason Selection */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Reason kya hai?
                </p>
                <div className="space-y-2">
                  {SKIP_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setSkipReason(reason.value)}
                      className={`w-full p-3 text-left rounded-xl border-2 transition-all ${
                        skipReason === reason.value
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className={`text-sm ${
                        skipReason === reason.value
                          ? 'text-red-600 dark:text-red-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {reason.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Note for Other */}
              {skipReason === 'other' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Note likho
                  </label>
                  <input
                    type="text"
                    value={skipNote}
                    onChange={(e) => setSkipNote(e.target.value)}
                    placeholder="Reason batao..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handleSkipDelivery}
                disabled={skipReason === 'other' && !skipNote.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl disabled:opacity-50"
              >
                <SkipForward className="w-5 h-5" />
                Skip Delivery
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
