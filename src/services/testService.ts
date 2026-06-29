import { supabase } from '@/lib/supabase';
import type { ElectronicTest, TestQuestion, TestAnswer, QuestionType } from '@/types/database.types';
import { nanoid } from 'nanoid';

/**
 * Get all electronic tests (for admin)
 */
export async function getAllElectronicTests(): Promise<ElectronicTest[]> {
    try {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('electronic_tests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching all electronic tests:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching all electronic tests:', error);
        return [];
    }
}

/**
 * Get all electronic tests by grade
 */
export async function getElectronicTestsByGrade(grade: number): Promise<ElectronicTest[]> {
    try {
        if (!supabase) {
            return [];
        }

        const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';

        const { data, error } = await supabase
            .from('electronic_tests')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching electronic tests:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching electronic tests:', error);
        return [];
    }
}

/**
 * Get all electronic tests by grade (for admin - includes inactive tests)
 */
export async function getElectronicTestsByGradeForAdmin(grade: number): Promise<ElectronicTest[]> {
    try {
        if (!supabase) {
            return [];
        }

        const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';

        const { data, error } = await supabase
            .from('electronic_tests')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching electronic tests for admin:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching electronic tests for admin:', error);
        return [];
    }
}

/**
 * Get test by share token
 */
export async function getTestByShareToken(token: string): Promise<ElectronicTest | null> {
    try {
        if (!supabase) {
            return null;
        }

        const { data, error } = await supabase
            .from('electronic_tests')
            .select('*')
            .eq('share_token', token)
            .eq('is_active', true)
            .single();

        if (error || !data) {
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error fetching test by token:', error);
        return null;
    }
}

/**
 * Get test with questions
 */
export async function getTestWithQuestions(testId: number): Promise<{ test: ElectronicTest; questions: TestQuestion[] } | null> {
    try {
        if (!supabase) {
            return null;
        }

        // Get test
        const { data: test, error: testError } = await supabase
            .from('electronic_tests')
            .select('*')
            .eq('id', testId)
            .single();

        if (testError || !test) {
            return null;
        }

        // Get questions
        const { data: questions, error: questionsError } = await supabase
            .from('test_questions')
            .select('*')
            .eq('test_id', testId)
            .order('question_order', { ascending: true });

        if (questionsError) {
            console.error('Error fetching questions:', questionsError);
            return { test, questions: [] };
        }

        return { test, questions: questions || [] };
    } catch (error) {
        console.error('Error fetching test with questions:', error);
        return null;
    }
}

/**
 * Create new electronic test
 */
export async function createElectronicTest(
    stage: 'middle' | 'high',
    grade: number,
    subjectName: string,
    testTitle: string,
    testDescription?: string
): Promise<{ success: boolean; testId?: number; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        // Generate unique share token
        const shareToken = 'test_' + nanoid(16);

        const { data, error } = await supabase
            .from('electronic_tests')
            .insert([
                {
                    stage,
                    grade,
                    subject_name: subjectName,
                    test_title: testTitle,
                    test_description: testDescription,
                    share_token: shareToken,
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating test:', error);
            return { success: false, error: error.message };
        }

        return { success: true, testId: data.id };
    } catch (error) {
        console.error('Error creating test:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في إنشاء الاختبار',
        };
    }
}

/**
 * Update electronic test
 */
export async function updateElectronicTest(
    testId: number,
    updates: Partial<Omit<ElectronicTest, 'id' | 'created_at' | 'share_token'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        const { error } = await supabase
            .from('electronic_tests')
            .update(updates)
            .eq('id', testId);

        if (error) {
            console.error('Error updating test:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating test:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في تحديث الاختبار',
        };
    }
}

/**
 * Delete electronic test
 */
export async function deleteElectronicTest(testId: number): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        const { error } = await supabase
            .from('electronic_tests')
            .delete()
            .eq('id', testId);

        if (error) {
            console.error('Error deleting test:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting test:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في حذف الاختبار',
        };
    }
}

/**
 * Add multiple questions to test at once
 */
export async function addMultipleQuestionsToTest(
    testId: number,
    questions: Array<{
        question_text: string;
        question_type: QuestionType;
        points?: number;
        options?: string[];
        correct_answer?: string;
    }>
): Promise<{ success: boolean; addedCount?: number; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        // Get current max order
        const { data: existingQuestions } = await supabase
            .from('test_questions')
            .select('question_order')
            .eq('test_id', testId)
            .order('question_order', { ascending: false })
            .limit(1);

        let currentOrder = existingQuestions && existingQuestions.length > 0
            ? existingQuestions[0].question_order + 1
            : 0;

        // Prepare questions data
        const questionsData = questions.map((q, index) => {
            const questionData: any = {
                test_id: testId,
                question_text: q.question_text,
                question_type: q.question_type,
                question_order: currentOrder + index,
                points: q.points || 1,
            };

            if (q.options && q.options.length > 0) {
                questionData.options = q.options;
            }

            if (q.correct_answer !== undefined) {
                questionData.correct_answer = q.correct_answer;
            }

            return questionData;
        });

        const { error } = await supabase
            .from('test_questions')
            .insert(questionsData);

        if (error) {
            console.error('Error adding multiple questions:', error);
            return { success: false, error: error.message };
        }

        return { success: true, addedCount: questions.length };
    } catch (error) {
        console.error('Error adding multiple questions:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في إضافة الأسئلة',
        };
    }
}

/**
 * Add question to test
 */
export async function addQuestionToTest(
    testId: number,
    questionText: string,
    questionType: QuestionType,
    points: number = 1,
    options?: string[] | any, // Allow both array and object for vocabulary
    correctAnswer?: string,
    questionOrder?: number,
    questionImage?: string // رابط الصورة التوضيحية للسؤال (اختياري)
): Promise<{ success: boolean; questionId?: number; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        // Get current max order if not provided
        let order = questionOrder;
        if (order === undefined) {
            const { data: existingQuestions } = await supabase
                .from('test_questions')
                .select('question_order')
                .eq('test_id', testId)
                .order('question_order', { ascending: false })
                .limit(1);

            order = existingQuestions && existingQuestions.length > 0
                ? existingQuestions[0].question_order + 1
                : 0;
        }

        const questionData: any = {
            test_id: testId,
            question_text: questionText,
            question_type: questionType,
            question_order: order,
            points: points,
        };

        // Handle options - can be array (multiple_choice) or object (vocabulary)
        if (options !== undefined && options !== null) {
            if (Array.isArray(options)) {
                if (options.length > 0) {
                    questionData.options = options;
                }
            } else if (typeof options === 'object') {
                // For vocabulary type, save as object with words array
                questionData.options = options;
            }
        }
        
        console.log('Question data to insert:', {
            questionType,
            options: questionData.options,
            optionsType: typeof questionData.options,
            optionsIsArray: Array.isArray(questionData.options)
        });

        if (correctAnswer !== undefined) {
            questionData.correct_answer = correctAnswer;
        }
        
        // Add question_image if provided
        if (questionImage) {
            questionData.question_image = questionImage;
        }

        const { data, error } = await supabase
            .from('test_questions')
            .insert([questionData])
            .select()
            .single();

        if (error) {
            console.error('Error adding question:', error);
            return { success: false, error: error.message };
        }

        return { success: true, questionId: data.id };
    } catch (error) {
        console.error('Error adding question:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في إضافة السؤال',
        };
    }
}

/**
 * Update question
 */
export async function updateQuestion(
    questionId: number,
    updates: Partial<Omit<TestQuestion, 'id' | 'test_id' | 'created_at'>>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        const { error } = await supabase
            .from('test_questions')
            .update(updates)
            .eq('id', questionId);

        if (error) {
            console.error('Error updating question:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating question:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في تحديث السؤال',
        };
    }
}

/**
 * Delete question
 */
/**
 * Delete multiple questions at once
 */
export async function deleteMultipleQuestions(questionIds: number[]): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        if (questionIds.length === 0) {
            return { success: false, error: 'لم يتم تحديد أي أسئلة' };
        }

        const { error } = await supabase
            .from('test_questions')
            .delete()
            .in('id', questionIds);

        if (error) {
            console.error('Error deleting multiple questions:', error);
            return { success: false, error: error.message };
        }

        return { success: true, deletedCount: questionIds.length };
    } catch (error) {
        console.error('Error deleting multiple questions:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في حذف الأسئلة',
        };
    }
}

export async function deleteQuestion(questionId: number): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        const { error } = await supabase
            .from('test_questions')
            .delete()
            .eq('id', questionId);

        if (error) {
            console.error('Error deleting question:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting question:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في حذف السؤال',
        };
    }
}

/**
 * Submit test answers
 */
export async function submitTestAnswers(
    testId: number,
    answers: Array<{ question_id: number; answer_text?: string; student_name?: string }>,
    sessionToken: string
): Promise<{ success: boolean; error?: string; result?: { totalPoints: number; earnedPoints: number; percentage: number } }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        // Rate Limiting: Check if answers were already submitted for this session
        const { data: existingAnswers } = await supabase
            .from('test_answers')
            .select('id, created_at')
            .eq('test_id', testId)
            .eq('session_token', sessionToken)
            .limit(1);

        if (existingAnswers && existingAnswers.length > 0) {
            return { 
                success: false, 
                error: 'لقد قمت بإرسال الإجابات مسبقاً. لا يمكن إعادة الإرسال.' 
            };
        }

        // Get questions to check answers
        const { data: questions } = await supabase
            .from('test_questions')
            .select('*')
            .eq('test_id', testId);

        if (!questions) {
            return { success: false, error: 'لم يتم العثور على الأسئلة' };
        }

        let totalPoints = 0;
        let earnedPoints = 0;

        // Calculate total points from ALL questions in the test, not just answered ones
        questions.forEach((question) => {
            // Skip essay questions from total points calculation
            if (question.question_type !== 'essay') {
                totalPoints += question.points || 1;
            }
        });

        // Prepare answers for insertion
        const answersToInsert = answers.map((answer) => {
            const question = questions.find((q) => q.id === answer.question_id);
            if (!question) return null;

            let isCorrect: boolean | null = false;
            let pointsEarned = 0;

            // Check answer based on question type
            if (question.question_type === 'true_false') {
                isCorrect = answer.answer_text === question.correct_answer;
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'multiple_choice') {
                const correctIndex = question.correct_answer;
                const answerIndex = answer.answer_text;
                isCorrect = answerIndex === correctIndex;
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'fill_in_blank') {
                // Normalize both answers: trim, lowercase, and normalize whitespace
                const normalizeAnswer = (text: string) => {
                    return text.trim()
                        .toLowerCase()
                        .replace(/\s+/g, ' ') // Replace multiple spaces/tabs/newlines with single space
                        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                        .trim();
                };
                const correctAnswer = normalizeAnswer(question.correct_answer || '');
                const studentAnswer = normalizeAnswer(answer.answer_text || '');
                isCorrect = correctAnswer === studentAnswer;
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'vocabulary') {
                // For vocabulary, compare answers (can be comma-separated for multiple images)
                const correctAnswers = (question.correct_answer || '').split(',').map((a: string) => a.trim().toLowerCase());
                const studentAnswers = (answer.answer_text || '').split(',').map((a: string) => a.trim().toLowerCase());
                
                // Check if all answers match (order matters)
                if (correctAnswers.length === studentAnswers.length) {
                    isCorrect = correctAnswers.every((correct: string, index: number) => 
                        correct === studentAnswers[index]
                    );
                } else {
                    isCorrect = false;
                }
                
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'odd_word') {
                // Compare selected index
                const correctIndex = question.correct_answer;
                const studentIndex = answer.answer_text;
                isCorrect = correctIndex === studentIndex;
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'matching') {
                // Compare comma-separated answers
                const correctAnswers = (question.correct_answer || '').split(',').map((a: string) => a.trim().toLowerCase());
                const studentAnswers = (answer.answer_text || '').split(',').map((a: string) => a.trim().toLowerCase());
                
                if (correctAnswers.length === studentAnswers.length) {
                    isCorrect = correctAnswers.every((correct: string, index: number) => 
                        correct === studentAnswers[index]
                    );
                } else {
                    isCorrect = false;
                }
                
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'fill_from_box') {
                // Compare comma-separated answers (order matters)
                const correctAnswers = (question.correct_answer || '').split(',').map((a: string) => a.trim().toLowerCase());
                const studentAnswers = (answer.answer_text || '').split(',').map((a: string) => a.trim().toLowerCase());
                
                if (correctAnswers.length === studentAnswers.length) {
                    isCorrect = correctAnswers.every((correct: string, index: number) => 
                        correct === studentAnswers[index]
                    );
                } else {
                    isCorrect = false;
                }
                
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'do_as_shown') {
                // Compare comma-separated answers (order matters)
                const correctAnswers = (question.correct_answer || '').split(',').map((a: string) => a.trim().toLowerCase());
                const studentAnswers = (answer.answer_text || '').split(',').map((a: string) => a.trim().toLowerCase());
                
                if (correctAnswers.length === studentAnswers.length) {
                    isCorrect = correctAnswers.every((correct: string, index: number) => 
                        correct === studentAnswers[index]
                    );
                } else {
                    isCorrect = false;
                }
                
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'use_a_or_an') {
                // Compare comma-separated answers (order matters)
                const correctAnswers = (question.correct_answer || '').split(',').map((a: string) => a.trim().toLowerCase());
                const studentAnswers = (answer.answer_text || '').split(',').map((a: string) => a.trim().toLowerCase());
                
                if (correctAnswers.length === studentAnswers.length) {
                    isCorrect = correctAnswers.every((correct: string, index: number) => 
                        correct === studentAnswers[index]
                    );
                } else {
                    isCorrect = false;
                }
                
                pointsEarned = isCorrect ? (question.points || 1) : 0;
            } else if (question.question_type === 'reading_comprehension') {
                // Parse options to get paragraph and sub-questions
                let optionsData: any = null;
                if (question.options) {
                    if (typeof question.options === 'string') {
                        try {
                            optionsData = JSON.parse(question.options);
                        } catch (e) {
                            console.error('Error parsing reading comprehension options:', e);
                        }
                    } else if (typeof question.options === 'object') {
                        optionsData = question.options;
                    }
                }
                
                if (!optionsData || !optionsData.questions || !Array.isArray(optionsData.questions)) {
                    isCorrect = false;
                    pointsEarned = 0;
                } else {
                    // Parse student answers (stored as JSON)
                    let studentAnswers: Record<number, string> = {};
                    try {
                        studentAnswers = JSON.parse(answer.answer_text || '{}');
                    } catch (e) {
                        isCorrect = false;
                        pointsEarned = 0;
                        return {
                            question_id: answer.question_id,
                            test_id: testId,
                            session_token: sessionToken,
                            student_name: answer.student_name,
                            answer_text: answer.answer_text,
                            is_correct: false,
                            points_earned: 0,
                        };
                    }
                    
                    // Get correct answers from question
                    const correctAnswersStr = question.correct_answer || '';
                    const correctAnswersArray = correctAnswersStr.split('|');
                    
                    // Check each sub-question
                    let correctCount = 0;
                    const totalQuestions = optionsData.questions.length;
                    
                    optionsData.questions.forEach((subQ: any, index: number) => {
                        const studentAnswer = studentAnswers[index];
                        const correctAnswer = correctAnswersArray[index];
                        
                        if (!studentAnswer || !correctAnswer) {
                            return; // Skip unanswered questions
                        }
                        
                        let subQCorrect = false;
                        
                        if (subQ.type === 'multiple_choice') {
                            subQCorrect = studentAnswer === String(correctAnswer);
                        } else if (subQ.type === 'true_false') {
                            subQCorrect = studentAnswer.toLowerCase() === String(correctAnswer).toLowerCase();
                        } else if (subQ.type === 'fill_in_blank') {
                            subQCorrect = studentAnswer.trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
                        }
                        
                        if (subQCorrect) {
                            correctCount++;
                        }
                    });
                    
                    // Calculate points: distribute points evenly across sub-questions
                    const pointsPerQuestion = (question.points || 1) / totalQuestions;
                    pointsEarned = Math.round(correctCount * pointsPerQuestion * 100) / 100;
                    isCorrect = correctCount === totalQuestions;
                }
            } else if (question.question_type === 'essay') {
                // Essay questions are not auto-graded
                isCorrect = null;
                pointsEarned = 0;
            }

            if (isCorrect === true) {
                earnedPoints += pointsEarned;
            }

            return {
                question_id: answer.question_id,
                test_id: testId,
                session_token: sessionToken,
                student_name: answer.student_name,
                answer_text: answer.answer_text,
                is_correct: isCorrect,
                points_earned: pointsEarned,
            };
        }).filter((a) => a !== null);

        // Insert answers
        const { error } = await supabase
            .from('test_answers')
            .insert(answersToInsert);

        if (error) {
            console.error('Error submitting answers:', error);
            return { success: false, error: error.message };
        }

        const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

        return {
            success: true,
            result: {
                totalPoints,
                earnedPoints,
                percentage,
            },
        };
    } catch (error) {
        console.error('Error submitting answers:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في حفظ الإجابات',
        };
    }
}

/**
 * Get test results by session token
 */
export async function getTestResults(sessionToken: string, testId: number): Promise<TestAnswer[]> {
    try {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('test_answers')
            .select('*')
            .eq('session_token', sessionToken)
            .eq('test_id', testId)
            .order('answered_at', { ascending: true });

        if (error) {
            console.error('Error fetching results:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching results:', error);
        return [];
    }
}

/**
 * Generate share link
 */
export function generateShareLink(shareToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/#test/${shareToken}`;
}

