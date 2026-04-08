import { Timestamp } from 'firebase/firestore';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Timestamp;
  trialEndsAt: Timestamp;
  isSubscribed?: boolean;
}

export type ApplicationResult = 'Applied' | 'No Response' | 'Interviewing' | 'Approve' | 'Decline' | 'Processed' | 'View';
export type EducationLevel = 'SMA/SMK' | 'D3' | 'S1/D4' | 'S2' | 'No Minimum Education';

export interface ApplicationLog {
  status: string;
  timestamp: Timestamp;
}

export interface JobApplication {
  id?: string;
  userId: string;
  companyName: string;
  position: string;
  location?: string;
  applyDate: Timestamp;
  platform?: string;
  result: ApplicationResult;
  minEducation?: EducationLevel;
  jobLink?: string;
  logs?: ApplicationLog[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
