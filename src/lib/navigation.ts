import { atom } from 'nanostores';

export type Screen = 'welcome' | 'terms' | 'stage' | 'grade' | 'reviewType' | 'subject' | 'admin' | 'materials' | 'subjects-management' | 'schedule' | 'videos' | 'subject-videos' | 'electronic' | 'subject-tests' | 'subject-materials' | 'electronic-tests' | 'test-builder' | 'my-tests' | 'add-question' | 'statistics' | 'question-review' | 'live-stream' | 'live-stream-settings' | 'test-data' | 'student-management' | 'saved-videos';
export type Stage = 'middle' | 'high' | null;
export type ContentType = 'all' | 'schedule' | 'solved' | 'unsolved' | 'videos' | 'electronic';

export const currentScreen = atom<Screen>('welcome');
export const selectedStage = atom<Stage>(null);
export const selectedGrade = atom<number | null>(null);
export const selectedContentType = atom<ContentType | null>(null);
export const selectedReviewType = atom<'solved' | 'unsolved' | 'all' | null>(null); // Keep for backward compatibility
export const termsAccepted = atom<boolean>(false);
export const currentTestId = atom<number | null>(null);
export const editingQuestionId = atom<number | null>(null);
export const selectedSubjectName = atom<string | null>(null);
export const previousScreen = atom<Screen | null>(null); // لتتبع الشاشة السابقة

// حفظ حالة شاشة مراجعة الأسئلة
export const questionReviewStage = atom<'middle' | 'high' | null>(null);
export const questionReviewGrade = atom<number | null>(null);
export const questionReviewSubject = atom<string | null>(null);
export const questionReviewTestId = atom<number | null>(null);
// Initialize isActivated from localStorage
const getInitialActivatedState = (): boolean => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('app_activated') === 'true';
    }
    return false;
};

export const isActivated = atom<boolean>(getInitialActivatedState());

export function navigateTo(screen: Screen) {
    const current = currentScreen.get();
    // حفظ الشاشة الحالية كشاشة سابقة قبل الانتقال
    if (current && current !== screen) {
        previousScreen.set(current);
    }
    currentScreen.set(screen);
}

export function setStage(stage: 'middle' | 'high') {
    selectedStage.set(stage);
    navigateTo('grade');
}

export function setGrade(grade: number) {
    selectedGrade.set(grade);
    navigateTo('reviewType');
}

export function setReviewType(type: 'solved' | 'unsolved' | 'all') {
    selectedReviewType.set(type);
    selectedContentType.set(type);
    navigateTo('subject');
}

export function setContentType(type: ContentType) {
    selectedContentType.set(type);
    if (type === 'schedule') {
        navigateTo('schedule');
    } else if (type === 'videos') {
        navigateTo('videos');
    } else if (type === 'electronic') {
        navigateTo('electronic');
    } else if (type === 'solved' || type === 'unsolved' || type === 'all') {
        selectedReviewType.set(type);
        navigateTo('subject');
    }
}

export function navigateToAdmin() {
    currentScreen.set('admin');
}

export function setActivated(activated: boolean) {
    isActivated.set(activated);
    if (typeof window !== 'undefined') {
        if (activated) {
            localStorage.setItem('app_activated', 'true');
        } else {
            localStorage.removeItem('app_activated');
        }
    }
}

export function resetNavigation() {
    currentScreen.set('welcome');
    selectedStage.set(null);
    selectedGrade.set(null);
    selectedContentType.set(null);
    selectedReviewType.set(null);
    termsAccepted.set(false);
    currentTestId.set(null);
    editingQuestionId.set(null);
    setActivated(false);
}

export function navigateBack() {
    const screen = currentScreen.get();

    switch (screen) {
        case 'terms':
            navigateTo('welcome');
            break;
        case 'stage':
            navigateTo('terms');
            break;
        case 'grade':
            navigateTo('stage');
            break;
        case 'reviewType':
            navigateTo('grade');
            break;
        case 'subject':
        case 'schedule':
        case 'videos':
        case 'subject-videos':
        case 'electronic':
        case 'subject-tests':
        case 'subject-materials':
            navigateTo('reviewType');
            break;
        case 'admin':
            navigateTo('welcome');
            break;
        case 'materials':
        case 'subjects-management':
        case 'student-management':
            // الرجوع للصفحة السابقة حسب السياق
            // يمكن أن يكون من admin أو من subject
            navigateTo('admin');
            break;
        case 'electronic-tests':
            navigateTo('admin');
            break;
        case 'my-tests':
            navigateTo('admin');
            break;
        case 'add-question':
            // العودة إلى الشاشة السابقة إذا كانت موجودة، وإلا إلى test-builder
            const prevScreen = previousScreen.get();
            if (prevScreen === 'question-review') {
                navigateTo('question-review');
            } else {
                navigateTo('test-builder');
            }
            break;
        case 'test-builder':
            navigateTo('admin');
            break;
        case 'question-review':
            navigateTo('admin');
            break;
        case 'live-stream':
            navigateTo('reviewType');
            break;
        case 'live-stream-settings':
            navigateTo('admin');
            break;
        case 'saved-videos':
            navigateTo('reviewType');
            break;
        default:
            // welcome screen - no back navigation
            break;
    }
}

export function canGoBack(): boolean {
    const screen = currentScreen.get();
    return screen !== 'welcome';
}

export function navigateToMaterials() {
    currentScreen.set('materials');
}

export function navigateToSubjectsManagement() {
    currentScreen.set('subjects-management');
}