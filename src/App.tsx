/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Workers from "./pages/Workers";
import Tasks from "./pages/Tasks";
import Evaluations from "./pages/Evaluations";
import AddEvaluation from "./pages/AddEvaluation";
import EditEvaluation from "./pages/EditEvaluation";
import MonthlyReport from "./pages/MonthlyReport";
import AccountStatement from "./pages/AccountStatement";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Settings from "./pages/Settings";
import AdminUsers from "./pages/AdminUsers";
import AuditLogs from "./pages/AuditLogs";
import Attendance from "./pages/Attendance";

function ProtectedRoute({ children, permission }: { children: React.ReactNode, permission?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-durra-green font-bold">جاري التحميل...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission && user.role !== "admin" && !user.permissions.includes(permission)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6" dir="rtl">
        <h1 className="text-3xl font-bold text-red-600 mb-4">عذراً، لا تملك صلاحية</h1>
        <p className="text-gray-600 mb-8">ليس لديك الصلاحيات الكافية للوصول إلى هذه الصفحة.</p>
        <a href="/" className="bg-durra-green text-white px-6 py-2 rounded-lg hover:bg-durra-green-light transition-colors">العودة للرئيسية</a>
      </div>
    );
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="w-full h-full">
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/" element={
            <ProtectedRoute permission="view_dashboard">
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/workers" element={
            <ProtectedRoute permission="view_workers">
              <Layout><Workers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/tasks" element={
            <ProtectedRoute permission="view_tasks">
              <Layout><Tasks /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluations" element={
            <ProtectedRoute permission="view_evaluations">
              <Layout><Evaluations /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluations/new" element={
            <ProtectedRoute permission="add_evaluation">
              <Layout><AddEvaluation /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluations/edit/:id" element={
            <ProtectedRoute permission="edit_evaluation">
              <Layout><EditEvaluation /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute permission="view_reports">
              <Layout><MonthlyReport /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute permission="view_attendance">
              <Layout><Attendance /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/account-statement" element={
            <ProtectedRoute permission="view_account_statements">
              <Layout><AccountStatement /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute permission="manage_users">
              <Layout><AdminUsers /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/admin/audit-logs" element={
            <ProtectedRoute permission="view_audit_logs">
              <Layout><AuditLogs /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Layout><Settings /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
          <Router>
            <AnimatedRoutes />
          </Router>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
