import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../lib/storage';
import { DeliverySchedule } from '../types';
import {
  User,
  Phone,
  MapPin,
  UserCheck,
  Users,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  Clock,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

export default function AddCustomer() {
  const navigate = useNavigate();
  const { addCustomer, settings } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'random' as 'fixed' | 'random',
    defaultItems: [] as { productId: string; quantity: number }[],
    schedule: {
      frequency: 'daily' as DeliverySchedule['frequency'],
      timeSlots: ['morning'] as ('morning' | 'noon' | 'evening')[],
      days: [] as number[],
      dates: [] as number[],
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amountInputs, setAmountInputs] = useState<{ [key: string]: string }>({});

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const timeSlotOptions = [
    { value: 'morning', label: 'Morning', time: '5:00 AM', icon: Sun },
    { value: 'noon', label: 'Noon', time: '12:00 PM', icon: Sunset },
    { value: 'evening', label: 'Evening', time: '6:00 PM', icon: Moon },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (formData.type === 'fixed' && formData.schedule.timeSlots.length === 0) {
      newErrors.timeSlots = 'Select at least one time slot';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const customerData = {
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      type: formData.type,
      defaultItems: formData.defaultItems,
      ...(formData.type === 'fixed' && {
        schedule: {
          frequency: formData.schedule.frequency,
          timeSlots: formData.schedule.timeSlots,
          ...(formData.schedule.frequency === 'weekly' || formData.schedule.frequency === 'specific_days'
            ? { days: formData.schedule.days }
            : {}),
          ...(formData.schedule.frequency === 'specific_dates'
            ? { dates: formData.schedule.dates }
            : {}),
        },
      }),
    };

    addCustomer(customerData);
    navigate(formData.type === 'fixed' ? '/fixed-customers' : '/customers');
  };

  const toggleTimeSlot = (slot: 'morning' | 'noon' | 'evening') => {
    const currentSlots = formData.schedule.timeSlots;
    const newSlots = currentSlots.includes(slot)
      ? currentSlots.filter(s => s !== slot)
      : [...currentSlots, slot];

    setFormData({
      ...formData,
      schedule: { ...formData.schedule, timeSlots: newSlots },
    });
  };

  const toggleDay = (dayIndex: number) => {
    const days = formData.schedule.days.includes(dayIndex)
      ? formData.schedule.days.filter(d => d !== dayIndex)
      : [...formData.schedule.days, dayIndex];
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, days },
    });
  };

  const toggleDate = (date: number) => {
    const dates = formData.schedule.dates.includes(date)
      ? formData.schedule.dates.filter(d => d !== date)
      : [...formData.schedule.dates, date];
    setFormData({
      ...formData,
      schedule: { ...formData.schedule, dates },
    });
  };

  const addDefaultItem = (productId: string) => {
    if (!formData.defaultItems.find(i => i.productId === productId)) {
      setFormData({
        ...formData,
        defaultItems: [...formData.defaultItems, { productId, quantity: 1 }],
      });
      // Also set initial amount in amountInputs
      const product = settings.products.find(p => p.id === productId);
      if (product) {
        setAmountInputs({ ...amountInputs, [productId]: Math.round(product.price).toString() });
      }
    }
  };

  const removeDefaultItem = (productId: string) => {
    setFormData({
      ...formData,
      defaultItems: formData.defaultItems.filter(i => i.productId !== productId),
    });
    const newAmounts = { ...amountInputs };
    delete newAmounts[productId];
    setAmountInputs(newAmounts);
  };

  const updateItemQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeDefaultItem(productId);
      return;
    }
    // Round to whole number - no decimals
    const roundedQty = Math.round(quantity);
    setFormData({
      ...formData,
      defaultItems: formData.defaultItems.map(i =>
        i.productId === productId ? { ...i, quantity: roundedQty } : i
      ),
    });
    // Update amount input when quantity changes
    const product = settings.products.find(p => p.id === productId);
    if (product) {
      setAmountInputs({ ...amountInputs, [productId]: Math.round(product.price * roundedQty).toString() });
    }
  };

  const updateByAmount = (productId: string, amount: string) => {
    setAmountInputs({ ...amountInputs, [productId]: amount });
    const product = settings.products.find(p => p.id === productId);
    if (!product || !amount) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    // Calculate quantity from amount - allow decimal quantities
    // e.g., ₹25 with price ₹60/L = 0.42L
    const quantity = Math.round((amountNum / product.price) * 100) / 100; // 2 decimal places

    const existing = formData.defaultItems.find(i => i.productId === productId);
    if (existing) {
      setFormData({
        ...formData,
        defaultItems: formData.defaultItems.map(i =>
          i.productId === productId ? { ...i, quantity: quantity > 0 ? quantity : 0.01 } : i
        ),
      });
    } else {
      setFormData({
        ...formData,
        defaultItems: [...formData.defaultItems, { productId, quantity: quantity > 0 ? quantity : 0.01 }],
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </button>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Customer Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                    errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  } bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter customer name"
                />
              </div>
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border ${
                    errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-600'
                  } bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500`}
                  placeholder="Enter phone number"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter address"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Type */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            Customer Type
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'random', defaultItems: [] })}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                formData.type === 'random'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <Users className={`w-5 h-5 ${formData.type === 'random' ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className={formData.type === 'random' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                Random
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'fixed' })}
              className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                formData.type === 'fixed'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <UserCheck className={`w-5 h-5 ${formData.type === 'fixed' ? 'text-blue-500' : 'text-gray-400'}`} />
              <span className={formData.type === 'fixed' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                Fixed
              </span>
            </button>
          </div>
        </div>

        {/* Default Items (for Fixed Customers) */}
        {formData.type === 'fixed' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              Daily Default Items
            </h2>

            {/* Selected Items */}
            {formData.defaultItems.length > 0 && (
              <div className="space-y-3 mb-4">
                {formData.defaultItems.map((item) => {
                  const product = settings.products.find(p => p.id === item.productId);
                  return (
                    <div
                      key={item.productId}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800 dark:text-white">
                          {product?.name}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(product?.price || 0)} / {product?.unit}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            <Minus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                          </button>
                          <span className="w-12 text-center font-semibold text-gray-800 dark:text-white text-sm">
                            {item.quantity} {product?.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                            className="p-1.5 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            <Plus className="w-3 h-3 text-gray-600 dark:text-gray-300" />
                          </button>
                        </div>

                        {/* Amount Input */}
                        <div className="flex items-center gap-1 flex-1">
                          <span className="text-gray-500 dark:text-gray-400 text-sm">or</span>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                            <input
                              type="number"
                              value={amountInputs[item.productId] || ''}
                              onChange={(e) => updateByAmount(item.productId, e.target.value)}
                              placeholder="Amount"
                              className="w-20 pl-6 pr-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Total */}
                        <span className="font-semibold text-green-600 dark:text-green-400 text-sm">
                          = {formatCurrency(Math.round((product?.price || 0) * item.quantity))}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeDefaultItem(item.productId)}
                          className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-500"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Products */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {settings.products
                .filter(p => p.isActive && !formData.defaultItems.find(i => i.productId === p.id))
                .map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addDefaultItem(product.id)}
                    className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <Plus className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">{product.name}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Delivery Schedule (for Fixed Customers) */}
        {formData.type === 'fixed' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Delivery Schedule
              </h2>
            </div>

            {/* Time Slot Selection - Multi-select checkboxes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Delivery Time (Select one or more)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlotOptions.map((slot) => {
                  const isSelected = formData.schedule.timeSlots.includes(slot.value as 'morning' | 'noon' | 'evening');
                  const SlotIcon = slot.icon;
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      onClick={() => toggleTimeSlot(slot.value as 'morning' | 'noon' | 'evening')}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                        <SlotIcon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                      </div>
                      <p className={`font-medium ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {slot.label}
                      </p>
                      <p className={`text-xs mt-1 ${isSelected ? 'text-purple-500' : 'text-gray-500'}`}>
                        {slot.time}
                      </p>
                    </button>
                  );
                })}
              </div>
              {errors.timeSlots && <p className="text-red-500 text-sm mt-2">{errors.timeSlots}</p>}
              {formData.schedule.timeSlots.length > 1 && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-2">
                  {formData.schedule.timeSlots.length} deliveries per day selected
                </p>
              )}
            </div>

            {/* Frequency Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Frequency
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'specific_days', label: 'Specific Days' },
                  { value: 'specific_dates', label: 'Specific Dates' },
                ].map((freq) => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, frequency: freq.value as DeliverySchedule['frequency'], days: [], dates: [] }
                    })}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.schedule.frequency === freq.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span className={formData.schedule.frequency === freq.value ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300'}>
                      {freq.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Days Selection (for Weekly/Specific Days) */}
            {(formData.schedule.frequency === 'weekly' || formData.schedule.frequency === 'specific_days') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Days
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        formData.schedule.days.includes(index)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dates Selection (for Specific Dates) */}
            {formData.schedule.frequency === 'specific_dates' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Dates of Month
                </label>
                <div className="grid grid-cols-7 gap-2 max-h-48 overflow-y-auto">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => toggleDate(date)}
                      className={`p-2 rounded-lg text-sm font-medium transition-all ${
                        formData.schedule.dates.includes(date)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/30"
        >
          <Check className="w-5 h-5" />
          Add Customer
        </button>
      </form>
    </div>
  );
}
