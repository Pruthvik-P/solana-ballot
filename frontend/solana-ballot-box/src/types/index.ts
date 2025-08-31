
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Core Poll interface
export interface Poll {
  id: BN;
  description: string;
  startTime: BN;
  endTime: BN;
  candidateCount: BN;
  totalVotes: BN;
  isActive: boolean;
  authority: PublicKey;
}

// Candidate interface
export interface Candidate {
  id: BN;
  pollId: BN;
  name: string;
  votes: BN;
  authority: PublicKey;
}

// Voter interface
export interface Voter {
  pollId: BN;
  candidateId: BN;
  voter: PublicKey;
  hasVoted: boolean;
}

// Counter interface
export interface Counter {
  count: BN;
}

// Registrations interface
export interface Registrations {
  count: BN;
}

// Frontend-specific interfaces
// src/types/voting.ts
export interface PollCardData {
  id: number;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  candidateCount: number;
  totalVotes: number;
  isActive: boolean;
  status: "draft" | "active" | "ended";
}

export interface CandidateData {
  id: number;
  pollId: number;
  name: string;
  votes: number;  
  bio: string;
  percentage: number;
}

export interface VotingContextType {
  polls: PollCardData[];
  candidates: CandidateData[];
  loading: boolean;
  error: string | null;
  refreshPolls: () => Promise<void>;
  refreshCandidates: (pollId: number) => Promise<void>;
}


// Form data interfaces
export interface PollFormData {
  description: string;
  startTime: string;
  endTime: string;
}

export interface CandidateFormData {
  name: string;
  bio: string;
  pollId: number;
}

export interface VoteData {
  pollId: number;
  candidateId: number;
}

// UI State interfaces
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  message?: string;
  code?: string;
}

// Wallet state
export interface WalletState {
  connected: boolean;
  connecting: boolean;
  publicKey: PublicKey | null;
  balance: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Transaction response
export interface TransactionResponse {
  signature: string;
  success: boolean;
  error?: string;
}

// Search and filter types
export interface PollFilters {
  status: 'all' | 'active' | 'ended';
  searchTerm: string;
  sortBy: 'newest' | 'oldest' | 'mostVotes' | 'ending';
}

// Statistics interface
export interface VotingStats {
  totalPolls: number;
  activePolls: number;
  totalVotes: number;
  totalUsers: number;
  userVotes: number;
  userPolls: number;
}

// Navigation types
export interface NavItem {
  name: string;
  href: string;
  icon?: any;
  current?: boolean;
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Toast notification types
export interface ToastConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

// Theme types
export type Theme = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

// Form validation types
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'datetime-local' | 'select' | 'checkbox';
  placeholder?: string;
  rules?: ValidationRule;
  options?: { value: string; label: string }[];
}

// Chart data types for results visualization
export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface VotingResultsData {
  candidates: ChartDataPoint[];
  totalVotes: number;
  participationRate: number;
}

// Anchor program types
export interface ProgramAccount<T = any> {
  publicKey: PublicKey;
  account: T;
}

// PDA seed types
export interface PDASeeds {
  counter: string;
  registrations: string;
  poll: Buffer;
  candidate: Buffer;
  voter: Buffer;
}

// Error types
export type SolanaError = {
  code: number;
  message: string;
  name: string;
};

export type AnchorError = {
  error: {
    errorCode: {
      code: string;
      number: number;
    };
    errorMessage: string;
  };
};

// Event types
export interface PollCreatedEvent {
  pollId: number;
  description: string;
  creator: string;
  startTime: Date;
  endTime: Date;
}

export interface VoteCastEvent {
  pollId: number;
  candidateId: number;
  voter: string;
  timestamp: Date;
}

export interface CandidateRegisteredEvent {
  pollId: number;
  candidateId: number;
  name: string;
  timestamp: Date;
}
