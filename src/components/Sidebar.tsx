import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCurrentISTHour } from '../lib/storage';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ShoppingCart,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Milk,
  Truck,
} from 'lucide-react';

// Time slots with their start hours in IST
const TIME_SLOT_HOURS = {
  morning: 5,   // 5 AM
  noon: 12,     // 12 PM
  evening: 18,  // 6 PM
};

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/customers', icon: Users, label: 'Customers' },
  { path: '/fixed-customers', icon: UserCheck, label: 'Fixed Customers' },
  { path: '/deliveries', icon: Truck, label: 'Deliveries' },
  { path: '/sales', icon: ShoppingCart, label: 'Sales' },
  { path: '/pending-dues', icon: CreditCard, label: 'Pending Dues' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, logout, settings, getTodayDeliveries } = useApp();
  const navigate = useNavigate();

  // Get pending deliveries count for active time slots only
  const getPendingDeliveriesForActiveSlots = () => {
    const currentHour = getCurrentISTHour();
    const todayDeliveries = getTodayDeliveries();

    // Only count pending deliveries where the time slot has passed
    return todayDeliveries.filter(d => {
      if (d.status !== 'pending') return false;
      const slotHour = TIME_SLOT_HOURS[d.timeSlot as keyof typeof TIME_SLOT_HOURS] || 5;
      return currentHour >= slotHour; // Only show if time slot has arrived
    }).length;
  };

  const pendingActiveDeliveries = getPendingDeliveriesForActiveSlots();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <aside
      className={`fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Milk className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-bold text-gray-800 dark:text-white text-lg">
            {settings.shopName || 'Dairy Manager'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Management System
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.path === '/deliveries' && pendingActiveDeliveries > 0 && (
                  <span className="flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {pendingActiveDeliveries > 9 ? '9+' : pendingActiveDeliveries}
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
