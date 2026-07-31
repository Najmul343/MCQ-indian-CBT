export type UserRole = 'super_admin' | 'principal' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  tenant_id?: string;
  tenant_name?: string;
  principal_id?: string;
  teacher_id?: string;
  teacher_name?: string;
  accessible_courses?: string[];
  assigned_folders?: string[]; // TestFolder IDs assigned to this student
  assigned_tests?: string[];   // Specific Test IDs assigned to this student
  rollNo?: string;
  trade?: string; // e.g. Electrician, Fitter, Welder, COPA, Wireman, Mechanical
  className?: string; // e.g. Year 1, Semester 2, Batch 2026
  status?: 'active' | 'inactive';
  phone?: string;
  target_exam?: '🩺 NEET (UG) (Medical Entrance CBT)' | '⚡ ITI (NCVT) (Trade Theory CBT)' | '📚 CTET (Teaching Eligibility CBT)' | string;
  is_limited_version?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  registered_by?: string;
}

export interface Tenant {
  tenant_id: string;
  name: string;
  code: string;
  city?: string;
  join_code?: string; // e.g. 'GITI-2026' for self-onboarding
  student_join_code?: string;
  teacher_join_code?: string;
  principal_id?: string;
  principal_name?: string;
  principal_email?: string;
  status?: 'Active' | 'Trial' | 'Suspended';
  subscription_plan?: 'Free Starter' | 'Pro College' | 'Enterprise';
  trades_offered?: string[]; // e.g. ['Electrician', 'Fitter', 'Welder', 'COPA', 'Wireman', 'Employability Skills']
  max_students?: number;
  max_teachers?: number;
  createdAt: string;
}

export interface QuestionOptions {
  A: string;
  B: string;
  C: string;
  D: string;
}

export interface QuestionFolder {
  folder_id: string;
  name: string;
  parent_id: string | null; // 'root' or parent folder_id
  path: string; // e.g. "/Electrician/Semester 1"
  category?: string; // '⚡ ITI (NCVT) (Trade Theory CBT)' | '🩺 NEET (UG) (Medical Entrance CBT)' | '📚 CTET (Teaching Eligibility CBT)'
  trade?: string;
  createdAt: string;
  tenant_id?: string;
}

export interface TestFolder {
  folder_id: string;
  name: string;
  parent_id: string | null; // 'root' or parent folder_id
  path: string; // e.g. "/Mock Tests/Electrician 2026"
  category?: string; // '⚡ ITI (NCVT) (Trade Theory CBT)' | '🩺 NEET (UG) (Medical Entrance CBT)' | '📚 CTET (Teaching Eligibility CBT)'
  trade?: string;
  createdAt: string;
  tenant_id?: string;
}

export interface Question {
  question_id: string;
  folder_id?: string;
  tenant_id?: string | 'global';
  owner_id?: string;
  visibility?: 'private' | 'tenant' | 'global';
  exam_type: string;
  subject: string;
  chapter: string;
  topic: string;
  question_text: string;
  question_tr?: string;
  image_url?: string;
  options: QuestionOptions;
  options_tr?: Partial<QuestionOptions>;
  options_image?: Partial<QuestionOptions>;
  correct_option: 'A' | 'B' | 'C' | 'D';
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  negative_marks: number;
  explanation?: string;
  explanation_tr?: string;
  explanation_image?: string;
  usage_count?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Course {
  course_id: string;
  title: string;
  tenant_id?: string;
  hierarchy: {
    exam_type: string;
    subject: string;
    chapter: string;
    topic: string;
  };
  tests_count?: number;
}

export interface Test {
  test_id: string;
  folder_id?: string;
  title: string;
  tenant_id?: string;
  teacher_id?: string;
  teacher_name?: string;
  trade_class?: string;
  institute_name?: string;
  institute_subtitle?: string;
  exam_type?: string; // 'NEET' | 'ITI (NCVT)' | 'CTET'
  is_free_test?: boolean;
  duration_minutes: number;
  passing_marks: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  force_fullscreen: boolean;
  instructions: string[];
  question_ids: string[];
  questions?: Question[];
  source?: 'own_bank' | 'global_bank' | 'mixed';
  mode: 'exam' | 'practice';
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
}

export interface TestAttempt {
  attempt_id: string;
  tenant_id?: string;
  teacher_id?: string;
  student_id: string;
  student_email: string;
  student_name: string;
  roll_no: string;
  class_name?: string;
  trade?: string;
  test_id: string;
  test_title: string;
  status: 'PASS' | 'FAIL' | 'submitted';
  responses: Record<string, 'A' | 'B' | 'C' | 'D'>;
  score: number;
  total_marks: number;
  percentage: number;
  time_taken_seconds: number;
  fs_violations: number;
  tab_switches: number;
  submitted_at: string;
  mode: 'exam' | 'practice';
}
