import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRouteProps, UserRole } from '../types';

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole, loading } = useAuth();

  if (loading) {
    // Optionally render a loading spinner or placeholder while auth state is being initialized
    return (
      <div className="flex justify-center items-center h-screen text-gray-700 dark:text-gray-300">
        Loading authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    // User is not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // User is authenticated but does not have an allowed role, redirect to a forbidden page or intro
    // For this app, we'll redirect them to the intro page or login again.
    // A more sophisticated app might have a dedicated "Access Denied" page.
    console.warn(`User with role ${userRole} attempted to access restricted route.`);
    return <Navigate to="/" replace />; // or '/login'
  }

  return <>{children}</>;
};

export default ProtectedRoute;