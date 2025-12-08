import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency, getTodayDate } from '../lib/storage';
import {
  ArrowLeft,
  Search,
  User,
  Plus,
  Minus,
  Check,
  Wallet,
  CreditCard,
  Banknote,
} from 'lucide-react';

export default function AddSale() {
  const navigate = useNavigate();
  const { customers, settings, addSale } = useApp();
  const [step, setStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [paymentType, setPaymentType] = useState<'cash' | 'online' | 'due'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);
  const [amountInputs, setAmountInputs] = useState<{ [key: string]: string }>({});

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const product = settings.products.find(p => p.id === item.productId);
      return total + (product?.price || 0) * item.quantity;
    }, 0);
  };

  const addItem = (productId: string) => {
    const existing = items.find(i => i.productId === productId);
    if (existing) {
      setItems(items.map(i =>
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([...items, { productId, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems(items.filter(i => i.productId !== productId));
      setAmountInputs({ ...amountInputs, [productId]: '' });
    } else {
      setItems(items.map(i =>
        i.productId === productId ? { ...i, quantity } : i
      ));
      // Update amount input when quantity changes
      const product = settings.products.find(p => p.id === productId);
      if (product) {
        setAmountInputs({ ...amountInputs, [productId]: (product.price * quantity).toString() });
      }
    }
  };

  const updateByAmount = (productId: string, amount: string) => {
    setAmountInputs({ ...amountInputs, [productId]: amount });
    const product = settings.products.find(p => p.id === productId);
    if (!product || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setItems(items.filter(i => i.productId !== productId));
      return;
    }

    // Calculate quantity from amount (round to 2 decimal places)
    const quantity = Math.round((amountNum / product.price) * 100) / 100;

    const existing = items.find(i => i.productId === productId);
    if (existing) {
      setItems(items.map(i =>
        i.productId === productId ? { ...i, quantity } : i
      ));
    } else {
      setItems([...items, { productId, quantity }]);
    }
  };

  const handleSubmit = () => {
    const saleItems = items.map(item => {
      const product = settings.products.find(p => p.id === item.productId)!;
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        total: product.price * item.quantity,
      };
    });

    const total = calculateTotal();

    addSale({
      customerId: selectedCustomer,
      customerName: selectedCustomerData?.name || 'Walk-in Customer',
      items: saleItems,
      totalAmount: total,
      paymentType,
      paidAmount: paymentType === 'due' ? paidAmount : total,
      date: getTodayDate(),
    });

    navigate('/sales');
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        {step > 1 ? 'Previous Step' : 'Back'}
      </button>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${
              s <= step ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Step 1: Select Customer */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Select Customer
            </h2>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Walk-in Option */}
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setStep(2);
              }}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 mb-3 transition-all ${
                selectedCustomer === null
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <span className="font-medium text-gray-800 dark:text-white">Walk-in Customer</span>
            </button>

            {/* Customer List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    setSelectedCustomer(customer.id);
                    setStep(2);
                  }}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    selectedCustomer === customer.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <User className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800 dark:text-white">{customer.name}</p>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        customer.type === 'fixed'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {customer.type === 'fixed' ? 'Fixed' : 'Random'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Select Items */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Select Items
            </h2>

            <div className="space-y-3">
              {settings.products.filter(p => p.isActive).map((product) => {
                const item = items.find(i => i.productId === product.id);
                return (
                  <div
                    key={product.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{product.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(product.price)} / {product.unit}
                        </p>
                      </div>
                      {!item && (
                        <button
                          onClick={() => addItem(product.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
                        >
                          Add
                        </button>
                      )}
                    </div>
                    {item && (
                      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(product.id, item.quantity - 0.5)}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            <Minus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                          </button>
                          <span className="w-12 text-center font-semibold text-gray-800 dark:text-white text-sm">
                            {item.quantity} {product.unit}
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, item.quantity + 0.5)}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            <Plus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>

                        {/* Amount Input */}
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">or ₹</span>
                          <input
                            type="number"
                            value={amountInputs[product.id] || ''}
                            onChange={(e) => updateByAmount(product.id, e.target.value)}
                            placeholder="Amount"
                            className="w-20 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                          />
                        </div>

                        {/* Total */}
                        <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                          = {formatCurrency(product.price * item.quantity)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Summary */}
          {items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 dark:text-gray-300">Total Amount</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                Continue to Payment
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Payment Method
            </h2>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <button
                onClick={() => setPaymentType('cash')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentType === 'cash'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}
              >
                <Banknote className={`w-6 h-6 ${paymentType === 'cash' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${paymentType === 'cash' ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>
                  Cash
                </span>
              </button>

              <button
                onClick={() => setPaymentType('online')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentType === 'online'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}
              >
                <Wallet className={`w-6 h-6 ${paymentType === 'online' ? 'text-blue-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${paymentType === 'online' ? 'text-blue-600' : 'text-gray-600 dark:text-gray-300'}`}>
                  Online
                </span>
              </button>

              <button
                onClick={() => setPaymentType('due')}
                disabled={!selectedCustomer}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentType === 'due'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                } ${!selectedCustomer ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <CreditCard className={`w-6 h-6 ${paymentType === 'due' ? 'text-red-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${paymentType === 'due' ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'}`}>
                  Due
                </span>
              </button>
            </div>

            {paymentType === 'due' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Advance Payment (Optional)
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value))}
                  min="0"
                  max={calculateTotal()}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter advance amount"
                />
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Order Summary</h3>

            <div className="space-y-2 mb-4">
              {items.map((item) => {
                const product = settings.products.find(p => p.id === item.productId)!;
                return (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">
                      {product.name} x {item.quantity}
                    </span>
                    <span className="text-gray-800 dark:text-white">
                      {formatCurrency(product.price * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-600 dark:text-gray-300">Total</span>
                <span className="text-2xl font-bold text-gray-800 dark:text-white">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
              {paymentType === 'due' && paidAmount > 0 && (
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Remaining Due</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {formatCurrency(calculateTotal() - paidAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-green-600/30"
          >
            <Check className="w-5 h-5" />
            Complete Sale
          </button>
        </div>
      )}
    </div>
  );
}
