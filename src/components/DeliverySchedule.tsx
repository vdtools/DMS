import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatDate, getTodayDate, formatCurrency } from '../lib/storage';
import { Delivery, DeliveryItem, SKIP_REASONS, SkipReason } from '../types';
import {
  Truck,
  X,
  Check,
  SkipForward,
  Plus,
  Minus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Sun,
  Sunset,
  Moon,
  Package,
  Maximize2,
  Minimize2,
  UserPlus,
  Phone,
  MapPin,
  Wallet,
  Banknote,
  CreditCard,
} from 'lucide-react';

type TimeSlot = 'morning' | 'noon' | 'evening';

const TIME_SLOTS = {
  morning: { label: 'Morning', time: '5:00 AM', icon: Sun, startHour: 5, endHour: 12 },
  noon: { label: 'Noon', time: '12:00 PM', icon: Clock, startHour: 12, endHour: 18 },
  evening: { label: 'Evening', time: '6:00 PM', icon: Sunset, startHour: 18, endHour: 24 },
};

export default function DeliverySchedule() {
  const {
    getTodayDeliveries,
    generateDailyDeliveries,
    updateDelivery,
    addDelivery,
    addSale,
    addCustomer,
    customers,
    settings,
  } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExtraItemsModal, setShowExtraItemsModal] = useState<string | null>(null);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInAddress, setWalkInAddress] = useState('');
  const [oneTimeItems, setOneTimeItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [amountInputs, setAmountInputs] = useState<{ [key: string]: string }>({});
  const [extraItems, setExtraItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [extraAmountInputs, setExtraAmountInputs] = useState<{ [key: string]: string }>({});
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot>('morning');
  const [oneTimeDeliverySlot, setOneTimeDeliverySlot] = useState<TimeSlot>('morning');
  const [currentISTHour, setCurrentISTHour] = useState<number>(5);
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online' | 'due'>('cash');
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  // Skip modal state
  const [showSkipModal, setShowSkipModal] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState<SkipReason>('ghar_pe_nahi');
  const [skipNote, setSkipNote] = useState<string>('');

  useEffect(() => {
    generateDailyDeliveries();
  }, []);

  // Get current IST hour and time slot
  const getISTHour = (): number => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ist = new Date(utc + (5.5 * 60 * 60000));
    return ist.getHours();
  };

  const getCurrentTimeSlot = (): TimeSlot => {
    const hour = getISTHour();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'noon';
    return 'evening';
  };

  // Check if a time slot has started based on current IST time
  const hasTimeSlotStarted = (slot: TimeSlot): boolean => {
    const hour = currentISTHour;
    switch (slot) {
      case 'morning':
        return hour >= 5; // Morning starts at 5 AM
      case 'noon':
        return hour >= 12; // Noon starts at 12 PM
      case 'evening':
        return hour >= 18; // Evening starts at 6 PM
      default:
        return false;
    }
  };

  // Update current IST hour and time slot
  useEffect(() => {
    const updateTime = () => {
      const hour = getISTHour();
      setCurrentISTHour(hour);
      setSelectedTimeSlot(getCurrentTimeSlot());
      setOneTimeDeliverySlot(getCurrentTimeSlot());
    };

    updateTime();
    // Update every minute
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const deliveries = getTodayDeliveries();

  // Filter deliveries based on selected time slot
  // IMPORTANT: Only show deliveries AFTER their scheduled time has started
  const filteredDeliveries = deliveries.filter(d => {
    const deliverySlot = d.timeSlot || 'morning';

    // First check: Has this delivery's time slot started yet?
    if (!hasTimeSlotStarted(deliverySlot)) {
      return false; // Don't show if time slot hasn't started
    }

    // Show deliveries for selected time slot
    if (deliverySlot === selectedTimeSlot) return true;

    // Show pending deliveries from earlier slots (they should still be visible until completed)
    if (d.status === 'pending') {
      const slotOrder = ['morning', 'noon', 'evening'];
      return slotOrder.indexOf(deliverySlot) <= slotOrder.indexOf(selectedTimeSlot);
    }

    return false;
  }).sort((a, b) => {
    // Sort: pending first, then delivered, then skipped
    const statusOrder = { pending: 0, delivered: 1, skipped: 2 };
    const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 0) -
                      (statusOrder[b.status as keyof typeof statusOrder] || 0);
    if (statusDiff !== 0) return statusDiff;

    // Then sort by time slot order
    const slotOrder: Record<string, number> = { morning: 1, noon: 2, evening: 3 };
    return (slotOrder[a.timeSlot || 'morning'] || 1) - (slotOrder[b.timeSlot || 'morning'] || 1);
  });

  const pendingCount = deliveries.filter(d => d.status === 'pending').length;

  const filteredCustomers = customers.filter(
    c => c.name.toLowerCase().includes(searchCustomer.toLowerCase()) ||
         c.phone.includes(searchCustomer)
  );

  // Calculate total amount for a delivery
  const calculateDeliveryTotal = (delivery: Delivery): number => {
    let total = 0;
    delivery.items.forEach(item => {
      const product = settings.products.find(p => p.id === item.productId);
      total += (product?.price || 0) * item.quantity;
    });
    if (delivery.extraItems) {
      delivery.extraItems.forEach(item => {
        const product = settings.products.find(p => p.id === item.productId);
        total += (product?.price || 0) * item.quantity;
      });
    }
    return Math.round(total);
  };

  // Mark as delivered (Due mode - no payment)
  const handleMarkDelivered = (id: string) => {
    const delivery = deliveries.find(d => d.id === id);
    if (!delivery) return;

    const total = calculateDeliveryTotal(delivery);

    // Create sale record with due payment type
    const saleItems = delivery.items.map(item => {
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
      delivery.extraItems.forEach(item => {
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

    // For walk-in customers with Due mode, add them to Random customers list
    let saleCustomerId = delivery.isWalkIn ? null : delivery.customerId;

    if (delivery.isWalkIn && paymentMode === 'due') {
      // Create new random customer from walk-in
      const customerData = {
        name: delivery.customerName,
        phone: (delivery as any).customerPhone || '',
        address: (delivery as any).customerAddress || '',
        type: 'random' as const,
        defaultItems: [],
      };
      addCustomer(customerData);
      // Note: Customer ID will be assigned by addCustomer,
      // we'll use the name to match in sales/dues
    }

    // Create sale items
    const saleItems = delivery.items.map(item => {
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
      delivery.extraItems.forEach(item => {
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
      customerId: saleCustomerId,
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

  const handleAddOneTimeDelivery = () => {
    if (isWalkIn) {
      if (!walkInName.trim() || oneTimeItems.length === 0) return;

      const items = oneTimeItems.map(item => {
        const product = settings.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          quantity: item.quantity,
        };
      });

      addDelivery({
        customerId: 'walk-in-' + Date.now(),
        customerName: walkInName.trim(),
        customerPhone: walkInPhone.trim(),
        customerAddress: walkInAddress.trim(),
        items,
        status: 'pending',
        isOneTime: true,
        isWalkIn: true,
        timeSlot: oneTimeDeliverySlot,
        date: getTodayDate(),
        deliveredAt: null,
      });
    } else {
      if (!selectedCustomer || oneTimeItems.length === 0) return;

      const customer = customers.find(c => c.id === selectedCustomer);
      if (!customer) return;

      const items = oneTimeItems.map(item => {
        const product = settings.products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name || 'Unknown',
          quantity: item.quantity,
        };
      });

      addDelivery({
        customerId: selectedCustomer,
        customerName: customer.name,
        items,
        status: 'pending',
        isOneTime: true,
        timeSlot: oneTimeDeliverySlot,
        date: getTodayDate(),
        deliveredAt: null,
      });
    }

    setShowAddModal(false);
    setSelectedCustomer(null);
    setOneTimeItems([]);
    setSearchCustomer('');
    setIsWalkIn(false);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInAddress('');
    setAmountInputs({});
    setOneTimeDeliverySlot(getCurrentTimeSlot());
  };

  const handleAddExtraItems = (deliveryId: string) => {
    if (extraItems.length === 0) return;

    const delivery = deliveries.find(d => d.id === deliveryId);
    if (!delivery) return;

    const newExtraItems: DeliveryItem[] = extraItems.map(item => {
      const product = settings.products.find(p => p.id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name || 'Unknown',
        quantity: item.quantity,
      };
    });

    const existingExtras = delivery.extraItems || [];
    updateDelivery(deliveryId, {
      extraItems: [...existingExtras, ...newExtraItems],
    });

    setShowExtraItemsModal(null);
    setExtraItems([]);
  };

  const addItem = (productId: string, type: 'oneTime' | 'extra') => {
    if (type === 'oneTime') {
      if (!oneTimeItems.find(i => i.productId === productId)) {
        setOneTimeItems([...oneTimeItems, { productId, quantity: 1 }]);
      }
    } else {
      if (!extraItems.find(i => i.productId === productId)) {
        setExtraItems([...extraItems, { productId, quantity: 1 }]);
      }
    }
  };

  const updateItemQuantity = (productId: string, quantity: number, type: 'oneTime' | 'extra') => {
    if (type === 'oneTime') {
      if (quantity <= 0) {
        setOneTimeItems(oneTimeItems.filter(i => i.productId !== productId));
        setAmountInputs(prev => { const next = {...prev}; delete next[productId]; return next; });
      } else {
        setOneTimeItems(oneTimeItems.map(i =>
          i.productId === productId ? { ...i, quantity } : i
        ));
        // Update amount input when quantity changes
        const product = settings.products.find(p => p.id === productId);
        if (product) {
          setAmountInputs(prev => ({ ...prev, [productId]: (product.price * quantity).toString() }));
        }
      }
    } else {
      if (quantity <= 0) {
        setExtraItems(extraItems.filter(i => i.productId !== productId));
        setExtraAmountInputs(prev => { const next = {...prev}; delete next[productId]; return next; });
      } else {
        setExtraItems(extraItems.map(i =>
          i.productId === productId ? { ...i, quantity } : i
        ));
        // Update extra amount input when quantity changes
        const product = settings.products.find(p => p.id === productId);
        if (product) {
          setExtraAmountInputs(prev => ({ ...prev, [productId]: Math.round(product.price * quantity).toString() }));
        }
      }
    }
  };

  const updateByAmount = (productId: string, amount: string) => {
    setAmountInputs(prev => ({ ...prev, [productId]: amount }));
    const product = settings.products.find(p => p.id === productId);
    if (!product || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setOneTimeItems(oneTimeItems.filter(i => i.productId !== productId));
      return;
    }

    // Calculate quantity from amount (round to 2 decimal places)
    const quantity = Math.round((amountNum / product.price) * 100) / 100;

    const existing = oneTimeItems.find(i => i.productId === productId);
    if (existing) {
      setOneTimeItems(oneTimeItems.map(i =>
        i.productId === productId ? { ...i, quantity } : i
      ));
    } else {
      setOneTimeItems([...oneTimeItems, { productId, quantity }]);
    }
  };

  // Update extra items by amount
  const updateExtraByAmount = (productId: string, amount: string) => {
    setExtraAmountInputs(prev => ({ ...prev, [productId]: amount }));
    const product = settings.products.find(p => p.id === productId);
    if (!product || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setExtraItems(extraItems.filter(i => i.productId !== productId));
      return;
    }

    // Calculate quantity from amount (round to 2 decimal places)
    const quantity = Math.round((amountNum / product.price) * 100) / 100;

    const existing = extraItems.find(i => i.productId === productId);
    if (existing) {
      setExtraItems(extraItems.map(i =>
        i.productId === productId ? { ...i, quantity: quantity > 0 ? quantity : 0.01 } : i
      ));
    } else {
      setExtraItems([...extraItems, { productId, quantity: quantity > 0 ? quantity : 0.01 }]);
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

  const getTimeSlotCounts = (slot: TimeSlot) => {
    // Only count if the time slot has started
    if (!hasTimeSlotStarted(slot)) return 0;
    return deliveries.filter(d => (d.timeSlot || 'morning') === slot && d.status === 'pending').length;
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-105"
      >
        <Truck className="w-6 h-6" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Delivery Schedule Panel - Full Screen Mode */}
      {isOpen && (
        <div className={`fixed z-50 ${isFullScreen ? 'inset-0' : 'inset-0 lg:inset-auto lg:right-6 lg:bottom-24 lg:w-[450px]'}`}>
          {/* Backdrop */}
          {!isFullScreen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50"
              onClick={() => setIsOpen(false)}
            />
          )}

          {/* Panel */}
          <div className={`${isFullScreen ? 'w-full h-full' : 'fixed inset-x-0 bottom-0 lg:relative lg:inset-auto'} bg-white dark:bg-gray-800 ${isFullScreen ? '' : 'rounded-t-2xl lg:rounded-2xl'} shadow-xl max-h-full lg:max-h-[85vh] overflow-hidden flex flex-col`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">
                    Today's Deliveries
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(getTodayDate())}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  title="Add Delivery"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullScreen ? (
                    <Minimize2 className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Maximize2 className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsFullScreen(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Time Slot Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {(Object.entries(TIME_SLOTS) as [TimeSlot, typeof TIME_SLOTS[TimeSlot]][]).map(([slot, config]) => {
                const Icon = config.icon;
                const count = getTimeSlotCounts(slot);
                const slotStarted = hasTimeSlotStarted(slot);
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedTimeSlot(slot)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 transition-all ${
                      !slotStarted
                        ? 'text-gray-300 dark:text-gray-600 cursor-default'
                        : selectedTimeSlot === slot
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{config.label}</span>
                    {!slotStarted && (
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        ({config.time})
                      </span>
                    )}
                    {slotStarted && count > 0 && (
                      <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Delivery List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredDeliveries.length > 0 ? (
                filteredDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className={`p-4 rounded-xl border ${
                      delivery.status === 'delivered'
                        ? 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10'
                        : delivery.status === 'skipped'
                        ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(delivery.status)}
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">
                            {delivery.customerName}
                          </p>
                          <div className="flex gap-2">
                            {delivery.isOneTime && (
                              <span className="text-xs text-purple-600 dark:text-purple-400">
                                One-time
                              </span>
                            )}
                            {delivery.isWalkIn && (
                              <span className="text-xs text-orange-600 dark:text-orange-400">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(delivery.status)}`}>
                        {delivery.status}
                      </span>
                    </div>

                    {/* Regular Items */}
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {delivery.items.map((item, idx) => (
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
                        {delivery.extraItems.map((item, idx) => (
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
                        {formatCurrency(calculateDeliveryTotal(delivery))}
                      </span>
                    </div>

                    {delivery.status === 'pending' && (
                      <div className="flex gap-2">
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
                            const total = calculateDeliveryTotal(delivery);
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
                          onClick={() => {
                            setShowExtraItemsModal(delivery.id);
                            setExtraItems([]);
                          }}
                          className="flex items-center justify-center gap-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                          title="Add Extra Items"
                        >
                          <Package className="w-4 h-4" />
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
                ))
              ) : (
                <div className="text-center py-8">
                  <Truck className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No deliveries for {TIME_SLOTS[selectedTimeSlot].label.toLowerCase()}</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 text-blue-600 dark:text-blue-400 font-medium"
                  >
                    Add one-time delivery
                  </button>
                </div>
              )}
            </div>

            {/* Stats Footer */}
            {deliveries.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    Delivered: {deliveries.filter(d => d.status === 'delivered').length}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    Pending: {deliveries.filter(d => d.status === 'pending').length}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300">
                    Skipped: {deliveries.filter(d => d.status === 'skipped').length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add One-Time Delivery Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Add One-Time Delivery
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedCustomer(null);
                  setOneTimeItems([]);
                  setIsWalkIn(false);
                  setWalkInName('');
                  setWalkInPhone('');
                  setWalkInAddress('');
                  setAmountInputs({});
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Walk-in Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setIsWalkIn(false);
                  setWalkInName('');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  !isWalkIn
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <User className="w-4 h-4 inline mr-1" />
                Existing
              </button>
              <button
                onClick={() => {
                  setIsWalkIn(true);
                  setSelectedCustomer(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  isWalkIn
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-1" />
                Walk-in
              </button>
            </div>

            {/* Time Slot Selection for One-Time Delivery */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Delivery Time
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TIME_SLOTS) as [TimeSlot, typeof TIME_SLOTS[TimeSlot]][]).map(([slot, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setOneTimeDeliverySlot(slot)}
                      className={`p-2 rounded-xl border-2 transition-all text-center ${
                        oneTimeDeliverySlot === slot
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 mx-auto mb-1 ${
                        oneTimeDeliverySlot === slot
                          ? 'text-purple-500'
                          : 'text-gray-500'
                      }`} />
                      <p className={`text-xs font-medium ${
                        oneTimeDeliverySlot === slot
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {config.label}
                      </p>
                      <p className={`text-[10px] ${
                        oneTimeDeliverySlot === slot
                          ? 'text-purple-500'
                          : 'text-gray-400'
                      }`}>
                        {config.time}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {isWalkIn ? (
              /* Walk-in Customer Details */
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Enter customer name..."
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      placeholder="Enter phone number..."
                      value={walkInPhone}
                      onChange={(e) => setWalkInPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <textarea
                      placeholder="Enter address..."
                      value={walkInAddress}
                      onChange={(e) => setWalkInAddress(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Customer Search */
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Customer
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer..."
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>

                <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                  {filteredCustomers.slice(0, 5).map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        selectedCustomer === customer.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-800 dark:text-white">{customer.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Items Selection */}
            {(selectedCustomer || (isWalkIn && walkInName.trim())) && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Items
                </label>
                <div className="space-y-2">
                  {settings.products.filter(p => p.isActive).map((product) => {
                    const item = oneTimeItems.find(i => i.productId === product.id);
                    return (
                      <div
                        key={product.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-white">{product.name}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatCurrency(product.price)} / {product.unit}
                          </span>
                        </div>
                        {item ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateItemQuantity(product.id, item.quantity - 0.5, 'oneTime')}
                                className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-10 text-center text-sm font-medium text-gray-800 dark:text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateItemQuantity(product.id, item.quantity + 0.5, 'oneTime')}
                                className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Amount Input */}
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-gray-500 dark:text-gray-400 text-xs">or ₹</span>
                              <input
                                type="number"
                                value={amountInputs[product.id] || ''}
                                onChange={(e) => updateByAmount(product.id, e.target.value)}
                                placeholder="Amount"
                                className="w-16 px-2 py-1 text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                              />
                            </div>

                            {/* Total */}
                            <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                              = {formatCurrency(product.price * item.quantity)}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => addItem(product.id, 'oneTime')}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleAddOneTimeDelivery}
              disabled={(!selectedCustomer && !isWalkIn) || (isWalkIn && !walkInName.trim()) || oneTimeItems.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Delivery
            </button>
          </div>
        </div>
      )}

      {/* Add Extra Items Modal */}
      {showExtraItemsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Add Extra Items
              </h3>
              <button
                onClick={() => {
                  setShowExtraItemsModal(null);
                  setExtraItems([]);
                  setExtraAmountInputs({});
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <div className="space-y-2">
                {settings.products.filter(p => p.isActive).map((product) => {
                  const item = extraItems.find(i => i.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div>
                        <span className="text-sm text-gray-800 dark:text-white">{product.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">₹{product.price}/{product.unit}</span>
                      </div>
                      {item ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateItemQuantity(product.id, item.quantity - 0.5, 'extra')}
                            className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-gray-800 dark:text-white">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateItemQuantity(product.id, item.quantity + 0.5, 'extra')}
                            className="w-7 h-7 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
                          >
                            +
                          </button>
                          {/* Amount Input */}
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500 dark:text-gray-400 text-xs">or ₹</span>
                            <input
                              type="number"
                              value={extraAmountInputs[product.id] || ''}
                              onChange={(e) => updateExtraByAmount(product.id, e.target.value)}
                              placeholder="Amt"
                              className="w-14 px-1 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItem(product.id, 'extra')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => handleAddExtraItems(showExtraItemsModal)}
              disabled={extraItems.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Extra Items
            </button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (() => {
        const delivery = deliveries.find(d => d.id === showPaymentModal);
        if (!delivery) return null;
        const total = calculateDeliveryTotal(delivery);
        const remaining = total - (parseInt(paymentAmount) || 0);

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items:</p>
                <div className="space-y-1 text-sm">
                  {delivery.items.map(item => {
                    const product = settings.products.find(p => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>{item.productName} x {item.quantity}</span>
                        <span>{formatCurrency(Math.round((product?.price || 0) * item.quantity))}</span>
                      </div>
                    );
                  })}
                  {delivery.extraItems?.map(item => {
                    const product = settings.products.find(p => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between text-blue-600 dark:text-blue-400">
                        <span>+ {item.productName} x {item.quantity}</span>
                        <span>{formatCurrency(Math.round((product?.price || 0) * item.quantity))}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2">
                  <div className="flex justify-between font-bold text-gray-800 dark:text-white">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Mode:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: 'Cash', icon: Banknote, color: 'green' },
                    { value: 'online', label: 'Online', icon: CreditCard, color: 'blue' },
                    { value: 'due', label: 'Due', icon: Clock, color: 'red' },
                  ].map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = paymentMode === mode.value;
                    return (
                      <button
                        key={mode.value}
                        onClick={() => {
                          setPaymentMode(mode.value as 'cash' | 'online' | 'due');
                          if (mode.value === 'due') {
                            setPaymentAmount('0');
                          } else {
                            setPaymentAmount(total.toString());
                          }
                        }}
                        className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? mode.color === 'green'
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : mode.color === 'blue'
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${
                          isSelected
                            ? mode.color === 'green' ? 'text-green-600' : mode.color === 'blue' ? 'text-blue-600' : 'text-red-600'
                            : 'text-gray-400'
                        }`} />
                        <span className={`text-xs font-medium ${
                          isSelected
                            ? mode.color === 'green' ? 'text-green-700' : mode.color === 'blue' ? 'text-blue-700' : 'text-red-700'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount Input (only for Cash/Online) */}
              {paymentMode !== 'due' && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount Paid:</p>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">₹</span>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-medium"
                    />
                  </div>
                  {remaining > 0 && (
                    <p className="text-sm text-red-500 mt-1">
                      Remaining Due: {formatCurrency(remaining)}
                    </p>
                  )}
                  {remaining < 0 && (
                    <p className="text-sm text-green-500 mt-1">
                      Change: {formatCurrency(Math.abs(remaining))}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm Button */}
              <button
                onClick={handlePaymentSubmit}
                className={`w-full flex items-center justify-center gap-2 py-3 text-white font-medium rounded-xl ${
                  paymentMode === 'cash' ? 'bg-green-600 hover:bg-green-700' :
                  paymentMode === 'online' ? 'bg-blue-600 hover:bg-blue-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                <Check className="w-5 h-5" />
                {paymentMode === 'due' ? 'Mark as Due' : `Confirm Payment - ${formatCurrency(parseInt(paymentAmount) || total)}`}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Skip Reason Modal */}
      {showSkipModal && (() => {
        const delivery = deliveries.find(d => d.id === showSkipModal);
        if (!delivery) return null;

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
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
    </>
  );
}
