export type EnquiryStatus = 'New' | 'In Process' | 'Follow Up' | 'Converted' | 'Not Interested';

export interface Enquiry {
  id?: string;
  enquiryId: string;
  enquiryDate: any;
  enquirerName: string;
  mobile: string;
  email: string;
  classInterested: string;
  source: string;
  status: EnquiryStatus;
  assignedTo: string;
  nextFollowUp: string;
  createdAt: any;
  updatedAt: any;
}

export interface Activity {
  id?: string;
  enquiryId: string;
  type: 'System' | 'Call' | 'Email' | 'Status Change' | 'Visit';
  description: string;
  timestamp: any;
  performedBy: string;
}

export interface FollowUpTask {
  id?: string;
  enquiryId: string;
  title: string;
  assignedTo: string;
  dueDate: any;
  status: 'Pending' | 'Completed';
}

/** Admission APIs will be added next; keep UI stable with empty data for now. */
export const addEnquiry = async (_enquiryData: Partial<Enquiry>) => {
  throw new Error('Admission API is not connected yet');
};

export const updateEnquiryStatus = async (
  _id: string,
  _newStatus: EnquiryStatus,
  _nextFollowUp?: string,
  _userId?: string,
) => {
  throw new Error('Admission API is not connected yet');
};

export const deleteEnquiry = async (_id: string) => {
  throw new Error('Admission API is not connected yet');
};

export const logActivity = async (_activityData: Partial<Activity>) => {
  throw new Error('Admission API is not connected yet');
};

export const addFollowUpTask = async (_taskData: Partial<FollowUpTask>) => {
  throw new Error('Admission API is not connected yet');
};

export const subscribeToEnquiries = (callback: (data: Enquiry[]) => void, _filters?: { status?: string }) => {
  callback([]);
  return () => {};
};

export const subscribeToAllActivities = (callback: (data: Activity[]) => void) => {
  callback([]);
  return () => {};
};

export const subscribeToAllTasks = (callback: (data: FollowUpTask[]) => void) => {
  callback([]);
  return () => {};
};
