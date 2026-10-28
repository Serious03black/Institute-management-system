// Shared TypeScript types for the IMS frontend

export interface Admin {
  adminId: string;
  username: string;
  profile: { name: string; email?: string; mobile?: string };
}

export interface Course {
  _id: string;
  courseId: string;
  title: string;
  description?: string;
  moduleIds: Module[];
  status: 'ACTIVE' | 'INACTIVE';
  enrolledStudents?: number;
  createdAt: string;
}

export interface Module {
  _id: string;
  moduleId: string;
  title: string;
  courseId: string | Course;
  status: 'ACTIVE' | 'INACTIVE';
  questionBankId?: string;
}

export interface Faculty {
  _id: string;
  facultyId: string;
  name: string;
  address: string;
  education: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  dateOfBirth: string;
  teachingCourseIds: Course[];
  teachingModuleIds: Module[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Batch {
  _id: string;
  batchId: string;
  batchType: 'DAILY' | 'ALTERNATE' | 'WEEKLY';
  alternateGroup?: 'A' | 'B';
  startTime: string;
  endTime: string;
  applicableDays: string[];
  durationMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export type StudentStatus = 'CURRENT' | 'COMPLETED' | 'CANCELLED';

export interface Student {
  _id: string;
  studentId: string;
  personalInfo: {
    name: string;
    address: string;
    mobile: string;
    parentMobile: string;
    dateOfBirth: string;
    email?: string;
    education: string;
  };
  enrollment: {
    courseId: Course | string;
    courseTitleSnapshot: string;
    moduleIds: Module[] | string[];
    moduleSnapshots: { moduleId: string; title: string }[];
    joiningDate: string;
    courseDuration: string;
    batchType: 'DAILY' | 'ALTERNATE' | 'WEEKLY';
    batchId?: Batch | string;
    batchTime?: string;
    facultyId: Faculty | string;
    facultyNameSnapshot?: string;
  };
  fees: { registrationFee: number; courseFee: number };
  status: StudentStatus;
  cancellationDetails?: { cancelledAt: string; reason: string; cancelledBy: string };
  completionDetails?: { completedAt: string };
  createdAt: string;
}

export interface ExamCredential {
  _id: string;
  examUsername: string;
  studentId: Student;
  allowedModuleIds: Module[];
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
}

export interface ExamAttempt {
  _id: string;
  attemptId: string;
  studentId: Student | string;
  courseId: string;
  moduleId: Module | string;
  attemptType: 'REGULAR' | 'REEXAM';
  selectedQuestions: SelectedQuestion[];
  questionOrder: string[];
  startTime: string;
  deadline: string;
  submissionTime?: string;
  durationSeconds?: number;
  answers: Answer[];
  attemptStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED' | 'TIMED_OUT' | 'EVALUATED';
  objectiveEvaluation?: ObjectiveEvaluation;
  practicalEvaluationStatus: 'PENDING' | 'COMPLETED' | 'NOT_REQUIRED';
  createdAt: string;
}

export interface SelectedQuestion {
  questionId: string;
  section: string;
  questionText: string;
  options?: { A: string; B: string; C: string; D: string };
  maximumMarks: number;
}

export interface Answer {
  questionId: string;
  selectedOption?: string;
  codeAnswer?: string;
  savedAt: string;
}

export interface ObjectiveEvaluation {
  totalObjectiveQuestions: number;
  answeredCorrectly: number;
  answeredIncorrectly: number;
  unanswered: number;
  totalObjectiveMarks: number;
  evaluatedAt: string;
}

export interface ModuleResult {
  _id: string;
  studentId: Student | string;
  courseId: Course | string;
  moduleId: Module | string;
  latestValidAttemptId: ExamAttempt | string;
  objectiveMarks: number;
  practicalMarks: number;
  totalMarks: number;
  maximumMarks: number;
  passingMarks: number;
  status: 'PENDING_REVIEW' | 'PASS' | 'FAIL';
  finalizedAt?: string;
}

export interface QuestionBank {
  _id: string;
  courseId: Course;
  moduleId: Module;
  version: number;
  sourceFileName: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'ACTIVE' | 'REPLACED' | 'INVALID';
  sectionCounts: { basic: number; mid: number; advanced: number; practical: number };
}

export interface QuestionItem {
  _id: string;
  questionBankId: string;
  courseId: string;
  moduleId: string;
  section: 'BASIC' | 'MID' | 'ADVANCED' | 'PRACTICAL';
  questionNumber: number;
  questionText: string;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOption?: 'A' | 'B' | 'C' | 'D';
  maximumMarks: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  _id: string;
  actorId: string;
  actorType: 'ADMIN' | 'SYSTEM';
  action: string;
  entityType: string;
  entityId?: string;
  previousValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  reason?: string;
  timestamp: string;
}

export interface AppSettings {
  key: string;
  instituteName: string;
  instituteAddress?: string;
  institutePhone?: string;
  defaultRegistrationFee: number;
  exam: {
    durationMinutes: number;
    passingMarks: number;
    questionDistribution: { basic: number; mid: number; advanced: number; practical: number };
    marksPerObjectiveQuestion: number;
    practicalMaxMarks: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
  page?: number;
  limit?: number;
  errors?: string[];
}

export interface DashboardSummary {
  totalStudents: number;
  currentStudents: number;
  completedStudents: number;
  cancelledStudents: number;
  totalFaculty: number;
  totalCourses: number;
  activeBatches: number;
  studentsWithPendingExams: number;
  passedStudents: number;
  failedStudents: number;
}
