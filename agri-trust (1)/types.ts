import React, { ReactNode } from 'react';

// --- Data Models ---

export interface Farmer {
  id: string; // yyyymmdd-name-rand4
  name: string;
  dateOfJoining: string; // YYYY-MM-DD
  location: {
    village: string;
    district: string;
    state: string;
    gps?: string; // Optional GPS coordinates
  };
  createdAt: string;
  updatedAt: string;
}

export enum EvidenceType {
  IMAGE = 'Image',
  DOCUMENT = 'Document',
  VIDEO = 'Video',
  OTHER = 'Other',
}

export interface Evidence {
  type: EvidenceType;
  urlOrPath?: string; // URL or local path to the evidence file/resource, now optional
  notes?: string;
}

export enum ClaimStatus {
  VERIFIED = 'Verified',
  PENDING = 'Pending',
  REJECTED = 'Rejected',
}

export interface Claim {
  id: string; // UUID
  batchId: string; // UUID of the associated batch
  type: string; // e.g., organic, residue-free, fair trade, GI-tag, traceability
  description?: string;
  evidence: Evidence[];
  status: ClaimStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string; // UUID
  farmerId: string; // Farmer ID
  farmerName: string;
  location: {
    village: string;
    district: string;
    state: string;
    gps?: string;
  };
  productName: string; // e.g., Mangoes, Wheat
  variety: string;
  harvestDate: string; // YYYY-MM-DD
  soilTypeTexture: string; // New field
  nitrogenLevel: number; // New field
  phosphorusLevel: number; // New field
  potassiumLevel: number; // New field
  micronutrients: string; // New field
  soilPh: number; // New field
  humidity: number; // Added humidity field
  temperature: number; // Added temperature field
  inputsUsed: string[]; // e.g., 'Organic Fertilizer X', 'Pesticide Y'
  certifications: string[]; // e.g., 'USDA Organic', 'Fair Trade'
  lotSize: string; // e.g., '100 kg', '500 units'
  processingSteps?: string[]; // e.g., 'Washed', 'Sorted', 'Packaged'
  storageTransportNotes?: string; // e.g., 'Refrigerated at 4C', 'Shipped via air freight'
  consumerCode: string; // Unique code for consumers to verify
  cid: string; // Content Identifier (IPFS-like hash)
  vcDigest: string; // Verifiable Credential digest
  createdAt: string;
  updatedAt: string;
}

export interface ConsumerIssue {
  id: string; // UUID
  consumerCode: string;
  message: string;
  contactOptional?: string; // Email or phone
  createdAt: string;
}

export enum UserRole {
  FARMER = 'farmer',
  CONSUMER = 'consumer',
  NONE = 'none',
}

export interface ChatbotQuestion {
  id: string;
  label: string;
  field: string;
  type: 'text' | 'date' | 'number' | 'textarea';
  required: boolean;
  derived?: boolean; // New property to mark derivable questions
  locationField?: boolean; // New property to mark location-related questions
}

export interface FeedbackQuestion {
  id: string;
  type: 'text' | 'rating';
  question: string;
  options?: string[]; // For rating questions, e.g., ['1', '2', '3', '4', '5']
}

export interface Feedback {
  id: string; // UUID
  role: UserRole;
  questions: FeedbackQuestion[];
  answers: { [key: string]: string | number };
  createdAt: string;
}

// --- Contexts ---

export interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userId: string | null;
  login: (role: UserRole, id: string) => void;
  logout: () => void;
  loading: boolean;
}

// --- Component Props ---

export interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  error?: string;
  containerClassName?: string;
}

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  error?: string;
  containerClassName?: string;
}