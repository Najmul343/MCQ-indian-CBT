import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch,
  query,
  where,
  limit 
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { UserProfile, Tenant, Question, Test, TestAttempt } from '../types';

export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId
};

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore targeting the specific provisioned databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Primary Default Super Admin & User Fallbacks
export const DEFAULT_SUPER_ADMIN: UserProfile = {
  uid: 'superadmin_najmul',
  email: 'thenajmulhuda@gmail.com',
  name: 'Najmul Huda (Super Admin)',
  role: 'super_admin',
  status: 'active',
  createdAt: new Date().toISOString()
};

export const DEMO_USERS: UserProfile[] = [
  DEFAULT_SUPER_ADMIN
];

export const DEMO_TENANTS: Tenant[] = [
  {
    tenant_id: 'tenant_govt_iti',
    name: 'Government ITI Delhi (Main Campus)',
    code: 'GITI-DEL',
    city: 'New Delhi',
    principal_id: 'demo_principal_iti',
    principal_name: 'Dr. Rajesh Sharma',
    principal_email: 'principal@govt-iti.edu.in',
    max_students: 500,
    max_teachers: 25,
    createdAt: new Date().toISOString()
  },
  {
    tenant_id: 'tenant_pvt_iti',
    name: 'St. Joseph Technical Institute',
    code: 'SJTI-MUM',
    city: 'Mumbai',
    principal_name: 'Fr. Thomas Varghese',
    principal_email: 'principal@sjti.edu.in',
    max_students: 300,
    max_teachers: 15,
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_QUESTIONS: Question[] = [
  {
    question_id: 'q_001',
    exam_type: 'NCVT ITI',
    subject: 'Trade Theory',
    chapter: 'Basic Electrical',
    topic: 'Units & Ohm Law',
    question_text: 'What is the SI unit of electric current?',
    question_tr: 'विद्युत धारा की SI इकाई क्या है?',
    options: {
      A: 'Volt',
      B: 'Ampere',
      C: 'Ohm',
      D: 'Watt'
    },
    options_tr: {
      A: 'वोल्ट',
      B: 'एम्पीयर',
      C: 'ओम',
      D: 'वाट'
    },
    correct_option: 'B',
    difficulty: 'easy',
    points: 1,
    negative_marks: 0,
    explanation: 'Electric current is measured in Amperes (A). Named after French physicist André-Marie Ampère.'
  },
  {
    question_id: 'q_002',
    exam_type: 'NCVT ITI',
    subject: 'Trade Theory',
    chapter: 'Basic Electrical',
    topic: 'Ohm Law',
    question_text: "According to Ohm's Law, what is the formula for Voltage (V)?",
    question_tr: 'ओम के नियम के अनुसार, वोल्टेज (V) का सूत्र क्या है?',
    options: {
      A: 'V = I / R',
      B: 'V = I × R',
      C: 'V = I + R',
      D: 'V = I² × R'
    },
    correct_option: 'B',
    difficulty: 'medium',
    points: 1,
    negative_marks: 0.25,
    explanation: "Ohm's Law states that Voltage (V) equals Current (I) multiplied by Resistance (R): V = I × R."
  },
  {
    question_id: 'q_003',
    exam_type: 'NCVT ITI',
    subject: 'Trade Theory',
    chapter: 'Conductors & Insulators',
    topic: 'Materials',
    question_text: 'Which metal is the best conductor of electricity?',
    question_tr: 'कौन सी धातु विद्युत की सबसे अच्छी चालक है?',
    options: {
      A: 'Iron',
      B: 'Copper',
      C: 'Aluminium',
      D: 'Silver'
    },
    options_tr: {
      A: 'लोहा',
      B: 'तांबा',
      C: 'एल्युमिनियम',
      D: 'चांदी'
    },
    correct_option: 'D',
    difficulty: 'easy',
    points: 1,
    negative_marks: 0.25,
    explanation: 'Silver has the highest electrical conductivity of all metals, though copper is most widely used due to cost efficiency.'
  },
  {
    question_id: 'q_004',
    exam_type: 'NCVT ITI',
    subject: 'Workshop Calculation & Science',
    chapter: 'Units and Fraction',
    topic: 'Unit Systems',
    question_text: 'Which unit system is also known as the Metric System in international usage?',
    question_tr: 'अंतर्राष्ट्रीय उपयोग में किस इकाई प्रणाली को मीट्रिक प्रणाली भी कहा जाता है?',
    options: {
      A: 'FPS System',
      B: 'MKS / SI System',
      C: 'CGS System',
      D: 'Imperial System'
    },
    correct_option: 'B',
    difficulty: 'medium',
    points: 2,
    negative_marks: 0.5,
    explanation: 'The MKS (Meter, Kilogram, Second) / SI system forms the foundation of the modern metric system.'
  },
  {
    question_id: 'q_005',
    exam_type: 'NCVT ITI',
    subject: 'Employability Skills',
    chapter: 'Communication',
    topic: 'Verbal Skills',
    question_text: 'Which of the following is considered an essential component of active listening?',
    question_tr: 'निम्नलिखित में से किसे सक्रिय रूप से सुनने का एक आवश्यक घटक माना जाता है?',
    options: {
      A: 'Interrupting immediately to clarify',
      B: 'Maintaining eye contact and asking relevant questions',
      C: 'Looking at mobile phone while listening',
      D: 'Thinking about personal response before speaker finishes'
    },
    correct_option: 'B',
    difficulty: 'easy',
    points: 1,
    negative_marks: 0,
    explanation: 'Active listening requires full engagement, non-verbal feedback like eye contact, and clarifying questions without interrupting.'
  }
];

export const INITIAL_TESTS: Test[] = [
  {
    test_id: 'test_electrician_sem1',
    title: 'Electrician Trade Theory — Semester 1 Grand Mock Test',
    tenant_id: 'tenant_govt_iti',
    teacher_id: 'demo_teacher_electrician',
    teacher_name: 'Er. Anil Kumar',
    trade_class: 'Electrician - Sem 1',
    institute_name: 'Government ITI Delhi',
    institute_subtitle: 'Department of Training and Technical Education',
    exam_type: 'ITI (NCVT)',
    is_free_test: true,
    duration_minutes: 30,
    passing_marks: 40,
    shuffle_questions: true,
    shuffle_options: true,
    force_fullscreen: true,
    instructions: [
      'This is an official NCVT ITI Mock Test under full invigilation guard.',
      'Full-screen mode is enforced. Exiting fullscreen or switching tabs will log cheating violations.',
      'Read every question carefully. Immediate score report is generated upon submission.'
    ],
    question_ids: ['q_001', 'q_002', 'q_003', 'q_004', 'q_005'],
    questions: INITIAL_QUESTIONS,
    mode: 'exam',
    status: 'Active',
    createdAt: new Date().toISOString()
  },
  {
    test_id: 'test_practice_basic_elec',
    title: 'Interactive Practice: Basic Electrical Principles',
    tenant_id: 'tenant_govt_iti',
    teacher_id: 'demo_teacher_electrician',
    teacher_name: 'Er. Anil Kumar',
    trade_class: 'Electrician - Sem 1',
    institute_name: 'Government ITI Delhi',
    exam_type: 'ITI (NCVT)',
    is_free_test: true,
    duration_minutes: 45,
    passing_marks: 40,
    shuffle_questions: false,
    shuffle_options: false,
    force_fullscreen: false,
    instructions: [
      'Practice Mode gives instant feedback on every response.',
      'Selected answers are locked and explanations appear immediately.',
      'You can resume your progress at any time.'
    ],
    question_ids: ['q_001', 'q_002', 'q_003'],
    questions: INITIAL_QUESTIONS.slice(0, 3),
    mode: 'practice',
    status: 'Active',
    createdAt: new Date().toISOString()
  },
  {
    test_id: 'test_neet_biology_mock1',
    title: 'NEET (UG) 2026 — Free Full Biology & Physics CBT Practice Mock',
    tenant_id: 'free_portal',
    teacher_id: 'super_admin',
    teacher_name: 'NEET Expert Faculty',
    trade_class: 'NEET Medical',
    institute_name: 'AIMS Medical Academy',
    exam_type: 'NEET',
    is_free_test: true,
    duration_minutes: 60,
    passing_marks: 50,
    shuffle_questions: true,
    shuffle_options: true,
    force_fullscreen: false,
    instructions: [
      'Official NEET (UG) Pattern CBT Practice Test.',
      'Correct answer gives +4 marks, incorrect answer gives -1 negative marking.',
      'Comprehensive explanations available upon test submission.'
    ],
    question_ids: ['q_001', 'q_002', 'q_003', 'q_004'],
    questions: [
      {
        question_id: 'q_neet_1',
        exam_type: 'NEET',
        subject: 'Biology',
        chapter: 'Cell Biology',
        topic: 'Mitochondria',
        question_text: 'Which organelle is known as the powerhouse of the eukaryotic cell?',
        question_tr: 'यूकेरियोटिक कोशिका का शक्ति गृह (पावरहाउस) किसे कहा जाता है?',
        options: { A: 'Ribosome', B: 'Mitochondria', C: 'Golgi Apparatus', D: 'Endoplasmic Reticulum' },
        correct_option: 'B',
        difficulty: 'easy',
        points: 4,
        negative_marks: 1,
        explanation: 'Mitochondria generate ATP through cellular respiration, making them the powerhouses of eukaryotic cells.'
      },
      {
        question_id: 'q_neet_2',
        exam_type: 'NEET',
        subject: 'Physics',
        chapter: 'Mechanics',
        topic: 'Gravitation',
        question_text: 'What is the acceleration due to gravity on the surface of the Earth?',
        question_tr: 'पृथ्वी की सतह पर गुरुत्वाकर्षण के कारण त्वरण कितना होता है?',
        options: { A: '9.8 m/s²', B: '8.9 m/s²', C: '10.8 m/s²', D: '6.67 m/s²' },
        correct_option: 'A',
        difficulty: 'easy',
        points: 4,
        negative_marks: 1,
        explanation: 'Standard acceleration due to gravity near Earth surface is approximately 9.8 m/s².'
      }
    ],
    mode: 'exam',
    status: 'Active',
    createdAt: new Date().toISOString()
  },
  {
    test_id: 'test_ctet_cdp_mock1',
    title: 'CTET 2026 — Child Development & Pedagogy (Paper I & II) Free CBT Test',
    tenant_id: 'free_portal',
    teacher_id: 'super_admin',
    teacher_name: 'CTET Master Educator',
    trade_class: 'CTET Teacher Exam',
    institute_name: 'Central Teaching Institute',
    exam_type: 'CTET',
    is_free_test: true,
    duration_minutes: 45,
    passing_marks: 60,
    shuffle_questions: true,
    shuffle_options: false,
    force_fullscreen: false,
    instructions: [
      'Official CTET Pattern Child Development & Pedagogy Paper.',
      'No negative marking for incorrect attempts.',
      'Detailed pedagogical explanations provided for each question.'
    ],
    question_ids: ['q_ctet_1', 'q_ctet_2'],
    questions: [
      {
        question_id: 'q_ctet_1',
        exam_type: 'CTET',
        subject: 'Child Development & Pedagogy',
        chapter: 'Learning Theories',
        topic: 'Piaget Cognitive Development',
        question_text: 'According to Jean Piaget, at which stage do children develop object permanence?',
        question_tr: 'जीन पियाजे के अनुसार, बच्चे किस चरण में वस्तु स्थायित्व (Object Permanence) विकसित करते हैं?',
        options: { A: 'Sensorimotor Stage', B: 'Preoperational Stage', C: 'Concrete Operational Stage', D: 'Formal Operational Stage' },
        correct_option: 'A',
        difficulty: 'easy',
        points: 1,
        negative_marks: 0,
        explanation: 'Object permanence develops during the sensorimotor stage (0-2 years).'
      },
      {
        question_id: 'q_ctet_2',
        exam_type: 'CTET',
        subject: 'Pedagogy',
        chapter: 'Inclusive Education',
        topic: 'Differentiated Learning',
        question_text: 'What is the primary principle of Inclusive Education in schools?',
        question_tr: 'विद्यालयों में समावेशी शिक्षा (Inclusive Education) का प्राथमिक सिद्धांत क्या है?',
        options: { A: 'Segregating special needs students', B: 'Celebrating diversity and accommodating all learners', C: 'Teaching only high-performing students', D: 'Using identical rigid curriculum for all' },
        correct_option: 'B',
        difficulty: 'easy',
        points: 1,
        negative_marks: 0,
        explanation: 'Inclusive education embraces diversity and adapts teaching methods to accommodate all children regardless of ability.'
      }
    ],
    mode: 'exam',
    status: 'Active',
    createdAt: new Date().toISOString()
  }
];

// Helper to seed initial collections into Firestore if empty
export async function seedFirestoreIfNeeded() {
  const seedFlag = localStorage.getItem('firestore_seeded');
  if (seedFlag === 'true' || seedFlag === 'attempted' || seedFlag === 'quota_exceeded') {
    return;
  }

  try {
    const usersRef = collection(db, 'users');
    const userSnap = await getDocs(query(usersRef, limit(1)));

    if (userSnap.empty) {
      console.log('🌱 Seeding Firestore initial collections...');
      const batch = writeBatch(db);

      // 1. Users
      DEMO_USERS.forEach((usr) => {
        batch.set(doc(db, 'users', usr.uid), usr);
      });

      // 2. Tenants
      DEMO_TENANTS.forEach((t) => {
        batch.set(doc(db, 'tenants', t.tenant_id), t);
      });

      // 3. Questions
      INITIAL_QUESTIONS.forEach((q) => {
        batch.set(doc(db, 'questions', q.question_id), q);
      });

      // 4. Tests
      INITIAL_TESTS.forEach((t) => {
        batch.set(doc(db, 'tests', t.test_id), t);
      });

      await batch.commit();
      localStorage.setItem('firestore_seeded', 'true');
      console.log('✅ Firestore database initial seed completed!');
    } else {
      localStorage.setItem('firestore_seeded', 'true');
    }
  } catch (err: any) {
    localStorage.setItem('firestore_seeded', 'quota_exceeded');
    console.warn('Firestore seed notice (falling back to local cache):', err?.message || err);
  }
}

// Default fallbacks for cache initialization
function getDefaultFallback(collectionName: string): any[] {
  switch (collectionName) {
    case 'users':
      return DEMO_USERS;
    case 'tenants':
      return DEMO_TENANTS;
    case 'questions':
      return INITIAL_QUESTIONS;
    case 'tests':
      return INITIAL_TESTS;
    default:
      return [];
  }
}

// Local Storage Caching & Safe Firestore Wrapper Layer
function getDeletedIds(collectionName: string): Set<string> {
  try {
    const raw = localStorage.getItem(`deleted_ids_${collectionName}`);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch (e) {
    console.warn(`Deleted IDs read error for ${collectionName}:`, e);
  }
  return new Set();
}

function addDeletedId(collectionName: string, docId: string) {
  try {
    const ids = getDeletedIds(collectionName);
    ids.add(docId);
    localStorage.setItem(`deleted_ids_${collectionName}`, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn(`Deleted IDs write error for ${collectionName}:`, e);
  }
}

function removeDeletedId(collectionName: string, docId: string) {
  try {
    const ids = getDeletedIds(collectionName);
    if (ids.has(docId)) {
      ids.delete(docId);
      localStorage.setItem(`deleted_ids_${collectionName}`, JSON.stringify(Array.from(ids)));
    }
  } catch (e) {
    console.warn(`Deleted IDs remove error for ${collectionName}:`, e);
  }
}

function getLocalCache<T>(collectionName: string, fallback: T[]): T[] {
  try {
    const item = localStorage.getItem(`cache_${collectionName}`);
    if (item) {
      const parsed = JSON.parse(item);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(`Local cache read error for ${collectionName}:`, e);
  }
  return fallback;
}

function setLocalCache<T>(collectionName: string, data: T[]) {
  try {
    localStorage.setItem(`cache_${collectionName}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`Local cache write error for ${collectionName}:`, e);
  }
}

export async function safeGetDocs<T>(collectionName: string, fallback: T[]): Promise<T[]> {
  const deletedIds = getDeletedIds(collectionName);
  const initialFallback = fallback && fallback.length > 0 ? fallback : getDefaultFallback(collectionName);
  const cachedDocs = getLocalCache<T>(collectionName, initialFallback).filter((item: any) => {
    const id = item.doc_id || item.folder_id || item.question_id || item.test_id || item.tenant_id || item.uid || item.id;
    return !id || !deletedIds.has(id);
  });

  let rawDocs: any[] = cachedDocs;

  try {
    const fetchPromise = getDocs(collection(db, collectionName));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore fetch timeout')), 2500)
    );
    const snap = (await Promise.race([fetchPromise, timeoutPromise])) as any;

    if (snap && !snap.empty) {
      const remoteDocs = snap.docs
        .map((d: any) => {
          const data = d.data() as any;
          return { ...data, doc_id: data.doc_id || d.id };
        })
        .filter((item: any) => {
          const id = item.doc_id || item.folder_id || item.question_id || item.test_id || item.tenant_id || item.uid || item.id;
          return (!id || !deletedIds.has(id));
        });

      // Merge remoteDocs with cachedDocs
      const mergedMap = new Map<string, any>();
      cachedDocs.forEach((item: any) => {
        const id = item.doc_id || item.folder_id || item.question_id || item.test_id || item.tenant_id || item.uid || item.id;
        if (id && !deletedIds.has(id)) mergedMap.set(id, item);
      });
      remoteDocs.forEach((item: any) => {
        const id = item.doc_id || item.folder_id || item.question_id || item.test_id || item.tenant_id || item.uid || item.id;
        if (id && !deletedIds.has(id)) mergedMap.set(id, item);
      });
      rawDocs = Array.from(mergedMap.values());
    }
  } catch (err: any) {
    console.warn(`Firestore getDocs notice for ${collectionName}:`, err?.message || err);
  }

  let finalDocs = rawDocs as T[];

  if (collectionName === 'users') {
    const emailMap = new Map<string, UserProfile>();
    const duplicatesToDelete: string[] = [];

    const rolePriority: Record<string, number> = {
      super_admin: 4,
      principal: 3,
      teacher: 2,
      student: 1
    };

    (rawDocs as unknown as UserProfile[]).forEach((u) => {
      if (!u.email) return;
      const lowerEmail = u.email.toLowerCase().trim();
      if (!emailMap.has(lowerEmail)) {
        emailMap.set(lowerEmail, u);
      } else {
        const existing = emailMap.get(lowerEmail)!;
        const existingScore = (rolePriority[existing.role] || 0) + (existing.tenant_id ? 0.5 : 0);
        const newScore = (rolePriority[u.role] || 0) + (u.tenant_id ? 0.5 : 0);

        let winner: UserProfile;
        let loser: UserProfile;

        if (newScore > existingScore) {
          winner = u;
          loser = existing;
        } else {
          winner = existing;
          loser = u;
        }

        const mergedWinner: UserProfile = {
          ...loser,
          ...winner,
          role: winner.role || loser.role,
          tenant_id: winner.tenant_id || loser.tenant_id,
          tenant_name: winner.tenant_name || loser.tenant_name,
        };

        emailMap.set(lowerEmail, mergedWinner);
        if (loser.uid && loser.uid !== winner.uid) {
          duplicatesToDelete.push(loser.uid);
        }
      }
    });

    finalDocs = Array.from(emailMap.values()) as unknown as T[];

    if (duplicatesToDelete.length > 0) {
      duplicatesToDelete.forEach((dupUid) => {
        safeDeleteDoc('users', dupUid, 'uid').catch(() => {});
      });
    }
  }

  setLocalCache(collectionName, finalDocs);
  return finalDocs;
}

export async function safeSetDoc(collectionName: string, docId: string, idField: string, data: any) {
  removeDeletedId(collectionName, docId);

  // Sanitize data to remove any fields with `undefined` values which crash setDoc in Firestore
  const cleanData: any = {};
  if (data && typeof data === 'object') {
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    });
  }

  try {
    const fallback = getDefaultFallback(collectionName);
    const current = getLocalCache<any>(collectionName, fallback);
    const idx = current.findIndex((item) => {
      const id = item[idField] || item.doc_id || item.folder_id || item.question_id || item.test_id || item.tenant_id || item.uid || item.id;
      return id === docId;
    });
    let updated: any[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...cleanData };
    } else {
      updated = [cleanData, ...current];
    }
    setLocalCache(collectionName, updated);
  } catch (e) {
    console.warn('safeSetDoc local update error:', e);
  }

  try {
    const setPromise = setDoc(doc(db, collectionName, docId), cleanData, { merge: true });
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore setDoc timeout')), 2500)
    );
    await Promise.race([setPromise, timeoutPromise]);
  } catch (err: any) {
    console.warn(`Firestore setDoc notice for ${collectionName}/${docId}:`, err?.message || err);
  }
}

export async function safeDeleteDoc(collectionName: string, docId: string, idField: string) {
  addDeletedId(collectionName, docId);

  try {
    const fallback = getDefaultFallback(collectionName);
    const current = getLocalCache<any>(collectionName, fallback);
    const updated = current.filter((item) => {
      const id = item[idField] || item.doc_id || item.folder_id || item.question_id || item.test_id || item.tenant_id || item.uid || item.id;
      return id !== docId;
    });
    setLocalCache(collectionName, updated);
  } catch (e) {
    console.warn('safeDeleteDoc local update error:', e);
  }

  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err: any) {
    console.warn(`Firestore deleteDoc notice for ${collectionName}/${docId}:`, err?.message || err);
  }
}

export async function upsertUserByEmail(userProfile: UserProfile): Promise<UserProfile> {
  const targetEmail = userProfile.email?.toLowerCase().trim();
  if (!targetEmail) {
    const defaultUid = userProfile.uid || `usr_${Date.now()}`;
    await safeSetDoc('users', defaultUid, 'uid', userProfile);
    return userProfile;
  }

  // 1. Get current user list
  const currentUsers = await safeGetDocs<UserProfile>('users', DEMO_USERS);
  const matchingUsers = currentUsers.filter(
    (u) => u.email && u.email.toLowerCase().trim() === targetEmail
  );

  const rolePriority: Record<string, number> = { super_admin: 4, principal: 3, teacher: 2, student: 1 };

  matchingUsers.sort((a, b) => {
    const scoreA = (rolePriority[a.role] || 0) + (a.tenant_id ? 0.5 : 0);
    const scoreB = (rolePriority[b.role] || 0) + (b.tenant_id ? 0.5 : 0);
    return scoreB - scoreA;
  });

  const existingBest = matchingUsers[0];

  let targetRole = userProfile.role;
  if (existingBest) {
    const existingScore = (rolePriority[existingBest.role] || 0) + (existingBest.tenant_id ? 0.5 : 0);
    const newScore = (rolePriority[userProfile.role] || 0) + (userProfile.tenant_id ? 0.5 : 0);
    if (existingScore > newScore) {
      targetRole = existingBest.role;
    }
  }

  // 2. Determine primary UID
  let targetUid = userProfile.uid;
  if (!targetUid || targetUid.startsWith('usr_') || targetUid.startsWith('pr_')) {
    const realAuthUser = matchingUsers.find((u) => u.uid && !u.uid.startsWith('usr_') && !u.uid.startsWith('pr_'));
    if (realAuthUser) {
      targetUid = realAuthUser.uid;
    } else {
      targetUid = targetUid || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    }
  }

  // 3. Merge profiles so existing data isn't lost
  const finalProfile: UserProfile = {
    ...(existingBest || {}),
    ...userProfile,
    role: targetRole,
    uid: targetUid,
    email: targetEmail,
  };

  // 4. Save primary document
  await safeSetDoc('users', targetUid, 'uid', finalProfile);

  // 5. Delete duplicate documents with different UIDs for this email
  for (const match of matchingUsers) {
    if (match.uid && match.uid !== targetUid) {
      try {
        await safeDeleteDoc('users', match.uid, 'uid');
      } catch (e) {
        console.warn('Cleanup duplicate user error:', e);
      }
    }
  }

  return finalProfile;
}
