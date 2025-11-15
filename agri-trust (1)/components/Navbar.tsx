import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { APP_TITLE } from '../constants';
import Button from './Button';

const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/feedback'); // Redirect to feedback page after logout
  };

  return (
    <nav className="bg-gray-800 bg-opacity-80 backdrop-filter backdrop-blur-sm shadow-sm p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <h1
          className="text-2xl font-bold text-emerald-400 cursor-pointer"
          onClick={() => navigate('/')}
        >
          {APP_TITLE}
        </h1>
        {isAuthenticated && (
          <Button onClick={handleLogout} variant="danger" aria-label="Logout">
            Logout
          </Button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;