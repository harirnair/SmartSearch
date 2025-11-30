import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import UploadZone from './components/UploadZone';
import ChatWindow from './components/ChatWindow';
import InsightsPanel from './components/InsightsPanel';

import CompareView from './components/CompareView';
import EvaluationPage from './components/EvaluationPage';

import { AuthProvider } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout><UploadZone /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <Layout><ChatWindow /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/insights" element={
            <ProtectedRoute>
              <Layout><InsightsPanel /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/compare" element={
            <ProtectedRoute>
              <Layout><CompareView /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/evaluate" element={
            <ProtectedRoute>
              <Layout><EvaluationPage /></Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
