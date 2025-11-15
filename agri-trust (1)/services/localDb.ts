import { v4 as uuidv4 } from 'uuid';
import {
  Farmer,
  Batch,
  Claim,
  ConsumerIssue,
  Feedback,
  UserRole,
} from '../types';
import {
  LS_KEY_FARMERS,
  LS_KEY_BATCHES,
  LS_KEY_CLAIMS,
  LS_KEY_CODES,
  LS_KEY_TRANSPARENCY_LOG,
  LS_KEY_CONSUMER_ISSUES,
  LS_KEY_FEEDBACK,
  LS_KEY_AUTH_STATE,
  LS_KEY_DRAFT_BATCH_PREFIX, // Import new constant
  createSeedData,
} from '../constants';
import { sha256 } from 'js-sha256';

// --- Utility Functions ---
function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage key "${key}":`, error);
    return defaultValue;
  }
}

function setLocalStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage key "${key}":`, error);
  }
}

// --- Seed Data ---
export const seedData = () => {
  if (!localStorage.getItem(LS_KEY_FARMERS)) {
    console.log('Seeding initial data...');
    const { farmers, batches, allClaims, codes, transparencyLog } = createSeedData();
    setLocalStorageItem(LS_KEY_FARMERS, farmers);
    setLocalStorageItem(LS_KEY_BATCHES, batches);
    setLocalStorageItem(LS_KEY_CLAIMS, allClaims);
    setLocalStorageItem(LS_KEY_CODES, codes);
    setLocalStorageItem(LS_KEY_TRANSPARENCY_LOG, transparencyLog);
    setLocalStorageItem(LS_KEY_CONSUMER_ISSUES, []);
    setLocalStorageItem(LS_KEY_FEEDBACK, []);
    // Clear auth state on fresh seed to ensure user starts from login
    localStorage.removeItem(LS_KEY_AUTH_STATE);
  }
};

// --- Farmers ---
export const getFarmers = (): Farmer[] => getLocalStorageItem(LS_KEY_FARMERS, []);
export const addFarmer = (farmer: Farmer): void => {
  const farmers = getFarmers();
  farmers.push(farmer);
  setLocalStorageItem(LS_KEY_FARMERS, farmers);
};
export const getFarmerById = (id: string): Farmer | undefined =>
  getFarmers().find((f) => f.id === id);

// --- Batches ---
export const getBatches = (): Batch[] => getLocalStorageItem(LS_KEY_BATCHES, []);
export const addBatch = (batch: Batch): void => {
  const batches = getBatches();
  batches.push(batch);
  setLocalStorageItem(LS_KEY_BATCHES, batches);
};
export const getBatchById = (id: string): Batch | undefined =>
  getBatches().find((b) => b.id === id);

// --- Claims ---
export const getClaims = (): Claim[] => getLocalStorageItem(LS_KEY_CLAIMS, []);
export const addClaim = (claim: Claim): void => {
  const claims = getClaims();
  claims.push(claim);
  setLocalStorageItem(LS_KEY_CLAIMS, claims);
};
export const getClaimsByBatchId = (batchId: string): Claim[] =>
  getClaims().filter((c) => c.batchId === batchId);

// --- Consumer Codes (OrbitDB-like index) ---
// Maps consumerCode to { cid, vcDigest, batchId }
export const getCodeMapping = (
  consumerCode: string,
): { cid: string; vcDigest: string; batchId: string } | undefined => {
  const codes = getLocalStorageItem(LS_KEY_CODES, {});
  return codes[consumerCode];
};
export const addCodeMapping = (
  consumerCode: string,
  cid: string,
  vcDigest: string,
  batchId: string,
): void => {
  const codes = getLocalStorageItem(LS_KEY_CODES, {});
  codes[consumerCode] = { cid, vcDigest, batchId };
  setLocalStorageItem(LS_KEY_CODES, codes);
};

// --- Transparency Log ---
// An array of { index, digest, previousHash, timestamp, cid }
export const getTransparencyLog = (): {
  index: number;
  digest: string;
  previousHash: string | null;
  timestamp: string;
  cid: string;
}[] => getLocalStorageItem(LS_KEY_TRANSPARENCY_LOG, []);

export const appendToTransparencyLog = (vcDigest: string, cid: string): number => {
  const log = getTransparencyLog();
  const previousHash = log.length > 0 ? log[log.length - 1].digest : null;
  const newEntry = {
    index: log.length,
    digest: vcDigest,
    previousHash,
    timestamp: new Date().toISOString(),
    cid, // Store CID here for easy lookup and verification
  };
  log.push(newEntry);
  setLocalStorageItem(LS_KEY_TRANSPARENCY_LOG, log);
  return newEntry.index;
};

// --- Consumer Issues ---
export const getConsumerIssues = (): ConsumerIssue[] =>
  getLocalStorageItem(LS_KEY_CONSUMER_ISSUES, []);
export const addConsumerIssue = (issue: ConsumerIssue): void => {
  const issues = getConsumerIssues();
  issues.push(issue);
  setLocalStorageItem(LS_KEY_CONSUMER_ISSUES, issues);
};

// --- Feedback ---
export const getFeedback = (): Feedback[] => getLocalStorageItem(LS_KEY_FEEDBACK, []);
export const addFeedback = (feedback: Feedback): void => {
  const allFeedback = getFeedback();
  allFeedback.push(feedback);
  setLocalStorageItem(LS_KEY_FEEDBACK, allFeedback);
};

// --- Draft Batch (New functionality for resuming farmer input) ---
export const saveDraftBatch = (farmerId: string, data: { batch: Partial<Batch>, claims: Claim[] }): void => {
  setLocalStorageItem(LS_KEY_DRAFT_BATCH_PREFIX + farmerId, data);
};

export const getDraftBatch = (farmerId: string): { batch: Partial<Batch>, claims: Claim[] } | undefined => {
  return getLocalStorageItem(LS_KEY_DRAFT_BATCH_PREFIX + farmerId, undefined);
};

export const clearDraftBatch = (farmerId: string): void => {
  localStorage.removeItem(LS_KEY_DRAFT_BATCH_PREFIX + farmerId);
};


// --- Mock IPFS/VC/DID related functions ---

/**
 * Mocks content addressing: computes a SHA-256 hash of the content.
 * In a real IPFS scenario, this would involve uploading to IPFS and getting a CID.
 */
export const computeCid = (data: object): string => {
  return sha256(JSON.stringify(data));
};

/**
 * Mocks VC issuance: creates a simple object representing a Verifiable Credential.
 * In a real DID/VC system, this would involve cryptographic signing by an issuer.
 * This stub just computes a digest from CID, timestamp, and a mock DID.
 */
export const issueVerifiableCredential = (
  cid: string,
  farmerId: string,
  batchId: string,
): { vcObject: object; vcDigest: string } => {
  const timestamp = new Date().toISOString();
  // Mock DID and public key
  const issuerDid = `did:agritrust:${farmerId}`;
  const mockSignature = sha256(`${cid}-${timestamp}-${issuerDid}-${batchId}-secret-key`);

  const vcObject = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'AgriTrustBatchCredential'],
    id: `vc:${uuidv4()}`,
    issuer: issuerDid,
    issuanceDate: timestamp,
    credentialSubject: {
      id: `did:agritrust:batch:${batchId}`,
      cid: cid,
      batchId: batchId,
      farmerId: farmerId,
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: timestamp,
      verificationMethod: `${issuerDid}#key1`, // Mock key
      proofPurpose: 'assertionMethod',
      signatureValue: mockSignature,
    },
  };
  const vcDigest = sha256(JSON.stringify(vcObject)); // Hash of the VC object for transparency log
  return { vcObject, vcDigest };
};

/**
 * Mocks VC signature validation.
 * In a real system, this would involve retrieving the DID document,
 * finding the public key, and verifying the cryptographic signature.
 * Here, we just re-compute the mock signature and compare.
 */
export const validateVcSignature = (vcObject: any): boolean => {
  if (!vcObject?.proof?.signatureValue || !vcObject?.proof?.created || !vcObject?.issuer) {
    return false;
  }
  const issuerDid = vcObject.issuer;
  const cid = vcObject.credentialSubject.cid;
  const batchId = vcObject.credentialSubject.batchId;
  const timestamp = vcObject.proof.created;

  const expectedMockSignature = sha256(
    `${cid}-${timestamp}-${issuerDid}-${batchId}-secret-key`,
  );
  return expectedMockSignature === vcObject.proof.signatureValue;
};

/**
 * Mocks transparency log inclusion/consistency check.
 * Checks if the vcDigest exists in the log at a consistent index.
 * In a real system, this would involve cryptographic proofs (Rekor/Trillian).
 */
export const checkTransparencyLog = (
  vcDigest: string,
  expectedCid: string,
): { exists: boolean; consistent: boolean } => {
  const log = getTransparencyLog();
  const entry = log.find((e) => e.digest === vcDigest);

  if (!entry) {
    return { exists: false, consistent: false };
  }

  // Basic consistency check: ensure CID in log matches expected CID
  if (entry.cid !== expectedCid) {
    console.warn(`Transparency log entry for digest ${vcDigest} has inconsistent CID.`);
    return { exists: true, consistent: false };
  }

  // In a real system, this would involve verifying Merkel tree proofs.
  // For mock, we simply assume if it exists and CID matches, it's consistent.
  return { exists: true, consistent: true };
};
