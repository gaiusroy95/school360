import { api } from './api';

export type InteractionType =
  | 'Phone Call'
  | 'Campus Visit'
  | 'Email'
  | 'WhatsApp'
  | 'Virtual Meeting';

export type Sentiment =
  | 'Highly Positive'
  | 'Positive'
  | 'Neutral'
  | 'Concerned'
  | 'Negative';

export type EngagementLevel = 'Very Active' | 'Active' | 'Passive' | 'Unresponsive';

export type RiskFactor =
  | 'Distance/Transport'
  | 'High Fees'
  | 'Academic Competition'
  | 'Undecided'
  | 'Competitor School'
  | 'None';

export type ActionIntent =
  | 'Needs Follow-up'
  | 'Schedule Interview'
  | 'Send Fee Details'
  | 'Mark as Lost'
  | 'Move to Application';

export type CounselingLead = {
  id: string;
  enquiryId: string;
  enquirerName: string;
  mobile: string;
  email: string;
  classInterested: string;
  status: string;
  assignedTo: string;
  nextFollowUp: string;
  lastContactedAt: string;
  lastSentiment: string;
  lastEngagement: string;
  lastRiskFactor: string;
  lastRiskDetails: string;
  enquiryDate: string;
};

export type CounselingLog = {
  id: string;
  interactionType: InteractionType | string;
  sentiment: Sentiment | string;
  engagement: EngagementLevel | string;
  riskFactor: RiskFactor | string;
  riskDetails: string;
  remarks: string;
  actionIntent: ActionIntent | string;
  nextFollowUp: string;
  counselorName: string;
  createdAt: string;
};

export type CounselingMeta = {
  interactionTypes: InteractionType[];
  sentiments: Sentiment[];
  engagementLevels: EngagementLevel[];
  riskFactors: RiskFactor[];
  actionIntents: ActionIntent[];
};

export type CounselingSessionInput = {
  interactionType: InteractionType | string;
  sentiment: Sentiment | string;
  engagement: EngagementLevel | string;
  riskFactor: RiskFactor | string;
  riskDetails?: string;
  remarks: string;
  actionIntent: ActionIntent | string;
  nextFollowUp?: string;
  counselorName?: string;
};

export async function fetchCounselingMeta() {
  return api<CounselingMeta>('/api/counselling/meta');
}

export async function fetchCounselingQueue(params?: {
  sort?: 'lastContacted' | 'followUpDue';
  assignedTo?: string;
}) {
  const q = new URLSearchParams();
  if (params?.sort) q.set('sort', params.sort);
  if (params?.assignedTo) q.set('assignedTo', params.assignedTo);
  const qs = q.toString();
  return api<{ leads: CounselingLead[] }>(`/api/counselling/queue${qs ? `?${qs}` : ''}`);
}

export async function fetchCounselingLead(enquiryDbId: string) {
  return api<{ lead: CounselingLead; logs: CounselingLog[] }>(`/api/counselling/${enquiryDbId}`);
}

export async function logCounselingSession(enquiryDbId: string, data: CounselingSessionInput) {
  return api<{ log: CounselingLog; lead: CounselingLead; logs: CounselingLog[] }>(
    `/api/counselling/${enquiryDbId}/sessions`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );
}
