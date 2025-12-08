import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, formatDate, getTodayDate } from '../lib/storage';
import { exportBillToPDF } from '../lib/pdfExport';
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
} from 'lucide-react';

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
  } = useApp();

  const customer = getCustomerById(id || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(customer || null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingDefaultItems, setEditingDefaultItems] = useState(customer?.defaultItems || []);
  const [editingSchedule, setEditingSchedule] = useState(customer?.schedule || { frequency: 'daily' as const, timeSlots: ['morning'] as ('morning' | 'noon' | 'evening')[] });
  const [amountInputs, setAmountInputs] = useState<{ [key: string]: string }>({});

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
    addPayment({
      customerId: customer.id,
      amount: Number(paymentAmount),
      paymentMode: 'cash',
      date: getTodayDate(),
      note: '',
    });
    setShowPaymentModal(false);
    setPaymentAmount('');
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

  const handleSaveDefaultItems = () => {
    updateCustomer(customer.id, {
      defaultItems: editingDefaultItems,
      schedule: editingSchedule,
    });
    setIsEditingItems(false);
  };

  const updateItemQuantity = (productId: string, delta: number) => {
    const existing = editingDefaultItems.find(i => i.productId === productId);
    if (existing) {
      const newQty = Math.round(existing.quantity + delta);
      if (newQty <= 0) {
        setEditingDefaultItems(editingDefaultItems.filter(i => i.productId !== productId));
        setAmountInputs({ ...amountInputs, [productId]: '' });
      } else {
        setEditingDefaultItems(editingDefaultItems.map(i =>
          i.productId === productId ? { ...i, quantity: newQty } : i
        ));
        const product = settings.products.find(p => p.id === productId);
        if (product) {
          setAmountInputs({ ...amountInputs, [productId]: Math.round(product.price * newQty).toString() });
        }
      }
    } else if (delta > 0) {
      const qty = Math.round(delta);
      setEditingDefaultItems([...editingDefaultItems, { productId, quantity: qty }]);
      const product = settings.products.find(p => p.id === productId);
      if (product) {
        setAmountInputs({ ...amountInputs, [productId]: Math.round(product.price * qty).toString() });
      }
    }
  };

  const updateItemByAmount = (productId: string, amount: string) => {
    setAmountInputs({ ...amountInputs, [productId]: amount });
    const product = settings.products.find(p => p.id === productId);
    if (!product || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setEditingDefaultItems(editingDefaultItems.filter(i => i.productId !== productId));
      return;
    }

    // Allow decimal quantities - e.g., ₹25 with price ₹60/L = 0.42L
    const quantity = Math.round((amountNum / product.price) * 100) / 100; // 2 decimal places

    const existing = editingDefaultItems.find(i => i.productId === productId);
    if (existing) {
      setEditingDefaultItems(editingDefaultItems.map(i =>
        i.productId === productId ? { ...i, quantity: quantity > 0 ? quantity : 0.01 } : i
      ));
    } else {
      setEditingDefaultItems([...editingDefaultItems, { productId, quantity: quantity > 0 ? quantity : 0.01 }]);
    }
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

            {/* Default Items & Schedule Section */}
            {customer.type === 'fixed' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Daily Default Items & Schedule
                  </p>
                  {!isEditingItems ? (
                    <button
                      onClick={() => {
                        setEditingDefaultItems(customer.defaultItems || []);
                        setEditingSchedule(customer.schedule || { frequency: 'daily', timeSlots: ['morning'] });
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
                    {/* Edit Default Items */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Items:</p>
                      {settings.products.filter(p => p.isActive).map((product) => {
                        const item = editingDefaultItems.find(i => i.productId === product.id);
                        return (
                          <div key={product.id} className="p-2 bg-white dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-200">{product.name}</span>
                              <span className="text-xs text-gray-500">₹{product.price}/{product.unit}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateItemQuantity(product.id, -1)}
                                className="p-1 bg-gray-200 dark:bg-gray-600 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-12 text-center text-xs font-medium">
                                {item?.quantity || 0} {product.unit}
                              </span>
                              <button
                                onClick={() => updateItemQuantity(product.id, 1)}
                                className="p-1 bg-gray-200 dark:bg-gray-600 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <span className="text-xs text-gray-500">or ₹</span>
                              <input
                                type="number"
                                value={amountInputs[product.id] || ''}
                                onChange={(e) => updateItemByAmount(product.id, e.target.value)}
                                placeholder="Amt"
                                className="w-16 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                              />
                              {item && item.quantity > 0 && (
                                <span className="text-xs font-medium text-green-600">
                                  ={formatCurrency(product.price * item.quantity)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Edit Schedule */}
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
                        {[
                          { value: 'morning', label: 'Morning (5 AM)' },
                          { value: 'noon', label: 'Noon (12 PM)' },
                          { value: 'evening', label: 'Evening (6 PM)' },
                        ].map((slot) => {
                          const isSelected = (editingSchedule.timeSlots || []).includes(slot.value as any);
                          return (
                            <button
                              key={slot.value}
                              type="button"
                              onClick={() => {
                                const currentSlots = editingSchedule.timeSlots || [];
                                const newSlots = isSelected
                                  ? currentSlots.filter(s => s !== slot.value)
                                  : [...currentSlots, slot.value as 'morning' | 'noon' | 'evening'];
                                setEditingSchedule({ ...editingSchedule, timeSlots: newSlots });
                              }}
                              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {isSelected && '✓ '}{slot.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {customer.defaultItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {customer.defaultItems.map((item) => {
                          const product = settings.products.find(p => p.id === item.productId);
                          return (
                            <span
                              key={item.productId}
                              className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm rounded"
                            >
                              {product?.name}: {item.quantity} {product?.unit}
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

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {dueAmount > 0 && (
          <>
            <button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl"
            >
              <MessageCircle className="w-5 h-5" />
              Reminder
            </button>
            <button
              onClick={() => {
                setPaymentAmount(dueAmount.toString());
                setShowPaymentModal(true);
              }}
              className="flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
            >
              <Wallet className="w-5 h-5" />
              Receive
            </button>
          </>
        )}
        <button
          onClick={handleExportBill}
          className={`flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl ${dueAmount <= 0 ? 'col-span-2' : ''}`}
        >
          <Download className="w-5 h-5" />
          Export Bill (PDF)
        </button>
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
                {/* Items */}
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
                Receive Payment
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
                placeholder="Enter amount"
              />
              <button
                onClick={handlePayment}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl"
              >
                <Check className="w-5 h-5" />
                Confirm Payment
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
