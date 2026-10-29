export interface ReviewType {
    id: number;
    name: string;
    is_solved: boolean;
}

export interface Subject {
    id: number;
    name_ar: string;
    icon_name?: string;
    grade_id: number;
    review_type_id: number;
    pdf_url: string;
}

export interface SubjectWithGrades {
    id: number;
    name_ar: string;
    stage: 'middle' | 'high';
    grades: number[];
    created_at?: string;
    updated_at?: string;
}

export type ContentType = 'schedule' | 'solved' | 'unsolved' | 'videos' | 'electronic';

export interface UploadedMaterial {
    /** Stable identity for files read from the Olympiad platform. */
    source_id?: string;
    id?: number;
    stage: 'middle' | 'high';
    grade: number;
    subject_name: string;
    content_type: ContentType;
    review_type?: 'solved' | 'unsolved'; // Optional for backward compatibility
    file_name: string;
    file_url: string;
    file_size: number;
    uploaded_at?: string;
    // For videos
    video_title?: string;
    video_description?: string;
    // For electronic reviews
    quiz_title?: string;
    quiz_description?: string;
    quiz_url?: string;
    // Teacher contact
    teacher_whatsapp?: string;
    /** ترتيب العرض: 1 = الأول، 2 = الثاني … 0 = غير محدد (يظهر في آخر القائمة) */
    display_order?: number;
}

export interface UploadResponse {
    success: boolean;
    message: string;
    fileUrl?: string;
    error?: string;
}

export type QuestionType = 'true_false' | 'multiple_choice' | 'essay' | 'fill_in_blank' | 'vocabulary' | 'odd_word' | 'matching' | 'fill_from_box' | 'do_as_shown' | 'use_a_or_an' | 'reading_comprehension';

export interface ElectronicTest {
    id: number;
    stage: 'middle' | 'high';
    grade: number;
    subject_name: string;
    test_title: string;
    test_description?: string;
    share_token: string;
    created_at?: string;
    updated_at?: string;
    is_active?: boolean;
    teacher_whatsapp?: string;
}

export interface TestQuestion {
    id: number;
    test_id: number;
    question_text: string;
    question_type: QuestionType;
    question_order: number;
    points: number;
    options?: {
        options: string[];
        correct_answer?: number;
    };
    correct_answer?: string;
    question_image?: string; // رابط الصورة التوضيحية للسؤال (اختياري)
    created_at?: string;
    updated_at?: string;
}

export interface TestAnswer {
    id: number;
    question_id: number;
    test_id: number;
    session_token: string;
    student_name?: string;
    answer_text?: string;
    is_correct?: boolean;
    points_earned: number;
    answered_at?: string;
}

export interface Student {
    id: number;
    name: string;
    national_id: string;
    grade: string;
    seat_number: string;
    committee_number: string;
    headquarters: string; // المقر
    created_at?: string;
}
