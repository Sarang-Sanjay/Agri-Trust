import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../context/AuthContext';
import * as localDb from '../services/localDb';
import {
  Batch,
  Claim,
  ClaimStatus,
  Evidence,
  EvidenceType,
  ChatbotQuestion,
} from '../types';
import {
  FARMER_CHATBOT_QUESTIONS,
  CLAIM_TYPES,
  MAX_TEXTAREA_LENGTH,
  MAX_INPUT_TEXT_LENGTH,
  DATE_REGEX,
  GPS_COORDINATES_REGEX,
} from '../constants';
import Input from '../components/Input';
import TextArea from '../components/TextArea';
import Button from '../components/Button';

// Utility to safely get nested property value
const getNestedValue = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Utility to safely set nested property value
const setNestedValue = (obj: any, path: string, value: any): any => {
  const parts = path.split('.');
  const lastPart = parts.pop();
  if (!lastPart) return obj;

  const nestedObj = parts.reduce((acc, part) => {
    if (!acc[part]) acc[part] = {};
    return acc[part];
  }, obj);

  nestedObj[lastPart] = value;
  return obj;
};

// Define sections for grouping questions
const formSections = [
  {
    title: 'Farm Location Details',
    fields: ['locationVillage', 'locationDistrict', 'locationState', 'locationGPS'],
  },
  {
    title: 'Product Batch Details',
    fields: ['productName', 'variety', 'harvestDate', 'lotSize', 'inputsUsed', 'certifications'],
  },
  {
    title: 'Soil & Climate Data',
    fields: ['soilTypeTexture', 'nitrogenLevel', 'phosphorusLevel', 'potassiumLevel', 'micronutrients', 'soilPh', 'humidity', 'temperature'],
  },
];

const FarmerInputPage: React.FC = () => {
  const navigate = useNavigate();
  const { userId, isAuthenticated, loading: authLoading } = useAuth();

  const [batchData, setBatchData] = useState<Partial<Batch>>({});
  const [claims, setClaims] = useState<Claim[]>([]);
  const [currentClaim, setCurrentClaim] = useState<Partial<Claim>>({});
  const [currentEvidence, setCurrentEvidence] = useState<Partial<Evidence>>({});
  const [isAddingClaim, setIsAddingClaim] = useState(false); // Controls if we're in the claim flow
  const [isAddingEvidence, setIsAddingEvidence] = useState(false); // Controls if we're in the evidence flow
  const [isEditingClaimIndex, setIsEditingClaimIndex] = useState<number | null>(null); // For editing existing claims
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true); // Loading draft on mount
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [showDeleteClaimConfirm, setShowDeleteClaimConfirm] = useState<number | null>(null);

  const questions = FARMER_CHATBOT_QUESTIONS;

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Load draft data on mount
  useEffect(() => {
    const loadDraft = async () => {
      if (userId) {
        setIsLoadingDraft(true);
        const draft = localDb.getDraftBatch(userId);
        if (draft) {
          setBatchData(draft.batch);
          setClaims(draft.claims);
          setGeneralError('Draft data loaded. You can continue where you left off.');
        } else {
          // Initialize farmer name and dateOfJoining from userId
          const farmer = localDb.getFarmerById(userId);
          if (farmer) {
            setBatchData((prev) => ({
              ...prev,
              farmerId: farmer.id,
              farmerName: farmer.name,
              location: {
                village: farmer.location?.village || '',
                district: farmer.location?.district || '',
                state: farmer.location?.state || '',
                gps: farmer.location?.gps || '',
              },
            }));
          } else {
            setGeneralError('Farmer not found in local database. Please try logging in again.');
            navigate('/login');
            return;
          }
        }
      }
      setIsLoadingDraft(false);
    };
    loadDraft();
  }, [userId, questions, navigate]);

  // Save draft data whenever batchData or claims change
  useEffect(() => {
    if (userId && !isLoadingDraft) {
      const timeoutId = setTimeout(() => {
        localDb.saveDraftBatch(userId, { batch: batchData, claims: claims });
        console.log('Draft saved automatically.');
      }, 1000); // Debounce save to prevent too many writes
      return () => clearTimeout(timeoutId);
    }
  }, [batchData, claims, userId, isLoadingDraft]);


  const validateAllInputs = useCallback((): boolean => {
    const errors: { [key: string]: string } = {};

    questions.forEach(question => {
      const value = getNestedValue(batchData, question.field);

      if (question.required && (value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0))) {
        errors[question.field] = `${question.label} is required.`;
      } else if (value !== undefined && value !== '' && value !== null) {
        if (question.type === 'number') {
            if (isNaN(Number(value))) {
              errors[question.field] = `${question.label} must be a valid number.`;
            } else if (question.field === 'soilPh' && (Number(value) < 0 || Number(value) > 14)) {
              errors[question.field] = `Soil pH must be between 0 and 14.`;
            } else if (['nitrogenLevel', 'phosphorusLevel', 'potassiumLevel'].includes(question.field) && Number(value) < 0) {
              errors[question.field] = `${question.label} cannot be negative.`;
            } else if (question.field === 'humidity' && (Number(value) < 0 || Number(value) > 100)) {
              errors[question.field] = `Humidity must be between 0 and 100%.`;
            } // Temperature can be negative
        } else if (question.type === 'date' && !DATE_REGEX.test(String(value))) {
            errors[question.field] = `${question.label} must be in YYYY-MM-DD format.`;
        } else if (question.field === 'location.gps' && !GPS_COORDINATES_REGEX.test(String(value))) {
            errors[question.field] = `GPS coordinates must be in format "Lat: XX.XXXX, Long: XX.XXXX".`;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [batchData, questions]);


  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: string,
    type: ChatbotQuestion['type'],
  ) => {
    const { value } = e.target;
    let processedValue: any = value;

    if (type === 'number') {
      // Allow empty string to clear the input, otherwise convert to number
      processedValue = value === '' ? '' : Number(value);
    } else if (field === 'inputsUsed' || field === 'certifications') {
        processedValue = value.split(',').map(s => s.trim()).filter(s => s !== '');
    }

    setBatchData((prev) => {
      const newBatchData = { ...prev };
      setNestedValue(newBatchData, field, processedValue);
      return newBatchData;
    });

    // Clear validation error for this field on change
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleAddClaimStart = (claimType?: string) => {
    setCurrentClaim({
      type: claimType || '',
      batchId: '', // Will be filled on submission
      evidence: [],
      status: ClaimStatus.PENDING, // Always start as pending
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsAddingClaim(true);
    setValidationErrors({}); // Clear claim-related errors
  };

  const handleAddEvidenceStart = () => {
    setCurrentEvidence({ type: EvidenceType.IMAGE }); // Default evidence type
    setIsAddingEvidence(true);
    setValidationErrors({}); // Clear evidence-related errors
  };

  const handleSaveEvidence = () => {
    const errors: { [key: string]: string } = {};
    // FIX: Check for falsy type, as EvidenceType enum cannot be an empty string.
    if (!currentEvidence.type) {
      errors.evidenceType = 'Evidence type is required.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    // FIX: Cast currentEvidence to Evidence after validation to satisfy the type requirement for the evidence array.
    setCurrentClaim((prev) => ({
      ...prev,
      evidence: [...(prev.evidence || []), currentEvidence as Evidence],
    }));
    setCurrentEvidence({}); // Clear for next evidence
    setIsAddingEvidence(false);
  };

  const handleCancelEvidence = () => {
    setCurrentEvidence({});
    setIsAddingEvidence(false);
    setValidationErrors({});
  };

  const handleSaveClaim = () => {
    const errors: { [key: string]: string } = {};

    if (!currentClaim.type?.trim()) {
      errors.claimType = 'Claim type is required.';
    }
    if (currentClaim.description && currentClaim.description.length > MAX_TEXTAREA_LENGTH) {
      errors.claimDescription = `Description cannot exceed ${MAX_TEXTAREA_LENGTH} characters.`;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (isEditingClaimIndex !== null) {
      // Editing existing claim
      const updatedClaims = claims.map((claim, index) =>
        index === isEditingClaimIndex ? { ...claim, ...currentClaim } as Claim : claim,
      );
      setClaims(updatedClaims);
    } else {
      // Adding new claim
      setClaims((prev) => [...prev, { id: uuidv4(), ...currentClaim } as Claim]);
    }
    setCurrentClaim({});
    setIsAddingClaim(false);
    setIsEditingClaimIndex(null);
    setValidationErrors({});
  };

  const handleEditClaim = (index: number) => {
    setIsEditingClaimIndex(index);
    setCurrentClaim({ ...claims[index] });
    setIsAddingClaim(true);
  };

  const handleDeleteClaim = (index: number) => {
    setClaims((prev) => prev.filter((_, i) => i !== index));
    setShowDeleteClaimConfirm(null);
  };

  const handleCancelClaim = () => {
    setCurrentClaim({});
    setIsAddingClaim(false);
    setIsEditingClaimIndex(null);
    setValidationErrors({});
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSubmissionSuccess(null);

    // Validate all form fields first
    if (!validateAllInputs()) {
      setGeneralError('Please correct the errors in the form before submitting.');
      const firstErrorKey = Object.keys(validationErrors)[0];
      const firstErrorElement = document.getElementById(firstErrorKey);
      firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSubmitting(true);

    if (!userId) {
      setGeneralError('Farmer ID not found. Please log in.');
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Generate unique consumer code
      let consumerCode = '';
      let attempts = 0;
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      while (attempts < 100) { // Max 100 attempts for uniqueness
        const rand = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit random number
        const tempCode = `AGRITRUST-${year}${month}${day}-${rand}`;
        if (!localDb.getCodeMapping(tempCode)) {
          consumerCode = tempCode;
          break;
        }
        attempts++;
      }

      if (!consumerCode) {
        throw new Error('Failed to generate a unique consumer code after multiple attempts.');
      }

      // Ensure necessary farmer details are present
      const farmer = localDb.getFarmerById(userId);
      if (!farmer) {
        throw new Error('Farmer details missing for submission.');
      }

      // 2. Create final Batch object
      const finalBatchId = uuidv4();
      const finalBatch: Batch = {
        id: finalBatchId,
        farmerId: userId,
        farmerName: farmer.name,
        location: {
            village: batchData.location?.village || '',
            district: batchData.location?.district || '',
            state: batchData.location?.state || '',
            gps: batchData.location?.gps || undefined,
        },
        productName: batchData.productName || 'Unknown Product',
        variety: batchData.variety || 'Unknown Variety',
        harvestDate: batchData.harvestDate || new Date().toISOString().split('T')[0],
        soilTypeTexture: batchData.soilTypeTexture || 'Not specified',
        nitrogenLevel: batchData.nitrogenLevel || 0,
        phosphorusLevel: batchData.phosphorusLevel || 0,
        potassiumLevel: batchData.potassiumLevel || 0,
        micronutrients: batchData.micronutrients || 'Not specified',
        soilPh: batchData.soilPh || 7.0,
        humidity: batchData.humidity || 0,
        temperature: batchData.temperature || 0,
        inputsUsed: batchData.inputsUsed || [],
        certifications: batchData.certifications || [],
        lotSize: batchData.lotSize || 'Not specified',
        processingSteps: batchData.processingSteps, // These are removed from questions but kept in type
        storageTransportNotes: batchData.storageTransportNotes, // These are removed from questions but kept in type
        consumerCode: consumerCode,
        cid: '', // To be filled after computeCid
        vcDigest: '', // To be filled after issueVC
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 3. Update claims with batchId
      const finalClaims: Claim[] = claims.map((claim) => ({
        ...claim,
        batchId: finalBatchId,
        createdAt: claim.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // 4. Compute CID for batch + claims content
      const combinedContentForCid = { batch: finalBatch, claims: finalClaims };
      const cid = localDb.computeCid(combinedContentForCid);
      finalBatch.cid = cid;

      // 5. Issue Verifiable Credential
      const { vcDigest } = localDb.issueVerifiableCredential(
        cid,
        userId,
        finalBatchId,
      );
      finalBatch.vcDigest = vcDigest;

      // 6. Append to Transparency Log
      localDb.appendToTransparencyLog(vcDigest, cid);

      // 7. Save to local storage
      localDb.addBatch(finalBatch);
      finalClaims.forEach((claim) => localDb.addClaim(claim));
      localDb.addCodeMapping(consumerCode, cid, vcDigest, finalBatchId);

      // 8. Clear draft and reset state
      localDb.clearDraftBatch(userId);
      setSubmissionSuccess(`Batch submitted successfully! Consumer Code: ${consumerCode}`);
      setBatchData({});
      setClaims([]);
      setGeneralError(null);
      setValidationErrors({});
      // Redirect to claims page for the newly created item
      setTimeout(() => {
        navigate(`/claims/${consumerCode}`, { replace: true });
      }, 3000);

    } catch (err: any) {
      console.error('Final submission error:', err);
      setGeneralError(err.message || 'Failed to submit batch data.');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (authLoading || isLoadingDraft) {
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex items-center justify-center text-gray-700 dark:text-gray-300">
        Loading farm data...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Should be redirected by useEffect
  }

  const farmer = localDb.getFarmerById(userId!); // userId is guaranteed here
  const farmerName = farmer?.name || 'N/A';
  const farmerIdDisplay = farmer?.id || 'N/A';

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-80px)] flex justify-center">
      <div className="bg-white p-6 md:p-10 rounded-xl shadow-lg w-full max-w-4xl dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-emerald-700 dark:text-emerald-400 mb-6 text-center">
          Agri-Trust Batch & Claims Submission
        </h2>

        {submissionSuccess && (
          <div className="p-8 bg-emerald-50 rounded-lg text-emerald-800 dark:bg-emerald-700 dark:text-emerald-100 text-center mb-6">
            <h3 className="text-2xl font-bold mb-3">Submission Successful!</h3>
            <p className="text-lg mb-4">{submissionSuccess}</p>
            <p className="text-md">Redirecting to claims page...</p>
          </div>
        )}

        {generalError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 dark:bg-red-900 dark:text-red-300 dark:border-red-700" role="alert">
            <span className="block sm:inline">{generalError}</span>
          </div>
        )}

        <form onSubmit={handleFinalSubmit} className="space-y-8">
          {/* Farmer Info - Read Only */}
          <section className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-inner border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-xl mb-4 text-gray-800 dark:text-gray-100 border-b pb-2 border-gray-300 dark:border-gray-700">
              Your Farmer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Farmer Name"
                id="farmerNameDisplay"
                value={farmerName}
                readOnly
                disabled
                containerClassName="mb-0"
                className="bg-gray-100 dark:bg-gray-700"
              />
              <Input
                label="Farmer ID"
                id="farmerIdDisplay"
                value={farmerIdDisplay}
                readOnly
                disabled
                containerClassName="mb-0"
                className="bg-gray-100 dark:bg-gray-700"
              />
            </div>
          </section>

          {/* Dynamic Form Sections */}
          {formSections.map((section, sectionIndex) => (
            <section key={sectionIndex} className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-xl mb-6 text-gray-800 dark:text-gray-100 border-b pb-2 border-gray-300 dark:border-gray-700">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                {questions
                  .filter(q => section.fields.includes(q.id))
                  .map((q) => {
                    const inputValue = getNestedValue(batchData, q.field);
                    const currentError = validationErrors[q.field];
                    const isTextArea = q.type === 'textarea' || ['inputsUsed', 'certifications'].includes(q.field);

                    return isTextArea ? (
                      <div key={q.id} className="md:col-span-2">
                        <TextArea
                          label={q.label}
                          id={q.field}
                          value={Array.isArray(inputValue) ? inputValue.join(', ') : inputValue || ''}
                          onChange={(e) => handleInputChange(e, q.field, q.type)}
                          placeholder={`Enter ${q.label.toLowerCase()}...`}
                          error={currentError}
                          required={q.required}
                          maxLength={MAX_TEXTAREA_LENGTH}
                          aria-required={q.required ? "true" : "false"}
                        />
                         {currentError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{currentError}</p>}
                      </div>
                    ) : (
                      <div key={q.id}>
                        <Input
                            label={q.label}
                            id={q.field}
                            type={q.type === 'number' ? 'number' : q.type}
                            value={inputValue ?? ''}
                            onChange={(e) => handleInputChange(e, q.field, q.type)}
                            placeholder={`Enter ${q.label.toLowerCase()}...`}
                            error={currentError}
                            required={q.required}
                            maxLength={MAX_INPUT_TEXT_LENGTH}
                            aria-required={q.required ? "true" : "false"}
                            step={q.field === 'soilPh' ? '0.1' : 'any'}
                        />
                        {currentError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{currentError}</p>}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}

          {/* Claims Section */}
          <section className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-xl mb-4 text-gray-800 dark:text-gray-100 border-b pb-2 border-gray-300 dark:border-gray-700">
              Claims for this Batch ({claims.length})
            </h3>
            {claims.length > 0 ? (
              <ul className="space-y-4 mb-6">
                {claims.map((claim, index) => (
                  <li key={claim.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400 text-lg">{claim.type}</p>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => handleEditClaim(index)} className="text-sm px-3 py-1">Edit</Button>
                        <Button type="button" variant="danger" onClick={() => setShowDeleteClaimConfirm(index)} className="text-sm px-3 py-1">Delete</Button>
                      </div>
                    </div>
                    {claim.description && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{claim.description}</p>}
                    <p className="text-xs text-gray-500 dark:text-gray-400">Evidence: {claim.evidence?.length || 0}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-6">No claims added yet. Add claims to provide verifiable information about your product.</p>
            )}
            <Button type="button" variant="secondary" onClick={() => handleAddClaimStart()}>
              Add New Claim
            </Button>
          </section>

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="px-8 py-3 text-lg">
              Confirm & Submit Batch
            </Button>
          </div>
        </form>

        {/* Add/Edit Claim Modal */}
        {isAddingClaim && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-lg my-8">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                {isEditingClaimIndex !== null ? 'Edit Claim' : 'Add New Claim'}
              </h3>
              <div className="mb-4">
                <label htmlFor="claimType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Claim Type</label>
                <select
                  id="claimType"
                  value={currentClaim.type || ''}
                  onChange={(e) => setCurrentClaim((prev) => ({ ...prev, type: e.target.value }))}
                  className={`block w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2
                    ${validationErrors.claimType ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400 dark:focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-300'}`}
                  aria-invalid={!!validationErrors.claimType}
                  required
                >
                  <option value="">Select a claim type</option>
                  {CLAIM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {validationErrors.claimType && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
                    {validationErrors.claimType}
                  </p>
                )}
              </div>
              <TextArea
                label="Claim Description (Optional)"
                id="claimDescription"
                value={currentClaim.description || ''}
                onChange={(e) => setCurrentClaim((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="e.g., Certified organic by USDA"
                maxLength={MAX_TEXTAREA_LENGTH}
                error={validationErrors.claimDescription}
              />

              <div className="mt-6 mb-4">
                <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-3">Evidence ({currentClaim.evidence?.length || 0})</h4>
                {currentClaim.evidence && currentClaim.evidence.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
                    {currentClaim.evidence.map((evidence, idx) => (
                      <li key={idx} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                        <span>
                          <strong>{evidence.type}:</strong> {evidence.urlOrPath || evidence.notes || 'No details'}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setCurrentClaim((prev) => ({
                              ...prev,
                              evidence: prev.evidence?.filter((_, eIdx) => eIdx !== idx),
                            }))
                          }
                          className="ml-4 p-1 text-red-500 hover:text-red-700"
                          aria-label={`Remove evidence ${idx + 1}`}
                        >
                          X
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No evidence added yet.</p>
                )}

                <Button type="button" variant="secondary" onClick={handleAddEvidenceStart} className="mt-4">
                  Add Evidence
                </Button>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <Button type="button" variant="secondary" onClick={handleCancelClaim}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleSaveClaim}>
                  {isEditingClaimIndex !== null ? 'Update Claim' : 'Add Claim'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isAddingEvidence && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md">
              <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Add Evidence</h4>
              <div className="mb-4">
                <label htmlFor="evidenceType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Evidence Type</label>
                <select
                  id="evidenceType"
                  value={currentEvidence.type || ''}
                  onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, type: e.target.value as EvidenceType }))}
                  className={`block w-full px-4 py-2 mt-1 border rounded-lg focus:outline-none focus:ring-2
                    ${validationErrors.evidenceType ? 'border-red-500 focus:border-red-500 focus:ring-red-200 dark:border-red-400 dark:focus:ring-red-300' : 'border-gray-300 focus:border-emerald-500 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:border-emerald-500 dark:focus:ring-emerald-300'}`}
                  aria-invalid={!!validationErrors.evidenceType}
                  required
                >
                  <option value="">Select type</option>
                  {Object.values(EvidenceType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {validationErrors.evidenceType && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
                    {validationErrors.evidenceType}
                  </p>
                )}
              </div>
              <Input
                label="URL or File Path (Optional)"
                id="evidenceUrl"
                value={currentEvidence.urlOrPath || ''}
                onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, urlOrPath: e.target.value }))}
                placeholder="e.g., https://example.com/certificate.pdf"
              />
              <TextArea
                label="Notes (Optional)"
                id="evidenceNotes"
                value={currentEvidence.notes || ''}
                onChange={(e) => setCurrentEvidence((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g., Certificate from AgriCert 2023"
              />
              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={handleCancelEvidence}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={handleSaveEvidence}>
                  Save Evidence
                </Button>
              </div>
            </div>
          </div>
        )}

        {showDeleteClaimConfirm !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-sm text-center">
              <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Confirm Delete</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete the claim "{claims[showDeleteClaimConfirm]?.type}"? This cannot be undone.
              </p>
              <div className="flex justify-center gap-3 mt-6">
                <Button type="button" variant="secondary" onClick={() => setShowDeleteClaimConfirm(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="danger" onClick={() => handleDeleteClaim(showDeleteClaimConfirm)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmerInputPage;
