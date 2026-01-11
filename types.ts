
export enum Gender {
  Male = 'Male',
  Female = 'Female',
}

export interface User {
  id: string;
  fullName: string;
  role: 'teacher' | 'student';
}

export interface Teacher extends User {
  role: 'teacher';
  gender: Gender;
  email: string;
  passwordHash: string; // In a real app, never store plaintext passwords
}

export interface Student extends User {
  role: 'student';
  classId: string;
  teacherId: string;
  groupId?: string;
}

export interface NawaClass {
  id: string;
  name: string;
  teacherId: string;
}

export enum QuizCategory {
  Classwork = 'Classwork',
  Homework = 'Homework',
  TryWork = 'Try Work',
  GroupWork = 'Group Work',
  TopicSpecific = 'Topic Specific Questions',
  General = 'General Questions',
  ProjectWork = 'Project Work',
}

export enum QuestionType {
  MultipleChoice = 'Multiple Choice',
  Essay = 'Essay',
  TrueFalse = 'True/False',
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  totalMarks?: number;
  source?: 'ai' | 'manual';
}

export interface QuestionBankFolder {
  id: string;
  name: string;
  questions: Question[];
}

export interface Quiz {
  id: string;
  classId: string;
  title: string;
  topic: string;
  category: QuizCategory;
  questions: Question[];
  status: 'draft' | 'scheduled' | 'active';
  scheduledFor?: number;
  feedbackTiming: 'immediate' | 'endOfQuiz';
  isExamMode: boolean;
  reshuffleQuestions: boolean;
  reshuffleAnswers: boolean;
  forceSubmission?: boolean;
  disablePrevious?: boolean;
  dueDate?: number;
  allowMultipleSubmissions: boolean;
  maxSubmissions?: number; // 0 for unlimited
  timer?: {
    isEnabled: boolean;
    mode: 'perQuestion' | 'entireQuiz';
    duration: number; // in seconds
  };
}

export interface Submission {
  id: string;
  quizId: string;
  studentId: string;
  answers: { [questionId: string]: string };
  autoGradeScore: number;
  essayQuestionsCount: number;
  essayScores?: { [questionId: string]: number };
  totalMarks?: number;
  feedback?: string;
  audioFeedbackUrl?: string;
  questionFeedback?: { [questionId: string]: string };
  isMarked: boolean;
  submittedAt: number;
}

export interface EnquiryMessage {
  id: string;
  authorId: string;
  authorName: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  timestamp: number;
}

export interface Enquiry {
  id:string;
  studentId: string;
  classId: string;
  studentName: string;
  messages: EnquiryMessage[];
  isResolved: boolean;
}

export enum LessonType {
  Live = 'Live Lesson',
  Prerecorded = 'Prerecorded Lesson',
}

export interface Recording {
  id: string;
  lessonId: string;
  recordedById: string;
  recordedByName: string;
  url: string; // Data URL for the recording
  timestamp: number;
  sharedWithStudentIds?: string[];
}

export interface BreakoutGroup {
  id: string;
  name: string;
  studentIds: string[];
  leaderIds: string[];
}

export interface BreakoutSession {
  isActive: boolean;
  endTime?: number; // timestamp when it should end
  groups: BreakoutGroup[];
}

export interface Lesson {
  id: string;
  classId: string;
  type: LessonType;
  title: string;
  code: string;
  requireAccessCode?: boolean;
  url?: string; // For prerecorded video
  scheduledTime?: number; // For live lessons
  endTime?: number; // To mark when a lesson has officially ended

  // Student permissions set during creation
  initialStudentMicOn?: boolean;
  initialStudentVideoOn?: boolean;
  allowStudentControlMic?: boolean;
  allowStudentControlVideo?: boolean;
  allowStudentRecording?: boolean;
  allowStudentScreenSharing?: boolean;
  
  // Teacher override controls during live session
  lockStudentAudio?: boolean; // Teacher can lock all students' audio
  lockStudentVideo?: boolean; // Teacher can lock all students' video
  individuallyLockedStudents?: { [studentId:string]: { audio?: boolean; video?: boolean } };
  
  screenSharerId?: string;
  recordings?: Recording[];
  timer?: {
    duration: number; // total duration in seconds
    endTime?: number; // timestamp when it should end
    remainingOnPause?: number; // seconds remaining when paused
  };
  breakoutSession?: BreakoutSession;
}

export enum NoteType {
  Text = 'Text',
  Images = 'Image(s)',
  PDF = 'PDF',
  Word = 'Word',
}

export interface Note {
  id: string;
  classId: string;
  title: string;
  type: NoteType;
  content: string | string[]; // URL for Image/PDF, text content for Text. string[] for multiple images.
  code: string;
  requireAccessCode?: boolean;
}

export interface Group {
  id: string;
  name: string;
  classId: string;
}

export enum AttendanceStatus {
  Present = 'Present',
  Absent = 'Absent',
  Late = 'Late',
  Unmarked = 'Unmarked',
}

export interface AttendanceRecord {
  lessonId: string;
  studentId: string;
  status: AttendanceStatus;
}

export interface Notification {
  id: string;
  userId: string; // ID of the user who should receive the notification
  message: string;
  timestamp: number;
  isRead: boolean;
}

export interface GradeRange {
  id: string;
  min: number;
  max: number;
  grade: string;
  remark: string;
}

export interface ReportData {
  studentId: string;
  studentName: string;
  totalScore: number;
  totalPossibleScore: number;
  percentage: number;
  position?: string;
  grade?: string;
  remark?: string;
}
