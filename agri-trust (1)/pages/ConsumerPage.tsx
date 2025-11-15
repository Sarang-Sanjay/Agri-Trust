import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';

const ConsumerPage: React.FC = () => {
  const navigate = useNavigate();
  const [productHashKey, setProductHashKey] = useState('');
  const [error, setError] = useState('');

  const handleViewClaims = () => {
    if (!productHashKey.trim()) {
      setError('Product hash key cannot be empty.');
      return;
    }
    // In a real app, this would involve a quick check before navigating
    // For this mock, we navigate directly and let ClaimsPage handle the data fetch.
    navigate(`/claims/${productHashKey.trim()}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center">
      <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg w-full max-w-lg text-center dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Verify Product Claims</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8 text-lg">
          Enter the unique product hash key found on your packaging to view detailed claims
          and traceability information.
        </p>
        <Input
          label="Product Hash Key"
          id="productHashKey"
          value={productHashKey}
          onChange={(e) => {
            setProductHashKey(e.target.value);
            setError(''); // Clear error on change
          }}
          placeholder="e.g., AGRITRUST-1234"
          error={error}
          containerClassName="max-w-md mx-auto"
        />
        <Button
          variant="primary"
          onClick={handleViewClaims}
          disabled={!productHashKey.trim()}
          fullWidth
          className="mt-6 max-w-md mx-auto"
        >
          View Claims
        </Button>
      </div>
    </div>
  );
};

export default ConsumerPage;