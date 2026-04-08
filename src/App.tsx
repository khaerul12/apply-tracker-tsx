import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InputData from './pages/InputData';
import TableView from './pages/TableView';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { Toaster } from '@/components/ui/sonner';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, profile, loading, isTrialValid } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user || !user.emailVerified) return <Navigate to="/login" replace />;
  
  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (!isTrialValid && profile?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md w-full bg-card p-8 rounded-xl shadow-lg border text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Trial Expired</h2>
            <p className="text-muted-foreground">
              Your 7-day trial has ended. Please contact the administrator to upgrade your account and continue tracking your applications.
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
            Check Status Again
          </Button>
        </div>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/input" element={<ProtectedRoute><InputData /></ProtectedRoute>} />
          <Route path="/table" element={<ProtectedRoute><TableView /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  );
}
