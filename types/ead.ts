export type EadEnrollmentStatus = 'ativa' | 'expirada' | 'suspensa' | 'cancelada';
export type EadContentType = 'video' | 'texto' | 'pdf' | 'quiz' | 'link_externo';
export type ReviewStatus = 'pendente' | 'aprovada' | 'rejeitada';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  custom_domain: string | null;
  is_active: boolean;
  plan: string;
  created_at: string;
}

export interface TenantSettings {
  tenant_id: string;
  logo_url: string | null;
  primary_color: string;
  email_from_name: string | null;
  email_from_domain: string | null;
  bunny_library_id: string | null;
  bunny_token_key: string | null;
  bunny_cdn_hostname: string | null;
  mp_access_token: string | null;
  mp_public_key: string | null;
  community_link: string | null;
}

export interface EadCourse {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  subtitle: string | null;
  description_short: string | null;
  description_full: string | null;
  thumbnail_url: string | null;
  cover_url: string | null;
  trailer_video_id: string | null;
  instructor_name: string | null;
  instructor_bio: string | null;
  instructor_photo_url: string | null;
  price: number;
  price_promotional: number | null;
  access_days: number;
  is_active: boolean;
  is_featured: boolean;
  is_free: boolean;
  level: 'iniciante' | 'intermediario' | 'avancado' | null;
  language: string;
  total_lessons: number;
  total_duration_s: number;
  certificate_enabled: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EadModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  position: number;
  is_free_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface EadLesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  slug: string;
  content_type: EadContentType;
  bunny_video_id: string | null;
  duration_s: number | null;
  content_body: string | null;
  pdf_url: string | null;
  external_url: string | null;
  subtitle_url: string | null;
  description: string | null;
  is_free_preview: boolean;
  publish_at: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface EadLessonAttachment {
  id: string;
  lesson_id: string;
  label: string;
  url: string;
  type: 'file' | 'link';
  position: number;
  created_at: string;
}

export interface EadEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  order_id: string | null;
  status: EadEnrollmentStatus;
  enrolled_at: string;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
}

export interface EadLessonProgress {
  id: string;
  enrollment_id: string;
  lesson_id: string;
  user_id: string;
  completed: boolean;
  last_position_s: number;
  watch_time_s: number;
  completed_at: string | null;
  updated_at: string;
}

export interface EadCertificate {
  id: string;
  enrollment_id: string;
  user_id: string;
  course_id: string;
  certificate_code: string;
  issued_at: string;
  student_name: string;
  course_title: string;
}

export interface EadReview {
  id: string;
  course_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  status: ReviewStatus;
  created_at: string;
}

export interface EadQaQuestion {
  id: string;
  lesson_id: string;
  user_id: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface EadQaAnswer {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  is_instructor: boolean;
  created_at: string;
  updated_at: string;
}

export interface EadQuiz {
  id: string;
  module_id: string;
  title: string;
  passing_score: number;
  blocks_next: boolean;
  created_at: string;
}

export interface EadQuizQuestion {
  id: string;
  quiz_id: string;
  body: string;
  options: Array<{ text: string; correct: boolean }>;
  position: number;
  created_at: string;
}

export interface EadQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: Record<string, number>;
  score: number;
  passed: boolean;
  attempted_at: string;
}

export interface EadCourseAnnouncement {
  id: string;
  course_id: string;
  title: string;
  body: string;
  sent_at: string;
  sent_by: string | null;
}

// View types — compostos para uso nas páginas

export interface EadLessonWithProgress extends EadLesson {
  completed: boolean;
  last_position_s: number;
}

export interface EadModuleWithLessons extends EadModule {
  lessons: EadLessonWithProgress[];
}

export interface EadCourseWithEnrollment extends EadCourse {
  enrollment: EadEnrollment | null;
  progress_percent: number;
}
