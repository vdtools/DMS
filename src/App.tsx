import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import DeliverySchedule from './components/DeliverySchedule';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import AddCustomer from './pages/AddCustomer';
import CustomerDetail from './pages/CustomerDetail';
import Deliveries from './pages/Deliveries';
import Sales from './pages/Sales';
import AddSale from './pages/AddSale';
import PendingDues from './pages/PendingDues';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Main App Component with Routes
function AppRoutes() {
  const { isAuthenticated } = useApp();

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="fixed-customers" element={<Customers />} />
          <Route path="add-customer" element={<AddCustomer />} />
          <Route path="customer/:id" element={<CustomerDetail />} />
          <Route path="deliveries" element={<Deliveries />} />
          <Route path="sales" element={<Sales />} />
          <Route path="add-sale" element={<AddSale />} />
          <Route path="pending-dues" element={<PendingDues />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      {/* Floating Delivery Schedule Button - Only show when authenticated */}
      {isAuthenticated && <DeliverySchedule />}
    </BrowserRouter>
  );
}

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
