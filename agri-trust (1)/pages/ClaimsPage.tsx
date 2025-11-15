import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import * as localDb from '../services/localDb';
import { Batch, Claim, ClaimStatus, UserRole } from '../types';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { deriveFarmerInfoFromId } from '../constants';

interface VerificationStatus {
  vcValid: boolean | null;
  logExists: boolean | null;
  logConsistent: boolean | null;
  vcMessage: string;
  logMessage: string;
}

const ClaimsPage: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { userRole } = useAuth(); // To conditionally show edit options for farmers

  const [batchData, setBatchData] = useState<Batch | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>({
    vcValid: null,
    logExists: null,
    logConsistent: null,
    vcMessage: 'Verifying...',
    logMessage: 'Checking transparency log...',
  });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setVerificationStatus({
      vcValid: null,
      logExists: null,
      logConsistent: null,
      vcMessage: 'Verifying...',
      logMessage: 'Checking transparency log...',
    });


    if (!code) {
      setError('No product hash key provided.');
      setIsLoading(false);
      return;
    }

    try {
      const codeMapping = localDb.getCodeMapping(code);

      if (!codeMapping) {
        setError('Invalid or unknown product hash key. No claims found.');
        setIsLoading(false);
        return;
      }

      const fetchedBatch = localDb.getBatchById(codeMapping.batchId);
      if (!fetchedBatch) {
        setError('Batch data not found for this product.');
        setIsLoading(false);
        return;
      }
      setBatchData(fetchedBatch);

      const fetchedClaims = localDb.getClaimsByBatchId(codeMapping.batchId);
      setClaims(fetchedClaims);

      // --- Mock VC and Transparency Log Verification ---
      // Reconstruct vcObject for validation purposes as it's not directly stored
      const { vcObject, vcDigest: recomputedVcDigest } = localDb.issueVerifiableCredential(
        codeMapping.cid,
        fetchedBatch.farmerId,
        fetchedBatch.id,
      );

      const isVcValid = localDb.validateVcSignature(vcObject);
      const { exists: logExists, consistent: logConsistent } = localDb.checkTransparencyLog(
        codeMapping.vcDigest,
        codeMapping.cid,
      );

      setVerificationStatus({
        vcValid: isVcValid,
        logExists: logExists,
        logConsistent: logConsistent,
        vcMessage: isVcValid ? 'VC signature is valid.' : 'VC signature is INVALID.',
        logMessage: logExists && logConsistent
          ? 'VC digest found and consistent in transparency log.'
          : logExists && !logConsistent
            ? 'VC digest found but inconsistent in transparency log!'
            : 'VC digest NOT found in transparency log.',
      });

    } catch (err: any) {
      setError(err.message || 'Failed to fetch claims data.');
      console.error('ClaimsPage fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center text-gray-700 dark:text-gray-300">
        Loading product claims...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center text-red-600 dark:text-red-400">
        <div className="bg-red-100 border border-red-400 px-6 py-4 rounded-lg shadow-md dark:bg-red-900 dark:border-red-700">
          <p className="font-bold text-xl mb-2">Error:</p>
          <p className="text-lg">{error}</p>
          <Button onClick={() => window.history.back()} variant="secondary" className="mt-4">Go Back</Button>
        </div>
      </div>
    );
  }

  if (!batchData) {
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center text-gray-700 dark:text-gray-300">
        <p className="text-xl">No batch data found for this product hash key.</p>
        <Button onClick={() => window.history.back()} variant="secondary" className="mt-4">Go Back</Button>
      </div>
    );
  }

  const farmerInfo = deriveFarmerInfoFromId(batchData.farmerId);

  const getVerificationIcon = (isValid: boolean | null) => {
    if (isValid === null) return '🟠'; // Pending/unknown
    return isValid ? '✅' : '❌';
  };

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case ClaimStatus.VERIFIED:
        return 'text-emerald-600 dark:text-emerald-400';
      case ClaimStatus.PENDING:
        return 'text-yellow-600 dark:text-yellow-400';
      case ClaimStatus.REJECTED:
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)]">
      <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg dark:bg-gray-800">
        <h2 className="text-4xl font-bold text-emerald-700 dark:text-emerald-400 mb-6 text-center">
          Product Claims: <span className="text-gray-800 dark:text-gray-100">{code}</span>
        </h2>

        {/* Core Verification Section */}
        <section className="mb-8 p-6 bg-emerald-50 dark:bg-gray-700 rounded-lg shadow-inner border border-emerald-200 dark:border-emerald-700">
          <h3 className="text-2xl font-bold text-emerald-800 dark:text-emerald-300 mb-4">Core Verification</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg text-gray-800 dark:text-gray-200">
            <p className="flex items-center gap-2">
              <span className="text-3xl">{getVerificationIcon(verificationStatus.vcValid)}</span>
              <strong>VC Signature:</strong> {verificationStatus.vcMessage}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-3xl">{getVerificationIcon(verificationStatus.logExists && verificationStatus.logConsistent)}</span>
              <strong>Transparency Log:</strong> {verificationStatus.logMessage}
            </p>
          </div>
          <div className="mt-6 text-gray-700 dark:text-gray-300 text-sm break-all">
            <p className="mb-1">
              <strong>Content Identifier (CID):</strong>{' '}
              <span className="font-mono text-gray-600 dark:text-gray-400">{batchData.cid}</span>
            </p>
            <p>
              <strong>VC Digest:</strong>{' '}
              <span className="font-mono text-gray-600 dark:text-gray-400">{batchData.vcDigest}</span>
            </p>
          </div>
        </section>

        {/* Farmer Information */}
        <section className="mb-8 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Farmer Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <p><strong>Name:</strong> {batchData.farmerName}</p>
            <p><strong>ID:</strong> {batchData.farmerId}</p>
            <p><strong>Date Joined:</strong> {farmerInfo.dateOfJoining}</p>
            <p><strong>Location:</strong> {batchData.location?.village}, {batchData.location?.district}, {batchData.location?.state}</p>
            {batchData.location?.gps && <p className="md:col-span-2"><strong>GPS:</strong> {batchData.location.gps}</p>}
          </div>
        </section>

        {/* Product Batch Details */}
        <section className="mb-8 p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Product Batch Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <p><strong>Product Name:</strong> {batchData.productName}</p>
            <p><strong>Variety:</strong> {batchData.variety}</p>
            <p><strong>Harvest Date:</strong> {batchData.harvestDate}</p>
            <p><strong>Lot Size:</strong> {batchData.lotSize}</p>
            {batchData.inputsUsed && batchData.inputsUsed.length > 0 && (
              <p className="md:col-span-2"><strong>Inputs Used:</strong> {batchData.inputsUsed.join(', ')}</p>
            )}
            {batchData.certifications && batchData.certifications.length > 0 && (
              <p className="md:col-span-2"><strong>Certifications:</strong> {batchData.certifications.join(', ')}</p>
            )}
            {batchData.processingSteps && batchData.processingSteps.length > 0 && (
              <p className="md:col-span-2"><strong>Processing Steps:</strong> {batchData.processingSteps.join(', ')}</p>
            )}
            {batchData.storageTransportNotes && (
              <p className="md:col-span-2"><strong>Storage/Transport:</strong> {batchData.storageTransportNotes}</p>
            )}
          </div>
        </section>

        {/* Claims Section */}
        <section className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Product Claims ({claims.length})</h3>
          {claims.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No claims submitted for this batch.</p>
          ) : (
            <div className="space-y-6">
              {claims.map((claim) => (
                <div key={claim.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
                  <h4 className="text-xl font-semibold text-emerald-700 dark:text-emerald-400 mb-2">{claim.type}</h4>
                  {claim.description && (
                    <p className="text-gray-700 dark:text-gray-300 mb-2">{claim.description}</p>
                  )}
                  <p className="text-sm font-medium">
                    Status: <span className={`${getStatusColor(claim.status)}`}>{claim.status}</span>
                  </p>
                  {claim.evidence && claim.evidence.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium text-gray-700 dark:text-gray-300">Evidence:</p>
                      <ul className="list-disc pl-5 text-gray-600 dark:text-gray-400 text-sm space-y-1">
                        {claim.evidence.map((evidence, idx) => (
                          <li key={idx}>
                            <strong>{evidence.type}:</strong>{' '}
                            {evidence.urlOrPath ? (
                              <>
                                <a href={evidence.urlOrPath} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                                  {evidence.urlOrPath}
                                </a>{' '}
                                {evidence.type.toLowerCase() === 'image' && (
                                  <img
                                    src={evidence.urlOrPath}
                                    alt={`Evidence for ${claim.type}`}
                                    className="max-w-xs max-h-48 object-cover mt-1 rounded-md shadow-sm"
                                    loading="lazy"
                                  />
                                )}
                              </>
                            ) : (
                              <em>No URL provided</em>
                            )}{' '}
                            {evidence.notes && `(${evidence.notes})`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* TODO: Add farmer-specific actions for claims if userRole is FARMER */}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClaimsPage;