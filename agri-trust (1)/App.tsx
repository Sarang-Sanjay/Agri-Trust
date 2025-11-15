import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import IntroPage from './pages/IntroPage';
import LoginPage from './pages/LoginPage';
// Fix: Correct import path for FarmerInputPage
import FarmerInputPage from './pages/FarmerInputPage';
import ConsumerPage from './pages/ConsumerPage';
import ClaimsPage from './pages/ClaimsPage';
import FeedbackPage from './pages/FeedbackPage';
import { UserRole } from './types';
import Button from './components/Button'; // Import Button component for 404 page

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950 bg-opacity-80 text-gray-800 dark:text-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<IntroPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route
            path="/farmer"
            element={
              <ProtectedRoute allowedRoles={[UserRole.FARMER]}>
                <FarmerInputPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/consumer"
            element={
              <ProtectedRoute allowedRoles={[UserRole.CONSUMER]}>
                <ConsumerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/claims/:code"
            element={
              <ProtectedRoute allowedRoles={[UserRole.FARMER, UserRole.CONSUMER]}>
                <ClaimsPage />
              </ProtectedRoute>
            }
          />
          {/* 404 Fallback Route */}
          <Route
            path="*"
            element={
              <div className="flex flex-col items-center justify-center p-8 text-center min-h-[calc(100vh-80px)]">
                <h2 className="text-4xl font-bold text-red-500 mb-4">404 - Page Not Found</h2>
                <p className="text-xl text-gray-700 dark:text-gray-300 mb-8">
                  The page you are looking for does not exist.
                </p>
                <Button onClick={() => window.history.back()} variant="primary">
                  Go Back
                </Button>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;