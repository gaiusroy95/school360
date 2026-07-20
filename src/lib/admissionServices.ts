import { isDemoVersion } from './config';
import type { Firestore } from 'firebase/firestore';

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

export interface User {
  uid: string;
  role: string;
  name: string;
  department: string;
}

// --- In-memory demo store (used when DEMO_VERSION=true) ---

const now = () => new Date().toISOString();

let demoEnquiries: Enquiry[] = [
  {
    id: 'demo-enq-1',
    enquiryId: 'ENQ00001',
    enquiryDate: now(),
    enquirerName: 'Priya Sharma',
    mobile: '9876543210',
    email: 'priya.sharma@email.com',
    classInterested: 'Class 5',
    source: 'Website',
    status: 'New',
    assignedTo: 'demo-super-admin',
    nextFollowUp: '2026-05-20',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'demo-enq-2',
    enquiryId: 'ENQ00002',
    enquiryDate: now(),
    enquirerName: 'Rahul Mehta',
    mobile: '9123456780',
    email: 'rahul.mehta@email.com',
    classInterested: 'Class 8',
    source: 'Referral',
    status: 'In Process',
    assignedTo: 'demo-super-admin',
    nextFollowUp: '2026-05-18',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'demo-enq-3',
    enquiryId: 'ENQ00003',
    enquiryDate: now(),
    enquirerName: 'Ananya Gupta',
    mobile: '9988776655',
    email: 'ananya.g@email.com',
    classInterested: 'Class 1',
    source: 'Walk-in',
    status: 'Follow Up',
    assignedTo: 'demo-super-admin',
    nextFollowUp: '2026-05-22',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'demo-enq-4',
    enquiryId: 'ENQ00004',
    enquiryDate: now(),
    enquirerName: 'Vikram Singh',
    mobile: '9012345678',
    email: 'vikram.singh@email.com',
    classInterested: 'Class 10',
    source: 'Social Media',
    status: 'Converted',
    assignedTo: 'demo-super-admin',
    nextFollowUp: '',
    createdAt: now(),
    updatedAt: now(),
  },
  {
    id: 'demo-enq-5',
    enquiryId: 'ENQ00005',
    enquiryDate: now(),
    enquirerName: 'Neha Kapoor',
    mobile: '9765432109',
    email: 'neha.k@email.com',
    classInterested: 'Class 3',
    source: 'Advertisement',
    status: 'Not Interested',
    assignedTo: 'demo-super-admin',
    nextFollowUp: '',
    createdAt: now(),
    updatedAt: now(),
  },
];

let demoActivities: Activity[] = [
  {
    id: 'demo-act-1',
    enquiryId: 'demo-enq-1',
    type: 'System',
    description: 'New enquiry received from Website',
    timestamp: now(),
    performedBy: 'System',
  },
  {
    id: 'demo-act-2',
    enquiryId: 'demo-enq-2',
    type: 'Call',
    description: 'Spoke with parent about admission process',
    timestamp: now(),
    performedBy: 'Demo Super Admin',
  },
  {
    id: 'demo-act-3',
    enquiryId: 'demo-enq-4',
    type: 'Status Change',
    description: 'Enquiry status updated to Converted',
    timestamp: now(),
    performedBy: 'Demo Super Admin',
  },
];

let demoTasks: FollowUpTask[] = [
  {
    id: 'demo-task-1',
    enquiryId: 'demo-enq-1',
    title: 'Call parent for campus visit',
    assignedTo: 'Demo Super Admin',
    dueDate: '2026-05-20',
    status: 'Pending',
  },
  {
    id: 'demo-task-2',
    enquiryId: 'demo-enq-3',
    title: 'Send fee structure brochure',
    assignedTo: 'Demo Super Admin',
    dueDate: '2026-05-19',
    status: 'Pending',
  },
];

type Listener<T> = (data: T[]) => void;
const enquiryListeners = new Set<Listener<Enquiry>>();
const activityListeners = new Set<Listener<Activity>>();
const taskListeners = new Set<Listener<FollowUpTask>>();

const notifyEnquiries = () => enquiryListeners.forEach((cb) => cb([...demoEnquiries]));
const notifyActivities = () => activityListeners.forEach((cb) => cb([...demoActivities]));
const notifyTasks = () => taskListeners.forEach((cb) => cb([...demoTasks]));

async function getDb(): Promise<Firestore> {
  const { db } = await import('./firebase');
  if (!db) throw new Error('Firebase is not available in demo mode');
  return db;
}

export const addEnquiry = async (enquiryData: Partial<Enquiry>) => {
  if (isDemoVersion) {
    const id = `demo-enq-${Date.now()}`;
    const enquiryId = `ENQ${Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, '0')}`;
    const enquiry: Enquiry = {
      id,
      enquiryId,
      enquiryDate: now(),
      enquirerName: enquiryData.enquirerName || '',
      mobile: enquiryData.mobile || '',
      email: enquiryData.email || '',
      classInterested: enquiryData.classInterested || '',
      source: enquiryData.source || 'Unknown',
      status: (enquiryData.status as EnquiryStatus) || 'New',
      assignedTo: enquiryData.assignedTo || 'demo-super-admin',
      nextFollowUp: enquiryData.nextFollowUp || '',
      createdAt: now(),
      updatedAt: now(),
    };
    demoEnquiries = [enquiry, ...demoEnquiries];
    demoActivities = [
      {
        id: `demo-act-${Date.now()}`,
        enquiryId: id,
        type: 'System',
        description: `New enquiry received from ${enquiry.source}`,
        timestamp: now(),
        performedBy: enquiry.assignedTo || 'System',
      },
      ...demoActivities,
    ];
    notifyEnquiries();
    notifyActivities();
    return id;
  }

  const {
    collection,
    doc,
    writeBatch,
    serverTimestamp,
  } = await import('firebase/firestore');
  const db = await getDb();
  const enquiriesRef = collection(db, 'enquiries');
  const batch = writeBatch(db);

  const docRef = doc(enquiriesRef);
  const enquiryId = `ENQ${Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0')}`;

  batch.set(docRef, {
    ...enquiryData,
    enquiryId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    enquiryDate: serverTimestamp(),
  });

  const activityRef = doc(collection(db, 'enquiry_activities'));
  batch.set(activityRef, {
    enquiryId: docRef.id,
    type: 'System',
    description: `New enquiry received from ${enquiryData.source || 'Unknown'}`,
    timestamp: serverTimestamp(),
    performedBy: enquiryData.assignedTo || 'System',
  });

  await batch.commit();
  return docRef.id;
};

export const updateEnquiryStatus = async (
  id: string,
  newStatus: EnquiryStatus,
  nextFollowUp?: string,
  userId?: string,
) => {
  if (isDemoVersion) {
    demoEnquiries = demoEnquiries.map((e) =>
      e.id === id
        ? {
            ...e,
            status: newStatus,
            nextFollowUp: nextFollowUp ?? e.nextFollowUp,
            updatedAt: now(),
          }
        : e,
    );
    demoActivities = [
      {
        id: `demo-act-${Date.now()}`,
        enquiryId: id,
        type: 'Status Change',
        description: `Enquiry status updated to ${newStatus}`,
        timestamp: now(),
        performedBy: userId || 'System',
      },
      ...demoActivities,
    ];
    notifyEnquiries();
    notifyActivities();
    return;
  }

  const { collection, doc, writeBatch, serverTimestamp } = await import('firebase/firestore');
  const db = await getDb();
  const enquiryRef = doc(db, 'enquiries', id);
  const batch = writeBatch(db);

  const data: Record<string, unknown> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };
  if (nextFollowUp) data.nextFollowUp = nextFollowUp;
  batch.update(enquiryRef, data);

  const activityRef = doc(collection(db, 'enquiry_activities'));
  batch.set(activityRef, {
    enquiryId: id,
    type: 'Status Change',
    description: `Enquiry status updated to ${newStatus}`,
    timestamp: serverTimestamp(),
    performedBy: userId || 'System',
  });

  await batch.commit();
};

export const deleteEnquiry = async (id: string) => {
  if (isDemoVersion) {
    demoEnquiries = demoEnquiries.filter((e) => e.id !== id);
    notifyEnquiries();
    return;
  }

  const { doc, deleteDoc } = await import('firebase/firestore');
  const db = await getDb();
  await deleteDoc(doc(db, 'enquiries', id));
};

export const logActivity = async (activityData: Partial<Activity>) => {
  if (isDemoVersion) {
    demoActivities = [
      {
        id: `demo-act-${Date.now()}`,
        enquiryId: activityData.enquiryId || '',
        type: activityData.type || 'System',
        description: activityData.description || '',
        timestamp: now(),
        performedBy: activityData.performedBy || 'System',
      },
      ...demoActivities,
    ];
    notifyActivities();
    return;
  }

  const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
  const db = await getDb();
  await addDoc(collection(db, 'enquiry_activities'), {
    ...activityData,
    timestamp: serverTimestamp(),
  });
};

export const addFollowUpTask = async (taskData: Partial<FollowUpTask>) => {
  if (isDemoVersion) {
    demoTasks = [
      {
        id: `demo-task-${Date.now()}`,
        enquiryId: taskData.enquiryId || '',
        title: taskData.title || '',
        assignedTo: taskData.assignedTo || '',
        dueDate: taskData.dueDate || now(),
        status: 'Pending',
      },
      ...demoTasks,
    ];
    notifyTasks();
    return;
  }

  const { collection, addDoc } = await import('firebase/firestore');
  const db = await getDb();
  await addDoc(collection(db, 'follow_up_tasks'), {
    ...taskData,
    status: 'Pending',
  });
};

export const subscribeToEnquiries = (callback: (data: Enquiry[]) => void, filters?: { status?: string }) => {
  if (isDemoVersion) {
    const emit = () => {
      let data = [...demoEnquiries];
      if (filters?.status && filters.status !== 'All') {
        data = data.filter((e) => e.status === filters.status);
      }
      callback(data);
    };
    enquiryListeners.add(emit);
    emit();
    return () => {
      enquiryListeners.delete(emit);
    };
  }

  let unsub = () => {};
  (async () => {
    const { collection, query, where, orderBy, onSnapshot } = await import('firebase/firestore');
    const db = await getDb();
    const enquiriesRef = collection(db, 'enquiries');
    let q = query(enquiriesRef, orderBy('createdAt', 'desc'));

    if (filters?.status && filters.status !== 'All') {
      q = query(enquiriesRef, where('status', '==', filters.status), orderBy('createdAt', 'desc'));
    }

    unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Enquiry[];
      callback(data);
    });
  })();

  return () => unsub();
};

export const subscribeToAllActivities = (callback: (data: Activity[]) => void) => {
  if (isDemoVersion) {
    const emit = () => callback(demoActivities.slice(0, 10));
    activityListeners.add(emit);
    emit();
    return () => {
      activityListeners.delete(emit);
    };
  }

  let unsub = () => {};
  (async () => {
    const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
    const db = await getDb();
    const q = query(collection(db, 'enquiry_activities'), orderBy('timestamp', 'desc'), limit(10));
    unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Activity[];
      callback(data);
    });
  })();

  return () => unsub();
};

export const subscribeToAllTasks = (callback: (data: FollowUpTask[]) => void) => {
  if (isDemoVersion) {
    const emit = () => callback([...demoTasks]);
    taskListeners.add(emit);
    emit();
    return () => {
      taskListeners.delete(emit);
    };
  }

  let unsub = () => {};
  (async () => {
    const { collection, query, onSnapshot } = await import('firebase/firestore');
    const db = await getDb();
    unsub = onSnapshot(query(collection(db, 'follow_up_tasks')), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as FollowUpTask[];
      callback(data);
    });
  })();

  return () => unsub();
};
