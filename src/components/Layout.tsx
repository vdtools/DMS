import React from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useApp } from '../context/AppContext';
import { Menu, X, Moon, Sun, LayoutDashboard } from 'lucide-react';

export default function Layout() {
  const { sidebarOpen, setSidebarOpen, theme, toggleTheme, settings } = useApp();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/customers') return 'Customers';
    if (path === '/fixed-customers') return 'Fixed Customers';
    if (path === '/add-customer') return 'Add Customer';
    if (path === '/sales') return 'Sales';
    if (path === '/add-sale') return 'Add Sale';
    if (path === '/pending-dues') return 'Pending Dues';
    if (path === '/reports') return 'Reports';
    if (path === '/settings') return 'Settings';
    if (path.startsWith('/customer/')) return 'Customer Details';
    return 'Dairy Management';
  };

  const isDashboard = location.pathname === '/';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            )}
          </button>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            {getPageTitle()}
          </h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <Sidebar />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {/* Desktop Header */}
          <div className="hidden lg:flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {!isDashboard && (
                <Link
                  to="/"
                  className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  title="Go to Dashboard"
                >
                  <LayoutDashboard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </Link>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {getPageTitle()}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {settings.shopName}
                </p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>

          {/* Mobile Dashboard Button */}
          {!isDashboard && (
            <Link
              to="/"
              className="lg:hidden flex items-center gap-2 mb-4 px-3 py-2 w-fit rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-medium"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          )}

          <Outlet />
        </div>
      </main>
    </div>
  );
}
