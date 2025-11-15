import { Farmer, Batch, Claim, ClaimStatus, UserRole, FeedbackQuestion, EvidenceType, ChatbotQuestion } from './types';
import { v4 as uuidv4 } from 'uuid';
import { sha256 } from 'js-sha256';

// --- Regex Patterns ---
export const FARMER_ID_REGEX = /^\d{8}-[a-z]+-\d{4}$/;
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // YYYY-MM-DD
export const GPS_COORDINATES_REGEX = /^Lat: -?\d{1,2}\.\d{4,}, Long: -?\d{1,3}\.\d{4,}$/;

// --- Input Lengths ---
export const MAX_INPUT_TEXT_LENGTH = 100;
export const MIN_TEXT_LENGTH = 2;
export const MAX_TEXTAREA_LENGTH = 500;

// --- Local Storage Keys ---
export const LS_KEY_FARMERS = 'agritrust_farmers';
export const LS_KEY_BATCHES = 'agritrust_batches';
export const LS_KEY_CLAIMS = 'agritrust_claims';
export const LS_KEY_CODES = 'agritrust_codes'; // Maps consumerCode to { cid, vcDigest }
export const LS_KEY_TRANSPARENCY_LOG = 'agritrust_transparency_log';
export const LS_KEY_CONSUMER_ISSUES = 'agritrust_consumer_issues';
export const LS_KEY_FEEDBACK = 'agritrust_feedback';
export const LS_KEY_AUTH_STATE = 'agritrust_auth_state'; // { isAuthenticated: boolean, userRole: UserRole, userId: string }
export const LS_KEY_DRAFT_BATCH_PREFIX = 'agritrust_draft_batch_'; // Key for saving farmer's draft batch data

// --- Utility for Farmer ID Derivation ---
export const deriveFarmerInfoFromId = (farmerId: string) => {
  const parts = farmerId.split('-');
  if (parts.length === 3) {
    const datePart = parts[0]; // YYYYMMDD
    const namePart = parts[1]; // name

    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const dateOfJoining = `${year}-${month}-${day}`;

    // Capitalize first letter of each word in the name part
    const name = namePart.split(/(?=[A-Z])/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return { name, dateOfJoining };
  }
  return { name: '', dateOfJoining: '' };
};


// --- UI Copy ---
export const APP_TITLE = 'Agri-Trust';

export const INTRO_PAGE_CONTENT = {
  significance: {
    title: 'Significance of the Problem',
    bullets: [
      'Centralized data storage is vulnerable to manipulation and often inaccessible.',
      'Over 70% of agricultural data remains locked away, creating a significant trust deficit.',
      'Lack of traceability from farm to consumer reduces confidence in food quality.',
      'Farmers cannot receive fair compensation or digital certification without reliable data.',
      'Inconsistent or manipulated datasets hinder research and decision-making.',
    ],
  },
  solution: {
    title: 'Summary of the Solution',
    bullets: [
      'Decentralized Identifiers (DIDs) for unique cryptographic identities of devices and organizations.',
      'Verifiable Credentials (VCs) for tamper-proof provenance claims, binding data to identities.',
      'IPFS for content-addressed, immutable storage of large agricultural datasets (sensor batches).',
      'OrbitDB for mutable indexes on IPFS, enabling efficient lookup of CIDs by metadata like farmer ID.',
      'Append-only transparency logs (Rekor/Trillian) for tamper-evident audit trails, recording VC digests.',
      'Achieves blockchain-level data trust and immutability without the complexity and cost of a full blockchain network.',
    ],
  },
  howItWorks: {
    title: 'How the Agri-Trust Website Works',
    steps: [
      'Farmers submit batch and claims data, including evidence, through a guided chatbot.',
      'The submitted data is content-addressed, generating a unique Content Identifier (CID) in a local IPFS-like store.',
      'A Verifiable Credential (VC) object is issued, securely binding the CID, timestamp, issuer DID, and subject details.',
      'A cryptographic digest of the VC is appended to a local transparency log, enabling public auditability and tamper detection.',
      'A unique consumer-facing code is generated, which maps to the product\'s CID and VC digest in a local index.',
      'Consumers use this code (e.g., from product packaging) to verify the product\'s origin and claims on the Claims page, ensuring trust and traceability.',
    ],
  },
};

// Fix: Explicitly type FARMER_CHATBOT_QUESTIONS as ChatbotQuestion[]
export const FARMER_CHATBOT_QUESTIONS: ChatbotQuestion[] = [
  // Farmer ID, Name, and Date of Joining are now handled by login and derivation.
  { id: 'locationVillage', label: 'What is your farm\'s Village?', field: 'location.village', type: 'text', required: true, locationField: true },
  { id: 'locationDistrict', label: 'What is your farm\'s District?', field: 'location.district', type: 'text', required: true, locationField: true },
  { id: 'locationState', label: 'What is your farm\'s State?', field: 'location.state', type: 'text', required: true, locationField: true },
  { id: 'locationGPS', label: 'Optional: Your farm\'s GPS coordinates (e.g., "Lat: 12.9716, Long: 77.5946")', field: 'location.gps', type: 'text', required: false, locationField: true },
  { id: 'productName', label: 'What is the Product/Crop Name (e.g., "Mangoes", "Wheat")?', field: 'productName', type: 'text', required: true },
  { id: 'variety', label: 'What is the variety of the product/crop (e.g., "Alphonso", "Durum")?', field: 'variety', type: 'text', required: true },
  { id: 'harvestDate', label: 'What was the Harvest Date (YYYY-MM-DD)?', field: 'harvestDate', type: 'date', required: true },
  { id: 'soilTypeTexture', label: 'What is the soil type and texture (e.g., "Loamy Clay", "Sandy Loam")?', field: 'soilTypeTexture', type: 'text', required: true },
  { id: 'nitrogenLevel', label: 'Nitrogen Level (e.g., in ppm or kg/ha)', field: 'nitrogenLevel', type: 'number', required: true },
  { id: 'phosphorusLevel', label: 'Phosphorus Level (e.g., in ppm or kg/ha)', field: 'phosphorusLevel', type: 'number', required: true },
  { id: 'potassiumLevel', label: 'Potassium Level (e.g., in ppm or kg/ha)', field: 'potassiumLevel', type: 'number', required: true },
  { id: 'micronutrients', label: 'Other Micronutrients (e.g., "High Magnesium", "Low Boron")', field: 'micronutrients', type: 'text', required: false },
  { id: 'soilPh', label: 'What is the soil pH level (e.g., 6.5)', field: 'soilPh', type: 'number', required: true },
  { id: 'humidity', label: 'What is the average humidity (in %)?', field: 'humidity', type: 'number', required: true },
  { id: 'temperature', label: 'What is the average temperature (in °C)?', field: 'temperature', type: 'number', required: true },
  { id: 'inputsUsed', label: 'List any inputs used (e.g., "Organic Fertilizer X", "Compost Y"). Separate with commas.', field: 'inputsUsed', type: 'text', required: false },
  { id: 'certifications', label: 'List any certifications (e.g., "USDA Organic", "Fair Trade"). Separate with commas.', field: 'certifications', type: 'text', required: false },
  { id: 'lotSize', label: 'What is the lot size (e.g., "100 kg", "500 units")?', field: 'lotSize', type: 'text', required: true },
  // Removed processingSteps and storageTransportNotes as per user request
  // { id: 'processingSteps', label: 'Optional: Describe any processing steps (e.g., "Washed, Sorted, Packaged"). Separate with commas.', field: 'processingSteps', type: 'textarea', required: false },
  // { id: 'storageTransportNotes', label: 'Optional: Add any storage or transport notes (e.g., "Refrigerated at 4C", "Shipped via air freight").', field: 'storageTransportNotes', type: 'textarea', required: false },
  // Claims will be handled dynamically
];

export const CLAIM_TYPES = [
  'Organic', 'Residue-Free', 'Fair Trade', 'GI-Tag', 'Traceability',
  'Sustainable Farming', 'Locally Sourced', 'Pesticide-Free', 'Non-GMO',
  'Water Efficient', 'Carbon Neutral', 'Biodiversity Friendly', 'Ethically Sourced'
];

export const FEEDBACK_QUESTIONS: { [key in UserRole]?: FeedbackQuestion[] } = {
  [UserRole.FARMER]: [
    { id: 'easeOfUse', type: 'rating', question: 'How easy was it to submit your farm and batch data?', options: ['1 (Very Difficult)', '2', '3 (Neutral)', '4', '5 (Very Easy)'] },
    { id: 'featureRequest', type: 'text', question: 'What new features would you like to see in Agri-Trust?' },
    { id: 'overallExperience', type: 'rating', question: 'Overall, how would you rate your experience with Agri-Trust?', options: ['1 (Poor)', '2', '3 (Average)', '4', '5 (Excellent)'] },
    { id: 'improvements', type: 'text', question: 'Do you have any suggestions for improvement?' },
  ],
  [UserRole.CONSUMER]: [
    { id: 'traceability', type: 'rating', question: 'How satisfied are you with the traceability information provided?', options: ['1 (Very Dissatisfied)', '2', '3 (Neutral)', '4', '5 (Very Satisfied)'] },
    { id: 'clarity', type: 'rating', question: 'Was the claims information clear and easy to understand?', options: ['1 (Not Clear)', '2', '3 (Neutral)', '4', '5 (Very Clear)'] },
    { id: 'trustImpact', type: 'rating', question: 'Has Agri-Trust increased your trust in agricultural products?', options: ['1 (Not at all)', '2', '3 (Somewhat)', '4', '5 (Significantly)'] },
    { id: 'recommendation', type: 'rating', question: 'How likely are you to recommend Agri-Trust to others?', options: ['1 (Not Likely)', '2', '3 (Neutral)', '4', '5 (Very Likely)'] },
    { id: 'openFeedback', type: 'text', question: 'Please share any additional feedback or suggestions.' },
  ],
};

// --- Seed Data (for demonstration) ---
export const createSeedData = () => {
  const farmers: Farmer[] = [
    {
      id: '20230115-greenacres-1234',
      name: 'Green Acres Farm',
      dateOfJoining: '2023-01-15',
      location: { village: 'Farmville', district: 'Rural', state: 'Karnataka' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '20230320-sunshinefarm-5678',
      name: 'Sunshine Organic Farm',
      dateOfJoining: '2023-03-20',
      location: { village: 'Orchard Grove', district: 'Garden', state: 'Tamil Nadu' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const batch1Claims: Claim[] = [
    {
      id: uuidv4(),
      batchId: 'mock-batch-1',
      type: 'Organic',
      description: 'Certified organic by local authority.',
      evidence: [{ type: EvidenceType.DOCUMENT, urlOrPath: 'https://picsum.photos/id/1018/300/200', notes: 'Organic certificate 2023' }],
      status: ClaimStatus.VERIFIED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      batchId: 'mock-batch-1',
      type: 'Residue-Free',
      description: 'Tested free of pesticide residues.',
      evidence: [{ type: EvidenceType.IMAGE, urlOrPath: 'https://picsum.photos/id/1025/300/200', notes: 'Lab test result for pesticides' }],
      status: ClaimStatus.VERIFIED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      batchId: 'mock-batch-1',
      type: 'Fair Trade',
      description: 'Adheres to fair trade principles.',
      evidence: [{ type: EvidenceType.DOCUMENT, urlOrPath: 'https://picsum.photos/id/1069/300/200', notes: 'Fair trade certification' }],
      status: ClaimStatus.PENDING, // Mock a pending claim
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const batch2Claims: Claim[] = [
    {
      id: uuidv4(),
      batchId: 'mock-batch-2',
      type: 'GI-Tag',
      description: 'Product from region with Geographical Indication tag.',
      evidence: [{ type: EvidenceType.IMAGE, urlOrPath: 'https://picsum.photos/id/1037/300/200', notes: 'GI tag verification document' }],
      status: ClaimStatus.VERIFIED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uuidv4(),
      batchId: 'mock-batch-2',
      type: 'Locally Sourced',
      description: 'Grown and processed within 100 miles.',
      evidence: [{ type: EvidenceType.DOCUMENT, urlOrPath: 'https://picsum.photos/id/1057/300/200', notes: 'Local sourcing declaration' }],
      status: ClaimStatus.VERIFIED,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockBatchData = {
    farmerId: farmers[0].id,
    farmerName: farmers[0].name,
    location: farmers[0].location,
    productName: 'Organic Apples',
    variety: 'Fuji',
    harvestDate: '2024-09-10',
    soilTypeTexture: 'Loamy Clay', // Added mock soil type and texture
    nitrogenLevel: 150, // Added mock nitrogen level
    phosphorusLevel: 75, // Added mock phosphorus level
    potassiumLevel: 200, // Added mock potassium level
    micronutrients: 'High Magnesium, Low Boron', // Added mock micronutrients
    soilPh: 6.8, // Added mock soil pH
    humidity: 75,
    temperature: 25,
    inputsUsed: ['Compost', 'Rainwater'],
    certifications: ['USDA Organic'],
    lotSize: '200 kg',
  };
  const mockBatchContent = JSON.stringify(mockBatchData) + JSON.stringify(batch1Claims);
  const mockCid1 = sha256(mockBatchContent);
  const mockVcDigest1 = sha256(mockCid1 + new Date().toISOString() + 'did:example:123#key1');

  const batch2Data = {
    farmerId: farmers[1].id,
    farmerName: farmers[1].name,
    location: farmers[1].location,
    productName: 'Heritage Tomatoes',
    variety: 'Cherokee Purple',
    harvestDate: '2024-08-05',
    soilTypeTexture: 'Sandy Loam', // Added mock soil type and texture
    nitrogenLevel: 100, // Added mock nitrogen level
    phosphorusLevel: 60, // Added mock phosphorus level
    potassiumLevel: 180, // Added mock potassium level
    micronutrients: 'Balanced', // Added mock micronutrients
    soilPh: 6.2, // Added mock soil pH
    humidity: 80,
    temperature: 28,
    inputsUsed: ['Natural Manure'],
    certifications: ['Local Heritage Product'],
    lotSize: '50 kg',
  };
  const mockBatchContent2 = JSON.stringify(batch2Data) + JSON.stringify(batch2Claims);
  const mockCid2 = sha256(mockBatchContent2);
  const mockVcDigest2 = sha256(mockCid2 + new Date().toISOString() + 'did:example:456#key2');

  const batches: Batch[] = [
    {
      id: 'mock-batch-1',
      ...mockBatchData,
      consumerCode: 'AGRITRUST-1234',
      cid: mockCid1,
      vcDigest: mockVcDigest1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'mock-batch-2',
      ...batch2Data,
      consumerCode: 'AGRITRUST-5678',
      cid: mockCid2,
      vcDigest: mockVcDigest2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const codes: { [key: string]: { cid: string; vcDigest: string; batchId: string } } = {
    'AGRITRUST-1234': { cid: mockCid1, vcDigest: mockVcDigest1, batchId: 'mock-batch-1' },
    'AGRITRUST-5678': { cid: mockCid2, vcDigest: mockVcDigest2, batchId: 'mock-batch-2' },
  };

  const transparencyLog: { index: number; digest: string; previousHash: string | null; timestamp: string; cid: string }[] = [
    { index: 0, digest: mockVcDigest1, previousHash: null, timestamp: new Date().toISOString(), cid: mockCid1 },
    { index: 1, digest: mockVcDigest2, previousHash: mockVcDigest1, timestamp: new Date().toISOString(), cid: mockCid2 },
  ];

  const allClaims = [...batch1Claims, ...batch2Claims];

  return { farmers, batches, allClaims, codes, transparencyLog };
};
