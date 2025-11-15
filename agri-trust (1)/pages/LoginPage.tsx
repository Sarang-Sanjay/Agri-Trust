import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, Farmer } from '../types';
import { FARMER_ID_REGEX, deriveFarmerInfoFromId } from '../constants';
import * as localDb from '../services/localDb';
import Input from '../components/Input';
import Button from '../components/Button';
import { v4 as uuidv4 } from 'uuid';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, userRole, loading } = useAuth();

  const [farmerIdInput, setFarmerIdInput] = useState('');
  const [farmerNameInput, setFarmerNameInput] = useState(''); // For new farmer ID generation
  const [farmerIdError, setFarmerIdError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [showGenerateIdModal, setShowGenerateIdModal] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (userRole === UserRole.FARMER) {
        navigate('/farmer', { replace: true });
      } else if (userRole === UserRole.CONSUMER) {
        navigate('/consumer', { replace: true });
      } else {
        // Fallback or handle unexpected roles
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, userRole, navigate, loading]);

  const handleFarmerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFarmerIdError('');
    setGeneralError('');

    if (!farmerIdInput.trim()) {
      setFarmerIdError('Farmer ID cannot be empty.');
      return;
    }

    if (!FARMER_ID_REGEX.test(farmerIdInput)) {
      setFarmerIdError('Invalid Farmer ID format. Expected YYYYMMDD-name-RAND4.');
      return;
    }

    const farmer = localDb.getFarmerById(farmerIdInput);
    if (!farmer) {
      setFarmerIdError('Farmer ID not found. Please check your ID or generate a new one.');
      return;
    }

    login(UserRole.FARMER, farmerIdInput);
    navigate('/farmer', { replace: true });
  };

  const handleConsumerLogin = () => {
    login(UserRole.CONSUMER, 'guest_consumer'); // Use a generic ID for consumers
    navigate('/consumer', { replace: true });
  };

  const openGenerateIdModal = () => {
    setFarmerNameInput('');
    setFarmerIdError(''); // Clear errors from previous attempts
    setGeneralError('');
    setShowGenerateIdModal(true);
  };

  const handleGenerateNewFarmerId = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingId(true);
    setFarmerIdError('');
    setGeneralError('');

    if (!farmerNameInput.trim()) {
      setFarmerIdError('Farmer name cannot be empty.');
      setIsGeneratingId(false);
      return;
    }

    try {
      const sanitizedName = farmerNameInput.toLowerCase().replace(/\s/g, ''); // Remove spaces
      const date = new Date();
      const year = date.getFullYear().toString();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const rand = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit random number

      let newFarmerId = `${year}${month}${day}-${sanitizedName}-${rand}`;
      let attempts = 0;

      // Ensure uniqueness
      while (localDb.getFarmerById(newFarmerId) && attempts < 10) {
        const newRand = Math.floor(1000 + Math.random() * 9000).toString();
        newFarmerId = `${year}${month}${day}-${sanitizedName}-${newRand}`;
        attempts++;
      }

      if (localDb.getFarmerById(newFarmerId)) {
        throw new Error('Could not generate a unique Farmer ID after multiple attempts. Please try again.');
      }

      const { name, dateOfJoining } = deriveFarmerInfoFromId(newFarmerId);

      const newFarmer: Farmer = {
        id: newFarmerId,
        name: name, // Derived, or use farmerNameInput directly if preferred
        dateOfJoining: dateOfJoining,
        location: { village: 'Unknown', district: 'Unknown', state: 'Unknown' }, // Placeholder, can be updated later
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localDb.addFarmer(newFarmer);
      setFarmerIdInput(newFarmerId); // Pre-fill login input with new ID
      setShowGenerateIdModal(false);
      login(UserRole.FARMER, newFarmerId);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to generate new Farmer ID.');
    } finally {
      setIsGeneratingId(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center text-gray-700 dark:text-gray-300">
        Loading authentication...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center">
      <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg w-full max-w-lg dark:bg-gray-800 dark:text-gray-100">
        <h2 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-6 text-center">
          Login to Agri-Trust
        </h2>
        {generalError && (
          <p className="text-red-500 text-sm mb-4 text-center" role="alert">
            {generalError}
          </p>
        )}

        {/* Farmer Login Section */}
        <section className="mb-8 border-b border-gray-200 dark:border-gray-700 pb-8">
          <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
            Farmer Login
          </h3>
          <form onSubmit={handleFarmerLogin}>
            <Input
              label="Farmer ID"
              id="farmerId"
              type="text"
              value={farmerIdInput}
              onChange={(e) => {
                setFarmerIdInput(e.target.value);
                setFarmerIdError(''); // Clear error on change
                setGeneralError('');
              }}
              placeholder="e.g., 20230115-greenacres-1234"
              error={farmerIdError}
              containerClassName="mb-4"
              aria-describedby={farmerIdError ? 'farmer-id-error' : undefined}
              aria-required="true"
            />
            {farmerIdError && (
              <p id="farmer-id-error" className="mt-1 text-xs text-red-500">
                {farmerIdError}
              </p>
            )}
            <Button type="submit" variant="primary" fullWidth className="mt-4">
              Login as Farmer
            </Button>
            <Button type="button" variant="secondary" onClick={openGenerateIdModal} fullWidth className="mt-2">
              Generate New Farmer ID
            </Button>
          </form>
        </section>

        {/* Consumer Login Section */}
        <section className="pt-8">
          <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-4 text-center">
            Consumer Access
          </h3>
          <Button type="button" variant="primary" onClick={handleConsumerLogin} fullWidth>
            Continue as Consumer
          </Button>
        </section>
      </div>

      {/* Generate ID Modal */}
      {showGenerateIdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Generate New Farmer ID</h3>
            <form onSubmit={handleGenerateNewFarmerId}>
              <Input
                label="Your Farm Name (e.g., Green Acres)"
                id="generateFarmerName"
                type="text"
                value={farmerNameInput}
                onChange={(e) => {
                  setFarmerNameInput(e.target.value);
                  setFarmerIdError('');
                  setGeneralError('');
                }}
                placeholder="e.g., Sunshine Farm"
                error={farmerIdError}
                containerClassName="mb-4"
                aria-required="true"
              />
              {farmerIdError && (
                <p id="generate-id-error" className="mt-1 text-xs text-red-500">
                  {farmerIdError}
                </p>
              )}
              {generalError && (
                <p className="text-red-500 text-sm mt-2" role="alert">
                  {generalError}
                </p>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setShowGenerateIdModal(false)} disabled={isGeneratingId}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={isGeneratingId}>
                  Generate ID & Login
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;