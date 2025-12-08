import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDate } from '../lib/storage';
import { exportBillToPDF, exportMonthlyBillToPDF } from '../lib/pdfExport';
import { DefaultItemsBySlot } from '../types';
import {
  ArrowLeft,
  Phone,
  MapPin,
  UserCheck,
  User,
  Edit2,
  Trash2,
  ShoppingCart,
  CreditCard,
  MessageCircle,
  Wallet,
  Check,
  X,
  Download,
  Clock,
  Plus,
  Minus,
  Calendar,
  FileText,
  Banknote,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

type TimeSlotType = 'morning' | 'noon' | 'evening';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getCustomerById,
    getCustomerDue,
    sales,
    payments,
    updateCustomer,
    deleteCustomer,
    addPayment,
    settings,
    getMonthlyRecord,
    getCurrentMonth,
    addPaymentToMonthlyRecord,
  } = useApp();

  const customer = getCustomerById(id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(customer || null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  // v2.2.5: Per Time Slot Items
  const [editingDefaultItemsBySlot, setEditingDefaultItemsBySlot] = useState<DefaultItemsBySlot>(
    customer?.defaultItemsBySlot || {}
  );
  const [editingSchedule, setEditingSchedule] = useState(customer?.schedule || { frequency: 'daily' as const, timeSlots: ['morning'] as TimeSlotType[] });
  const [amountInputs, setAmountInputs] = useState<{ [key: string]: string }>({});
  const [paymentMode, setPaymentMode] = useState<'cash' | 'online'>('cash');
  const [activeSlotTab, setActiveSlotTab] = useState<TimeSlotType>('morning');

  const timeSlotOptions = [
    { value: 'morning', label: 'Morning', time: '5:00 AM', icon: Sun },
    { value: 'noon', label: 'Noon', time: '12:00 PM', icon: Sunset },
    { value: 'evening', label: 'Evening', time: '6:00 PM', icon: Moon },
  ];

  // Get monthly record for fixed customers
  const currentMonth = getCurrentMonth();
  const monthlyRecord = customer ? getMonthlyRecord(customer.id, currentMonth) : undefined;

  // Get month name for display
  const getMonthName = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Customer not found</p>
        <button
          onClick={() => navigate('/customers')}
          className="mt-4 text-blue-600 dark:text-blue-400 font-medium"
        >
          Go back to customers
        </button>
      </div>
    );
  }

  const dueAmount = getCustomerDue(customer.id);
  const customerSales = sales
    .filter(s => s.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const customerPayments = payments
    .filter(p => p.customerId === customer.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPurchases = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);

  const handleSave = () => {
    if (editData) {
      updateCustomer(customer.id, editData);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    deleteCustomer(customer.id);
    navigate('/customers');
  };

  const handlePayment = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    const paymentAmt = Number(paymentAmount);

    // Add to regular payments
    addPayment({
      customerId: customer.id,
      amount: paymentAmt,
      paymentMode: paymentMode,
      date: getTodayDate(),
      note: '',
    });

    // Also add to monthly record for fixed customers
    if (customer.type === 'fixed') {
      addPaymentToMonthlyRecord(customer.id, {
        date: getTodayDate(),
        amount: paymentAmt,
        mode: paymentMode,
      });
    }

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentMode('cash');
  };

  const handleWhatsApp = () => {
    // Use template from settings or fallback
    let template = settings.whatsappTemplate ||
      `नमस्ते {customerName} जी, आपका बकाया राशि: ₹{dueAmount}. कृपया जल्द से जल्द भुगतान करें।`;

    // Replace placeholders
    const message = template
      .replace(/{shopName}/g, settings.shopName || '')
      .replace(/{shopPhone}/g, settings.phone || '')
      .replace(/{customerName}/g, customer.name)
      .replace(/{dueAmount}/g, dueAmount.toString());

    window.open(`https://wa.me/91${customer.phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleExportBill = () => {
    const billItems = customerSales.flatMap(sale =>
      sale.items.map(item => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.price,
        total: item.total,
      }))
    );

    exportBillToPDF({
      shopName: settings.shopName || 'Dairy Shop',
      shopPhone: settings.phone || '',
      shopAddress: settings.address || '',
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address || '',
      items: billItems,
      totalAmount: totalPurchases,
      paidAmount: totalPurchases - dueAmount,
      dueAmount: dueAmount,
      date: formatDate(getTodayDate()),
    });
  };

  // v2.2.5: Save default items by slot
  const handleSaveDefaultItems = () => {
    // Combine all slot items into defaultItems for backward compatibility
    const allItems: { productId: string; quantity: number }[] = [];
    editingSchedule.timeSlots.forEach(slot => {
      const slotItems = editingDefaultItemsBySlot[slot] || [];
      slotItems.forEach(item => {
        const existing = allItems.find(i => i.productId === item.productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          allItems.push({ ...item });
        }
      });
    });

    updateCustomer(customer.id, {
      defaultItems: allItems,
      defaultItemsBySlot: editingDefaultItemsBySlot,
      schedule: editingSchedule,
    });
    setIsEditingItems(false);
  };

  // v2.2.5: Per-slot item management
  const getSlotKey = (slot: TimeSlotType, productId: string) => `${slot}_${productId}`;

  const addDefaultItem = (productId: string, slot: TimeSlotType = activeSlotTab) => {
    const slotItems = editingDefaultItemsBySlot[slot] || [];
    if (!slotItems.find(i => i.productId === productId)) {
      setEditingDefaultItemsBySlot({
        ...editingDefaultItemsBySlot,
        [slot]: [...slotItems, { productId, quantity: 1 }],
      });
      const product = settings.products.find(p => p.id === productId);
      if (product) {
        setAmountInputs({ ...amountInputs, [getSlotKey(slot, productId)]: Math.round(product.price).toString() });
      }
    }
  };

  const removeDefaultItem = (productId: string, slot: TimeSlotType = activeSlotTab) => {
    const slotItems = editingDefaultItemsBySlot[slot] || [];
    setEditingDefaultItemsBySlot({
      ...editingDefaultItemsBySlot,
      [slot]: slotItems.filter(i => i.productId !== productId),
    });
    const newAmounts = { ...amountInputs };
    delete newAmounts[getSlotKey(slot, productId)];
    setAmountInputs(newAmounts);
  };

  const updateItemQuantity = (productId: string, quantity: number, slot: TimeSlotType = activeSlotTab) => {
    if (quantity < 0.01) {
      removeDefaultItem(productId, slot);
      return;
    }
    const roundedQty = Math.round(quantity * 100) / 100;
    const slotItems = editingDefaultItemsBySlot[slot] || [];
    setEditingDefaultItemsBySlot({
      ...editingDefaultItemsBySlot,
      [slot]: slotItems.map(i =>
        i.productId === productId ? { ...i, quantity: roundedQty } : i
      ),
    });
    const product = settings.products.find(p => p.id === productId);
    if (product) {
      setAmountInputs({ ...amountInputs, [getSlotKey(slot, productId)]: Math.round(product.price * roundedQty).toString() });
    }
  };

  const updateByAmount = (productId: string, amount: string, slot: TimeSlotType = activeSlotTab) => {
    setAmountInputs({ ...amountInputs, [getSlotKey(slot, productId)]: amount });
    const product = settings.products.find(p => p.id === productId);
    if (!product || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const quantity = Math.round((amountNum / product.price) * 100) / 100;
    const slotItems = editingDefaultItemsBySlot[slot] || [];
    const existing = slotItems.find(i => i.productId === productId);
    if (existing) {
      setEditingDefaultItemsBySlot({
        ...editingDefaultItemsBySlot,
        [slot]: slotItems.map(i =>
          i.productId === productId ? { ...i, quantity: quantity > 0 ? quantity : 0.01 } : i
        ),
      });
    } else {
      setEditingDefaultItemsBySlot({
        ...editingDefaultItemsBySlot,
        [slot]: [...slotItems, { productId, quantity: quantity > 0 ? quantity : 0.01 }],
      });
    }
  };

  // Copy items from one slot to another
  const copyItemsToSlot = (fromSlot: TimeSlotType, toSlot: TimeSlotType) => {
    const fromItems = editingDefaultItemsBySlot[fromSlot] || [];
    setEditingDefaultItemsBySlot({
      ...editingDefaultItemsBySlot,
      [toSlot]: [...fromItems],
    });
    const newAmounts = { ...amountInputs };
    fromItems.forEach(item => {
      const fromKey = getSlotKey(fromSlot, item.productId);
      const toKey = getSlotKey(toSlot, item.productId);
      if (amountInputs[fromKey]) {
        newAmounts[toKey] = amountInputs[fromKey];
      }
    });
    setAmountInputs(newAmounts);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      {/* Customer Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editData?.name || ''}
              onChange={(e) => setEditData({ ...editData!, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="Name"
            />
            <input
              type="tel"
              value={editData?.phone || ''}
              onChange={(e) => setEditData({ ...editData!, phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="Phone"
            />
            <textarea
              value={editData?.address || ''}
              onChange={(e) => setEditData({ ...editData!, address: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="Address"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl"
              >
                <Check className="w-5 h-5" />
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(customer);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-xl ${
                    customer.type === 'fixed'
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  {customer.type === 'fixed' ? (
                    <UserCheck className="w-6 h-6 text-blue-500" />
                  ) : (
                    <User className="w-6 h-6 text-gray-500" />
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                    {customer.name}
                  </h1>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full mt-1 ${
                      customer.type === 'fixed'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {customer.type === 'fixed' ? 'Fixed Customer' : 'Random Customer'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <Edit2 className="w-5 h-5 text-gray-500" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <Phone className="w-4 h-4" />
                <a href={`tel:+91${customer.phone}`} className="hover:text-blue-500">
                  {customer.phone}
                </a>
              </div>
              {customer.address && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <MapPin className="w-4 h-4" />
                  {customer.address}
                </div>
              )}
            </div>

            {/* v2.2.5: Default Items & Schedule Section - Per Time Slot */}
            {customer.type === 'fixed' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Default Items by Time Slot
                  </p>
                  {!isEditingItems ? (
                    <button
                      onClick={() => {
                        // Initialize per-slot items from existing data
                        const existingBySlot = customer.defaultItemsBySlot || {};
                        // If no per-slot items, fall back to legacy items for all slots
                        if (Object.keys(existingBySlot).length === 0 && customer.defaultItems?.length > 0) {
                          const slots = customer.schedule?.timeSlots || ['morning'];
                          const fallback: DefaultItemsBySlot = {};
                          slots.forEach(slot => {
                            fallback[slot] = [...customer.defaultItems];
                          });
                          setEditingDefaultItemsBySlot(fallback);
                        } else {
                          setEditingDefaultItemsBySlot(existingBySlot);
                        }
                        setEditingSchedule(customer.schedule || { frequency: 'daily', timeSlots: ['morning'] });
                        setActiveSlotTab((customer.schedule?.timeSlots?.[0] as TimeSlotType) || 'morning');
                        setIsEditingItems(true);
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveDefaultItems}
                        className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingItems(false)}
                        className="px-2 py-1 text-xs bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {isEditingItems ? (
                  <div className="space-y-4">
                    {/* Schedule Selection */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Schedule:</p>
                      <select
                        value={editingSchedule.frequency}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, frequency: e.target.value as any })}
                        className="w-full p-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="specific_days">Specific Days</option>
                      </select>

                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-2">Time Slots:</p>
                      <div className="flex gap-2 flex-wrap">
                        {timeSlotOptions.map((slot) => {
                          const isSelected = (editingSchedule.timeSlots || []).includes(slot.value as TimeSlotType);
                          const SlotIcon = slot.icon;
                          return (
                            <button
                              key={slot.value}
                              type="button"
                              onClick={() => {
                                const currentSlots = editingSchedule.timeSlots || [];
                                const newSlots = isSelected
                                  ? currentSlots.filter(s => s !== slot.value)
                                  : [...currentSlots, slot.value as TimeSlotType];
                                setEditingSchedule({ ...editingSchedule, timeSlots: newSlots });
                                if (!isSelected && newSlots.length === 1) {
                                  setActiveSlotTab(slot.value as TimeSlotType);
                                }
                              }}
                              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              <SlotIcon className="w-3 h-3" />
                              {slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Slot Tabs for Items */}
                    {editingSchedule.timeSlots.length > 0 && (
                      <>
                        <div className="flex border-b border-gray-200 dark:border-gray-600">
                          {editingSchedule.timeSlots.map((slot) => {
                            const slotConfig = timeSlotOptions.find(t => t.value === slot);
                            const SlotIcon = slotConfig?.icon || Sun;
                            const itemCount = (editingDefaultItemsBySlot[slot] || []).length;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setActiveSlotTab(slot)}
                                className={`flex-1 flex items-center justify-center gap-1 py-2 transition-all ${
                                  activeSlotTab === slot
                                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                              >
                                <SlotIcon className="w-3 h-3" />
                                <span className="text-xs font-medium">{slotConfig?.label}</span>
                                {itemCount > 0 && (
                                  <span className="w-4 h-4 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
                                    {itemCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Copy from another slot */}
                        {editingSchedule.timeSlots.length > 1 && (editingDefaultItemsBySlot[activeSlotTab]?.length || 0) === 0 && (
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <p className="text-xs text-blue-700 dark:text-blue-400 mb-1">Copy items from:</p>
                            <div className="flex gap-1">
                              {editingSchedule.timeSlots.filter(s => s !== activeSlotTab && (editingDefaultItemsBySlot[s]?.length || 0) > 0).map(slot => {
                                const slotConfig = timeSlotOptions.find(t => t.value === slot);
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => copyItemsToSlot(slot, activeSlotTab)}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                  >
                                    {slotConfig?.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Selected Items for Active Slot */}
                        {(editingDefaultItemsBySlot[activeSlotTab]?.length || 0) > 0 && (
                          <div className="space-y-2">
                            {(editingDefaultItemsBySlot[activeSlotTab] || []).map((item) => {
                              const product = settings.products.find(p => p.id === item.productId);
                              const slotKey = getSlotKey(activeSlotTab, item.productId);
                              return (
                                <div key={item.productId} className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-700 dark:text-gray-200">{product?.name}</span>
                                    <span className="text-xs text-gray-500">₹{product?.price}/{product?.unit}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => updateItemQuantity(item.productId, item.quantity - 0.5, activeSlotTab)}
                                      className="p-1 bg-gray-200 dark:bg-gray-600 rounded"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="w-12 text-center text-xs font-medium">
                                      {item.quantity} {product?.unit}
                                    </span>
                                    <button
                                      onClick={() => updateItemQuantity(item.productId, item.quantity + 0.5, activeSlotTab)}
                                      className="p-1 bg-gray-200 dark:bg-gray-600 rounded"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs text-gray-500">or ₹</span>
                                    <input
                                      type="number"
                                      value={amountInputs[slotKey] || ''}
                                      onChange={(e) => updateByAmount(item.productId, e.target.value, activeSlotTab)}
                                      placeholder="Amt"
                                      className="w-14 px-1 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                                    />
                                    <span className="text-xs font-medium text-green-600">
                                      ={formatCurrency((product?.price || 0) * item.quantity)}
                                    </span>
                                    <button
                                      onClick={() => removeDefaultItem(item.productId, activeSlotTab)}
                                      className="p-1 bg-red-100 dark:bg-red-900/20 rounded text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Add Products for Active Slot */}
                        <div className="grid grid-cols-2 gap-1">
                          {settings.products
                            .filter(p => p.isActive && !(editingDefaultItemsBySlot[activeSlotTab] || []).find(i => i.productId === p.id))
                            .map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => addDefaultItem(product.id, activeSlotTab)}
                                className="flex items-center justify-center gap-1 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                              >
                                <Plus className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-600 dark:text-gray-300">{product.name}</span>
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Display items by slot */}
                    {customer.defaultItemsBySlot && Object.keys(customer.defaultItemsBySlot).length > 0 ? (
                      <div className="space-y-2 mb-3">
                        {(customer.schedule?.timeSlots || ['morning']).map(slot => {
                          const slotItems = customer.defaultItemsBySlot?.[slot] || [];
                          if (slotItems.length === 0) return null;
                          const slotConfig = timeSlotOptions.find(t => t.value === slot);
                          const SlotIcon = slotConfig?.icon || Sun;
                          return (
                            <div key={slot} className="p-2 bg-white/50 dark:bg-gray-700/50 rounded">
                              <div className="flex items-center gap-1 mb-1">
                                <SlotIcon className="w-3 h-3 text-purple-500" />
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{slotConfig?.label}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {slotItems.map((item) => {
                                  const product = settings.products.find(p => p.id === item.productId);
                                  const itemAmount = product ? Math.round(product.price * item.quantity) : 0;
                                  return (
                                    <span
                                      key={item.productId}
                                      className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs rounded"
                                    >
                                      {product?.name}: {item.quantity} {product?.unit} (₹{itemAmount})
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : customer.defaultItems && customer.defaultItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {customer.defaultItems.map((item) => {
                          const product = settings.products.find(p => p.id === item.productId);
                          const itemAmount = product ? Math.round(product.price * item.quantity) : 0;
                          return (
                            <span
                              key={item.productId}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm rounded"
                            >
                              {product?.name}: {item.quantity} {product?.unit} (₹{itemAmount})
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">No default items set</p>
                    )}
                    {customer.schedule && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          {customer.schedule.frequency} - {
                            customer.schedule.timeSlots?.length
                              ? customer.schedule.timeSlots.join(', ')
                              : 'Morning'
                          }
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <ShoppingCart className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800 dark:text-white">
                {formatCurrency(totalPurchases)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchases</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
              <CreditCard className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(dueAmount)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pending Due</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Dues Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-white">
            {customer.type === 'fixed' ? `${getMonthName(currentMonth)} - Account Summary` : 'Payment Summary'}
          </h3>
        </div>

        <div className="p-4">
          {customer.type === 'fixed' && monthlyRecord ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Previous Balance</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {formatCurrency(monthlyRecord.previousBalance)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {formatCurrency(monthlyRecord.currentMonthTotal)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                  <p className="text-xs text-green-600 dark:text-green-400">Paid</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(monthlyRecord.totalPaid)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg border-l-4 ${
                  monthlyRecord.balanceDue > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-500'
                }`}>
                  <p className={`text-xs ${monthlyRecord.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    Balance Due
                  </p>
                  <p className={`text-xl font-bold ${monthlyRecord.balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(monthlyRecord.balanceDue)}
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                <span className="text-green-600">{monthlyRecord.deliveredCount} delivered</span>
                {monthlyRecord.skippedCount > 0 && (
                  <span className="text-red-600 ml-2">{monthlyRecord.skippedCount} skipped</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <a
                  href={`tel:+91${customer.phone}`}
                  className="flex items-center justify-center gap-1 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-1 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    setPaymentAmount(monthlyRecord.balanceDue.toString());
                    setShowPaymentModal(true);
                  }}
                  className="flex items-center justify-center gap-1 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium"
                >
                  <Wallet className="w-4 h-4" />
                  Receive
                </button>
              </div>

              <button
                onClick={() => {
                  const deliveries = monthlyRecord.deliveryDetails
                    .filter(d => d.status === 'delivered')
                    .map(d => ({
                      date: d.date,
                      items: d.items.map(item => ({
                        name: item.productName,
                        quantity: item.quantity,
                        price: item.price,
                        total: item.amount,
                      })),
                      total: d.total,
                      paidAtDelivery: d.paidAmount || 0,
                    }));

                  const paymentsForBill = monthlyRecord.payments.map(p => ({
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
                    previousBalance: monthlyRecord.previousBalance,
                    deliveries,
                    payments: paymentsForBill,
                    monthlyTotal: monthlyRecord.currentMonthTotal,
                    totalPayments: monthlyRecord.totalPaid,
                    balanceDue: monthlyRecord.balanceDue,
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl"
              >
                <FileText className="w-5 h-5" />
                Generate Monthly Bill
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Purchases</p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white">
                    {formatCurrency(totalPurchases)}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${
                  dueAmount > 0
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : 'bg-green-50 dark:bg-green-900/20'
                }`}>
                  <p className={`text-xs ${dueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    Pending Due
                  </p>
                  <p className={`text-xl font-bold ${dueAmount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(dueAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <a
                  href={`tel:+91${customer.phone}`}
                  className="flex items-center justify-center gap-1 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <button
                  onClick={handleWhatsApp}
                  className="flex items-center justify-center gap-1 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                {dueAmount > 0 && (
                  <button
                    onClick={() => {
                      setPaymentAmount(dueAmount.toString());
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center justify-center gap-1 py-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-medium"
                  >
                    <Wallet className="w-4 h-4" />
                    Receive
                  </button>
                )}
              </div>

              <button
                onClick={handleExportBill}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl"
              >
                <Download className="w-5 h-5" />
                Export Bill (PDF)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Recent Transactions</h3>
        {customerSales.length > 0 ? (
          <div className="space-y-3">
            {customerSales.slice(0, 5).map((sale) => (
              <div
                key={sale.id}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 dark:text-white">
                      {formatCurrency(sale.totalAmount)}
                    </p>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        sale.paymentType === 'cash'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : sale.paymentType === 'online'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {sale.paymentType}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(sale.date)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {sale.items.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs rounded"
                    >
                      {item.productName}: {item.quantity}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">
            No transactions yet
          </p>
        )}
      </div>

      {/* Payment History */}
      {customerPayments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800 dark:text-white mb-4">Payment History</h3>
          <div className="space-y-3">
            {customerPayments.slice(0, 5).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
              >
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">
                    + {formatCurrency(payment.amount)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(payment.date)}
                  </p>
                </div>
                {payment.note && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {payment.note}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                Receive Payment - {customer.name}
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMode('cash');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMode('cash')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMode === 'cash'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <Banknote className={`w-6 h-6 ${paymentMode === 'cash' ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${paymentMode === 'cash' ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>
                    Cash
                  </span>
                </button>
                <button
                  onClick={() => setPaymentMode('online')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMode === 'online'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <CreditCard className={`w-6 h-6 ${paymentMode === 'online' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${paymentMode === 'online' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white text-lg font-bold"
                  placeholder="Enter amount"
                />
              </div>

              <button
                onClick={handlePayment}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
              >
                <Check className="w-5 h-5" />
                Receive {formatCurrency(Number(paymentAmount) || 0)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
              Delete Customer?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              This action cannot be undone. All sales history will remain but customer will be removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
