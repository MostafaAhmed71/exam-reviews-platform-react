import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { BackButton } from '../components/BackButton';
import { navigateTo } from '../lib/navigation';
import { getTestByShareToken, getTestWithQuestions, submitTestAnswers } from '../services/testService';
import { trackVisitor } from '../services/trackingService';
import type { ElectronicTest, TestQuestion } from '../types/database.types';
import DOMPurify from 'dompurify';
import './TakeTestScreen.css';

export function TakeTestScreen() {
    // Get token from hash: #test/{token}
    const getTokenFromHash = () => {
        const hash = window.location.hash;
        if (hash.startsWith('#test/')) {
            return hash.substring(6); // Remove '#test/'
        }
        return null;
    };

    const [token, setToken] = useState<string | null>(getTokenFromHash());
    const [test, setTest] = useState<ElectronicTest | null>(null);
    const [questions, setQuestions] = useState<TestQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<{ totalPoints: number; earnedPoints: number; percentage: number } | null>(null);
    // Generate secure session token using crypto API
    const [sessionToken] = useState(() => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return 'session_' + Array.from(array, byte => byte.toString(36)).join('').substring(0, 32);
    });
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [testResults, setTestResults] = useState<Record<number, { isCorrect: boolean | null; correctAnswer?: string }>>({});
    const [draggedVocabularyWord, setDraggedVocabularyWord] = useState<string | null>(null);
    const [reviewingSingleQuestion, setReviewingSingleQuestion] = useState(false);

    useEffect(() => {
        // Track visitor when entering test
        if (token) {
            trackVisitor('test');
        }
    }, [token]);

    useEffect(() => {
        // Listen for hash changes
        const handleHashChange = () => {
            const newToken = getTokenFromHash();
            setToken(newToken);
            if (newToken) {
                trackVisitor('test');
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        loadTest();

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [token]);

    // Render MathJax when questions change
    useEffect(() => {
        if (window.MathJax && questions.length > 0) {
            window.MathJax.typesetPromise?.();
        }
    }, [questions, currentQuestionIndex, answers]);

    const loadTest = async () => {
        if (!token) return;

        setLoading(true);
        const testData = await getTestByShareToken(token);
        
        if (testData) {
            setTest(testData);
            const testWithQuestions = await getTestWithQuestions(testData.id!);
            if (testWithQuestions) {
                // Only log in development mode
                if (import.meta.env.DEV) {
                    console.log('Loaded questions:', testWithQuestions.questions);
                    testWithQuestions.questions.forEach((q, idx) => {
                        if (q.question_image) {
                            console.log(`Question ${idx + 1} has image:`, q.question_image);
                        }
                    });
                }
                setQuestions(testWithQuestions.questions);
            }
        }
        setLoading(false);
    };

    const handleAnswerChange = (questionId: number, answer: string) => {
        // Limit answer size to prevent DoS attacks (max 5000 characters)
        const MAX_ANSWER_LENGTH = 5000;
        if (answer.length > MAX_ANSWER_LENGTH) {
            // Silently truncate or show warning (truncating for better UX)
            answer = answer.substring(0, MAX_ANSWER_LENGTH);
        }
        setAnswers({ ...answers, [questionId]: answer });
    };

    const handleSubmit = async () => {
        if (!test || !test.id) return;

        // Check if all questions are answered
        const unansweredQuestions = questions.filter(q => !answers[q.id!]);
        if (unansweredQuestions.length > 0) {
            const confirmSubmit = window.confirm(
                `لديك ${unansweredQuestions.length} أسئلة لم تجب عليها. هل تريد المتابعة؟`
            );
            if (!confirmSubmit) return;
        }

        setSubmitting(true);

        const answersArray = Object.entries(answers).map(([questionId, answerText]) => ({
            question_id: parseInt(questionId),
            answer_text: answerText,
        }));

        const result = await submitTestAnswers(test.id, answersArray, sessionToken);
        setSubmitting(false);

        if (result.success && result.result) {
            setSubmitted(true);
            setResult(result.result);
            
            // Store results for each question to show correct answers
            const resultsMap: Record<number, { isCorrect: boolean | null; correctAnswer?: string }> = {};
            questions.forEach((q) => {
                const answer = answers[q.id!];
                if (!answer) {
                    resultsMap[q.id!] = { isCorrect: null, correctAnswer: q.correct_answer };
                    return;
                }
                
                let isCorrect: boolean | null = false;
                let correctAnswer = q.correct_answer || '';
                
                if (q.question_type === 'true_false') {
                    isCorrect = answer === correctAnswer;
                } else if (q.question_type === 'multiple_choice') {
                    isCorrect = answer === correctAnswer;
                } else if (q.question_type === 'fill_in_blank') {
                    // Normalize both answers: trim, lowercase, and normalize whitespace
                    const normalizeAnswer = (text: string) => {
                        return text.trim()
                            .toLowerCase()
                            .replace(/\s+/g, ' ') // Replace multiple spaces/tabs/newlines with single space
                            .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                            .trim();
                    };
                    const normalizedAnswer = normalizeAnswer(answer);
                    const normalizedCorrect = normalizeAnswer(correctAnswer);
                    isCorrect = normalizedAnswer === normalizedCorrect;
                } else if (q.question_type === 'vocabulary') {
                    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase());
                    const studentAnswers = answer.split(',').map(a => a.trim().toLowerCase());
                    isCorrect = correctAnswers.length === studentAnswers.length && 
                               correctAnswers.every((c, i) => c === studentAnswers[i]);
                } else if (q.question_type === 'odd_word') {
                    isCorrect = answer === correctAnswer;
                } else if (q.question_type === 'matching') {
                    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase());
                    const studentAnswers = answer.split(',').map(a => a.trim().toLowerCase());
                    isCorrect = correctAnswers.length === studentAnswers.length && 
                               correctAnswers.every((c, i) => c === studentAnswers[i]);
                } else if (q.question_type === 'fill_from_box') {
                    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase());
                    const studentAnswers = answer.split(',').map(a => a.trim().toLowerCase());
                    isCorrect = correctAnswers.length === studentAnswers.length && 
                               correctAnswers.every((c, i) => c === studentAnswers[i]);
                } else if (q.question_type === 'do_as_shown') {
                    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase());
                    const studentAnswers = answer.split(',').map(a => a.trim().toLowerCase());
                    isCorrect = correctAnswers.length === studentAnswers.length && 
                               correctAnswers.every((c, i) => c === studentAnswers[i]);
                } else if (q.question_type === 'use_a_or_an') {
                    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase());
                    const studentAnswers = answer.split(',').map(a => a.trim().toLowerCase());
                    isCorrect = correctAnswers.length === studentAnswers.length && 
                               correctAnswers.every((c, i) => c === studentAnswers[i]);
                } else if (q.question_type === 'reading_comprehension') {
                    // Parse options to get sub-questions
                    let optionsData: any = null;
                    if (q.options) {
                        if (typeof q.options === 'string') {
                            try {
                                optionsData = JSON.parse(q.options);
                            } catch (e) {
                                console.error('Error parsing options:', e);
                            }
                        } else if (typeof q.options === 'object') {
                            optionsData = q.options;
                        }
                    }
                    
                    if (!optionsData || !optionsData.questions || !Array.isArray(optionsData.questions)) {
                        isCorrect = false;
                    } else {
                        // Parse student answers
                        let studentAnswers: Record<number, string> = {};
                        try {
                            studentAnswers = JSON.parse(answer || '{}');
                        } catch (e) {
                            isCorrect = false;
                        }
                        
                        // Get correct answers
                        const correctAnswersArray = correctAnswer.split('|');
                        
                        // Check if all sub-questions are answered correctly
                        let allCorrect = true;
                        
                        optionsData.questions.forEach((subQ: any, index: number) => {
                            const studentAns = studentAnswers[index];
                            const correctAns = correctAnswersArray[index];
                            
                            if (!studentAns || !correctAns) {
                                allCorrect = false;
                                return;
                            }
                            
                            let subQCorrect = false;
                            if (subQ.type === 'multiple_choice') {
                                subQCorrect = studentAns === String(correctAns);
                            } else if (subQ.type === 'true_false') {
                                subQCorrect = studentAns.toLowerCase() === String(correctAns).toLowerCase();
                            } else if (subQ.type === 'fill_in_blank') {
                                // Normalize both answers: trim, lowercase, and normalize whitespace
                                const normalizeAnswer = (text: string) => {
                                    return text.trim()
                                        .toLowerCase()
                                        .replace(/\s+/g, ' ') // Replace multiple spaces/tabs/newlines with single space
                                        .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                                        .trim();
                                };
                                const normalizedStudent = normalizeAnswer(studentAns);
                                const normalizedCorrect = normalizeAnswer(String(correctAns));
                                subQCorrect = normalizedStudent === normalizedCorrect;
                            }
                            
                            if (!subQCorrect) {
                                allCorrect = false;
                            }
                        });
                        
                        isCorrect = allCorrect;
                        // Store formatted correct answer for display
                        correctAnswer = optionsData.questions.map((subQ: any, index: number) => {
                            const correctAns = correctAnswersArray[index];
                            if (subQ.type === 'multiple_choice' && subQ.options) {
                                return `سؤال ${index + 1}: ${subQ.options[parseInt(correctAns)] || correctAns}`;
                            } else if (subQ.type === 'true_false') {
                                return `سؤال ${index + 1}: ${correctAns === 'true' ? 'صحيح' : 'خطأ'}`;
                            } else {
                                return `سؤال ${index + 1}: ${correctAns}`;
                            }
                        }).join(' | ');
                    }
                } else if (q.question_type === 'essay') {
                    isCorrect = null;
                }
                
                resultsMap[q.id!] = { isCorrect, correctAnswer };
            });
            setTestResults(resultsMap);
        }
    };


    const handleQuestionReview = async (questionIndex: number) => {
        // If user is reviewing after submission, show only the selected question
        setCurrentQuestionIndex(questionIndex);
        setSubmitted(false);
        setReviewingSingleQuestion(true); // Enable single question review mode
        
        // Note: User can now change their answer and resubmit
        // The score will be recalculated when they submit again
    };
    
    const handleBackToResults = () => {
        // Return to results screen
        setSubmitted(true);
        setReviewingSingleQuestion(false);
    };

    // Helper function to render answer feedback
    const renderAnswerFeedback = (questionId: number, studentAnswer: string) => {
        if (!submitted || !testResults[questionId]) return null;
        
        const result = testResults[questionId];
        const isCorrect = result.isCorrect;
        const correctAnswer = result.correctAnswer || '';
        
        return (
            <div className="answer-feedback" style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '0.5rem',
                background: isCorrect === true 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : isCorrect === false
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'rgba(156, 163, 175, 0.1)',
                border: `2px solid ${isCorrect === true ? '#22c55e' : isCorrect === false ? '#ef4444' : '#9ca3af'}`,
            }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                    fontWeight: 600,
                    color: isCorrect === true ? '#22c55e' : isCorrect === false ? '#ef4444' : '#9ca3af'
                }}>
                    {isCorrect === true ? '✓ صحيح' : isCorrect === false ? '✗ خطأ' : '○ بدون تقييم'}
                </div>
                {studentAnswer && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        إجابتك: <strong>{studentAnswer || '(بدون إجابة)'}</strong>
                    </div>
                )}
                {correctAnswer && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        الإجابة الصحيحة: <strong style={{ color: '#22c55e' }}>{correctAnswer}</strong>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="take-test-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1>جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!test) {
        return (
            <Layout showFooter>
                <div className="take-test-screen">
                    <BackButton />
                    <div className="error-state">
                        <h1>الاختبار غير موجود</h1>
                        <p>الرابط غير صحيح أو الاختبار تم حذفه</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (submitted && result) {
        // Calculate correct, incorrect, and unanswered questions using testResults
        const correctCount = Object.values(testResults).filter(r => r.isCorrect === true).length;
        const incorrectCount = Object.values(testResults).filter(r => r.isCorrect === false).length;
        const unansweredCount = questions.length - correctCount - incorrectCount;

        // Determine question status for review buttons
        const getQuestionStatus = (question: TestQuestion) => {
            const result = testResults[question.id!];
            if (!result || result.isCorrect === null) return 'unanswered';
            return result.isCorrect ? 'correct' : 'incorrect';
        };

        const handleShareResult = async () => {
            try {
                // Create canvas
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // Set canvas size (Instagram story size: 1080x1920)
                const width = 1080;
                const height = 1920;
                canvas.width = width;
                canvas.height = height;

                // Background gradient
                const gradient = ctx.createLinearGradient(0, 0, 0, height);
                gradient.addColorStop(0, '#193064');
                gradient.addColorStop(0.5, '#1e3a5f');
                gradient.addColorStop(1, '#193064');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);

                // Decorative circles
                ctx.fillStyle = 'rgba(96, 165, 250, 0.1)';
                ctx.beginPath();
                ctx.arc(width * 0.8, height * 0.2, 200, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(width * 0.2, height * 0.7, 150, 0, Math.PI * 2);
                ctx.fill();

                // Title
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 80px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('النتيجة', width / 2, 150);

                // Test title
                ctx.font = 'bold 50px Arial, sans-serif';
                ctx.fillStyle = '#fbbf24';
                const testTitleLines = wrapText(ctx, test.test_title, width - 200);
                testTitleLines.forEach((line, index) => {
                    ctx.fillText(line, width / 2, 280 + (index * 70));
                });

                // Result card background
                const cardY = 450;
                const cardHeight = 800;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 3;
                roundRect(ctx, 100, cardY, width - 200, cardHeight, 40);
                ctx.fill();
                ctx.stroke();

                // Score circle
                const circleX = width / 2;
                const circleY = cardY + 200;
                const circleRadius = 120;

                // Circle background
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                ctx.lineWidth = 20;
                ctx.beginPath();
                ctx.arc(circleX, circleY, circleRadius, 0, Math.PI * 2);
                ctx.stroke();

                // Circle progress
                const percentage = result.percentage / 100;
                ctx.strokeStyle = '#60a5fa';
                ctx.lineWidth = 20;
                ctx.beginPath();
                ctx.arc(circleX, circleY, circleRadius, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * percentage));
                ctx.stroke();

                // Percentage text
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 70px Arial, sans-serif';
                ctx.fillText(`${result.percentage}%`, circleX, circleY);

                // Stats
                const statsY = cardY + 450;
                ctx.font = 'bold 40px Arial, sans-serif';
                ctx.textAlign = 'right';

                // Correct
                ctx.fillStyle = '#22c55e';
                ctx.fillText('✓', width - 150, statsY);
                ctx.fillText(`الصح: ${correctCount}`, width - 200, statsY);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${correctCount}`, width - 600, statsY);

                // Incorrect
                ctx.fillStyle = '#ef4444';
                ctx.fillText('✗', width - 150, statsY + 80);
                ctx.fillText(`الخطا: ${incorrectCount}`, width - 200, statsY + 80);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${incorrectCount}`, width - 600, statsY + 80);

                // Unanswered
                ctx.fillStyle = '#9ca3af';
                ctx.fillText('○', width - 150, statsY + 160);
                ctx.fillText(`بدون اجابة: ${unansweredCount}`, width - 200, statsY + 160);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${unansweredCount}`, width - 600, statsY + 160);

                // Total questions
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 35px Arial, sans-serif';
                ctx.fillText(`عدد الاسئلة: ${questions.length}`, width - 200, statsY + 250);

                // Footer
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = '30px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('منصة المراجعات النهائية', width / 2, height - 100);
                ctx.fillText('متوسطة وثانوية نخبة الشمال الأهلية', width / 2, height - 50);

                // Convert to blob and share
                canvas.toBlob(async (blob) => {
                    if (!blob) return;

                    const file = new File([blob], `نتيجة_${test.test_title}_${result.percentage}%.png`, { type: 'image/png' });

                    if (navigator.share && navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                title: `نتيجة ${test.test_title}`,
                                text: `حصلت على ${result.percentage}% في الاختبار!`,
                                files: [file],
                            });
                        } catch (error) {
                            // Fallback to download
                            downloadImage(canvas, `نتيجة_${test.test_title}_${result.percentage}%.png`);
                        }
                    } else {
                        // Download image
                        downloadImage(canvas, `نتيجة_${test.test_title}_${result.percentage}%.png`);
                    }
                }, 'image/png');
            } catch (error) {
                console.error('Error creating image:', error);
                alert('حدث خطأ أثناء إنشاء الصورة');
            }
        };

        const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
            const words = text.split(' ');
            const lines: string[] = [];
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine + word + ' ';
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine !== '') {
                    lines.push(currentLine);
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            });
            lines.push(currentLine);
            return lines;
        };

        const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        };

        const downloadImage = (canvas: HTMLCanvasElement, filename: string) => {
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };

        return (
            <Layout showFooter>
                <div className="take-test-screen">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                // Clear the hash first to exit test screen
                                window.location.hash = '';
                                // Navigate to electronic tests screen
                                // Use setTimeout to ensure hash change is processed first
                                setTimeout(() => {
                                    navigateTo('electronic');
                                }, 10);
                            }}
                            style={{ minWidth: '120px' }}
                        >
                            ← رجوع للاختبارات
                        </Button>
                    </div>
                    <div className="test-result">
                        <h1 className="result-title">النتيجة</h1>
                        
                        <div className="result-card">
                            <div className="result-card-header">
                                <div className="result-student-info">
                                    <p className="result-student-label">نتيجة الطالب</p>
                                    <p className="result-test-title">{test.test_title}</p>
                                </div>
                            </div>

                            <div className="result-stats">
                                <div className="result-stats-left">
                                    <div className="stat-bar stat-correct">
                                        <span className="stat-number">{correctCount}</span>
                                        <div className="stat-bar-content">
                                            <span className="stat-label">الصح</span>
                                            <span className="stat-icon">✓</span>
                                        </div>
                                    </div>
                                    <div className="stat-bar stat-incorrect">
                                        <span className="stat-number">{incorrectCount}</span>
                                        <div className="stat-bar-content">
                                            <span className="stat-label">الخطا</span>
                                            <span className="stat-icon">✗</span>
                                        </div>
                                    </div>
                                    <div className="stat-bar stat-unanswered">
                                        <span className="stat-number">{unansweredCount}</span>
                                        <div className="stat-bar-content">
                                            <span className="stat-label">بدون اجابة</span>
                                            <span className="stat-icon">○</span>
                                        </div>
                                    </div>
                                    <div className="stat-total">
                                        <span className="stat-total-icon">📄</span>
                                        <span className="stat-total-label">عدد الاسئلة</span>
                                        <span className="stat-total-number">{questions.length}</span>
                                    </div>
                                </div>
                                <div className="result-stats-right">
                                    <div className="score-circle-progress">
                                        <svg className="progress-ring" width="120" height="120">
                                            <circle
                                                className="progress-ring-circle-bg"
                                                stroke="#3b82f6"
                                                strokeWidth="8"
                                                fill="transparent"
                                                r="52"
                                                cx="60"
                                                cy="60"
                                            />
                                            <circle
                                                className="progress-ring-circle"
                                                stroke="#60a5fa"
                                                strokeWidth="8"
                                                fill="transparent"
                                                r="52"
                                                cx="60"
                                                cy="60"
                                                strokeDasharray={`${2 * Math.PI * 52}`}
                                                strokeDashoffset={`${2 * Math.PI * 52 * (1 - result.percentage / 100)}`}
                                                transform="rotate(-90 60 60)"
                                            />
                                        </svg>
                                        <span className="score-percentage">{result.percentage}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="primary"
                            onClick={handleShareResult}
                            fullWidth
                            className="share-result-btn"
                        >
                            مشاركة النتيجة
                        </Button>

                        <div className="question-review-section">
                            <h2 className="review-title">مراجعة الاسئلة</h2>
                            <p className="review-instruction">
                                اختر السؤال الذي تريد مراجعته. يمكنك تغيير إجابتك وإعادة الإرسال لحساب الدرجة مرة أخرى.
                            </p>
                            <div style={{ 
                                marginBottom: '1rem', 
                                padding: '0.75rem', 
                                background: 'rgba(59, 130, 246, 0.1)', 
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                fontSize: '0.9rem',
                                color: 'var(--text-secondary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#22c55e', fontWeight: 600 }}>✓</span>
                                    <span>أخضر = صحيح</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>✗</span>
                                    <span>أحمر = خطأ</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#6b7280', fontWeight: 600 }}>○</span>
                                    <span>رمادي = بدون إجابة</span>
                                </div>
                            </div>
                            <div className="question-grid">
                                {questions.map((question, index) => {
                                    const status = getQuestionStatus(question);
                                    return (
                                        <button
                                            key={question.id}
                                            className={`question-number-btn ${status}`}
                                            onClick={() => handleQuestionReview(index)}
                                        >
                                            {index + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const handleBackFromTest = () => {
        if (window.confirm('هل أنت متأكد من الرجوع؟ سيتم فقدان التقدم الحالي في الاختبار.')) {
            // Clear hash to exit test screen
            window.location.hash = '';
            // Navigate to electronic tests screen
            navigateTo('electronic');
        }
    };

    return (
        <Layout showFooter>
            <div className="take-test-screen">
                <div className="test-header">
                    <h1 className="test-title">{test.test_title}</h1>
                    {test.test_description && (
                        <p className="test-description">{test.test_description}</p>
                    )}
                    <div className="header-buttons">
                        <Button
                            variant="secondary"
                            onClick={handleBackFromTest}
                            className="back-test-btn"
                        >
                            ← الرجوع
                        </Button>
                    </div>
                </div>

                {/* Progress Bar - hide when reviewing single question */}
                {questions.length > 0 && !reviewingSingleQuestion && (
                    <div className="progress-section">
                        <div className="progress-info">
                            <span className="progress-text">
                                سؤال {currentQuestionIndex + 1} من {questions.length}
                            </span>
                            <span className="progress-percentage">
                                {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                            </span>
                        </div>
                        <div className="progress-bar-container">
                            <div 
                                className="progress-bar-fill"
                                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Current Question */}
                {questions.length > 0 && questions[currentQuestionIndex] && (
                    <div className={`questions-container ${isTransitioning ? 'transitioning' : ''}`}>
                        <div className="question-item" key={currentQuestionIndex}>
                            <div className="question-header">
                                <span className="question-number">سؤال {currentQuestionIndex + 1}</span>
                                <span className="question-type-badge">
                                    {questions[currentQuestionIndex].question_type === 'true_false' ? 'صح/خطأ' :
                                     questions[currentQuestionIndex].question_type === 'multiple_choice' ? 'اختياري' :
                                     questions[currentQuestionIndex].question_type === 'fill_in_blank' ? 'إكمال/تصحيح' :
                                     questions[currentQuestionIndex].question_type === 'vocabulary' ? 'مفردات' :
                                     questions[currentQuestionIndex].question_type === 'odd_word' ? 'كلمة غريبة' :
                                     questions[currentQuestionIndex].question_type === 'matching' ? 'مطابقة' :
                                     questions[currentQuestionIndex].question_type === 'fill_from_box' ? 'إكمال من صندوق' :
                                    questions[currentQuestionIndex].question_type === 'do_as_shown' ? 'افعل كما هو موضح' :
                                    questions[currentQuestionIndex].question_type === 'use_a_or_an' ? 'استخدم a أو an' :
                                    questions[currentQuestionIndex].question_type === 'reading_comprehension' ? 'الرجراف (القطعة)' : 'مقالي'}
                                </span>
                                <span className="question-points">{questions[currentQuestionIndex].points} نقطة</span>
                            </div>
                            {(() => {
                                const question = questions[currentQuestionIndex];
                                const questionText = question.question_text || '';
                                const questionImage = question.question_image;
                                
                                // Debug: log question data
                                console.log('Question data:', {
                                    id: question.id,
                                    question_text: questionText,
                                    question_image: questionImage,
                                    hasImage: !!questionImage
                                });
                                
                                // Backward compatibility: check if question_text is an image URL
                                const isImageUrl = !questionImage && questionText && (questionText.startsWith('http://') || 
                                                 questionText.startsWith('https://') ||
                                                 questionText.startsWith('uploads/'));
                                
                                return (
                                    <>
                                        {/* Display question text if exists (skip for reading_comprehension - it will be shown in the special section) */}
                                        {questionText && !isImageUrl && question.question_type !== 'reading_comprehension' && (
                                            <div 
                                                className="question-text" 
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(questionText, { 
                                                    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'sub', 'sup', 'p', 'div'],
                                                    ALLOWED_ATTR: []
                                                }) }}
                                                style={{ 
                                                    fontSize: '1.1rem',
                                                    lineHeight: '1.8',
                                                    color: 'var(--text-primary)',
                                                    marginBottom: questionImage ? '1.5rem' : '0'
                                                }}
                                            />
                                        )}
                                        
                                        {/* Display question image if exists */}
                                        {questionImage && (
                                            <div className="question-image-container" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                                <img 
                                                    src={questionImage} 
                                                    alt="صورة السؤال" 
                                                    onError={(e) => {
                                                        console.error('Error loading question image:', questionImage);
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                    onLoad={() => {
                                                        console.log('Question image loaded successfully:', questionImage);
                                                    }}
                                                    style={{ 
                                                        maxWidth: '100%', 
                                                        height: 'auto', 
                                                        borderRadius: '0.5rem',
                                                        border: '2px solid rgba(255, 255, 255, 0.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                        
                                        {/* Backward compatibility: display image from question_text if it's an image URL */}
                                        {isImageUrl && (
                                            <div className="question-image-container" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                                <img 
                                                    src={questionText} 
                                                    alt="صورة السؤال" 
                                                    onError={(e) => {
                                                        console.error('Error loading image from question_text:', questionText);
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                    style={{ 
                                                        maxWidth: '100%', 
                                                        height: 'auto', 
                                                        borderRadius: '0.5rem',
                                                        border: '2px solid rgba(255, 255, 255, 0.1)',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'true_false' && (
                                <div className="answer-options">
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name={`question-${questions[currentQuestionIndex].id}`}
                                            value="true"
                                            checked={answers[questions[currentQuestionIndex].id!] === 'true'}
                                            onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id!, e.target.value)}
                                        />
                                        <span>صح</span>
                                    </label>
                                    <label className="radio-option">
                                        <input
                                            type="radio"
                                            name={`question-${questions[currentQuestionIndex].id}`}
                                            value="false"
                                            checked={answers[questions[currentQuestionIndex].id!] === 'false'}
                                            onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id!, e.target.value)}
                                        />
                                        <span>خطأ</span>
                                    </label>
                                </div>
                            )}

                            {questions[currentQuestionIndex].question_type === 'multiple_choice' && questions[currentQuestionIndex].options && (
                                <div className="answer-options">
                                    {(Array.isArray(questions[currentQuestionIndex].options) ? questions[currentQuestionIndex].options : []).map((option, optIndex) => (
                                        <label key={optIndex} className="radio-option">
                                            <input
                                                type="radio"
                                                name={`question-${questions[currentQuestionIndex].id}`}
                                                value={optIndex.toString()}
                                                checked={answers[questions[currentQuestionIndex].id!] === optIndex.toString()}
                                                onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id!, e.target.value)}
                                                disabled={submitted}
                                            />
                                            <span>{typeof option === 'string' ? option : option.text}</span>
                                        </label>
                                    ))}
                                </div>
                            )}

                            {questions[currentQuestionIndex].question_type === 'fill_in_blank' && (() => {
                                const question = questions[currentQuestionIndex];
                                const questionText = question.question_text || '';
                                
                                // Split text by parentheses and create answer field
                                const createAnswerField = (text: string) => {
                                    const regex = /\(([^)]+)\)/g;
                                    const parts: Array<{ type: 'text' | 'input'; content: string }> = [];
                                    let lastIndex = 0;
                                    let match;
                                    
                                    while ((match = regex.exec(text)) !== null) {
                                        // Add text before the match
                                        if (match.index > lastIndex) {
                                            parts.push({
                                                type: 'text',
                                                content: text.substring(lastIndex, match.index)
                                            });
                                        }
                                        // Add input field for the matched text
                                        parts.push({
                                            type: 'input',
                                            content: match[1] // Text inside parentheses
                                        });
                                        lastIndex = match.index + match[0].length;
                                    }
                                    
                                    // Add remaining text
                                    if (lastIndex < text.length) {
                                        parts.push({
                                            type: 'text',
                                            content: text.substring(lastIndex)
                                        });
                                    }
                                    
                                    // If no parentheses found, return original text
                                    if (parts.length === 0) {
                                        parts.push({ type: 'text', content: text });
                                    }
                                    
                                    return parts;
                                };
                                
                                const answerParts = createAnswerField(questionText);
                                
                                return (
                                    <>
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ 
                                                display: 'block', 
                                                marginBottom: '0.75rem', 
                                                fontSize: '0.95rem',
                                                color: 'var(--text-secondary)',
                                                fontWeight: 500
                                            }}>
                                                اكمل/صحح الجملة:
                                            </label>
                                            <div style={{
                                                padding: '1rem',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                borderRadius: '0.5rem',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                fontSize: '1.1rem',
                                                lineHeight: '1.8',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                alignItems: 'center',
                                                gap: '0.5rem'
                                            }}>
                                                {answerParts.map((part, index) => {
                                                    if (part.type === 'text') {
                                                        return (
                                                            <span 
                                                                key={index} 
                                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(part.content, { 
                                                                    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'sub', 'sup'],
                                                                    ALLOWED_ATTR: []
                                                                }) }} 
                                                            />
                                                        );
                                                    } else {
                                                        return (
                                    <input
                                                                key={index}
                                        type="text"
                                        className="fill-in-answer"
                                                                value={answers[question.id!] || ''}
                                                                onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                                                                placeholder="..."
                                        disabled={submitted}
                                                                style={{
                                                                    minWidth: '120px',
                                                                    padding: '0.5rem 0.75rem',
                                                                    fontSize: '1rem',
                                                                    borderRadius: '0.375rem',
                                                                    border: '2px solid rgba(59, 130, 246, 0.5)',
                                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                                    color: 'var(--text-primary)',
                                                                    outline: 'none',
                                                                    flex: '0 0 auto'
                                                                }}
                                                                onFocus={(e) => {
                                                                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.8)';
                                                                    e.target.style.background = 'rgba(59, 130, 246, 0.15)';
                                                                }}
                                                                onBlur={(e) => {
                                                                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                                                    e.target.style.background = 'rgba(59, 130, 246, 0.1)';
                                                                }}
                                                            />
                                                        );
                                                    }
                                                })}
                                            </div>
                                        </div>
                                        {renderAnswerFeedback(question.id!, answers[question.id!] || '')}
                                    </>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'vocabulary' && (() => {
                                const question = questions[currentQuestionIndex];
                                let wordsArray: Array<{ word: string; imageUrl: string }> = [];
                                
                                // Parse options - handle both string and object formats
                                let optionsData: any = null;
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                // Extract words array
                                if (optionsData) {
                                    if (optionsData.words && Array.isArray(optionsData.words)) {
                                        wordsArray = optionsData.words;
                                    } else if (optionsData.images && Array.isArray(optionsData.images)) {
                                        // Legacy format: convert images to words
                                        const correctAnswers = (question.correct_answer || '').split(',');
                                        wordsArray = optionsData.images.map((img: string, idx: number) => ({
                                            imageUrl: img,
                                            word: correctAnswers[idx] || ''
                                        }));
                                    }
                                }
                                
                                // Get current answers
                                const currentAnswers = (answers[question.id!] || '').split(',').filter(a => a.trim());
                                
                                // Get available words (all words minus used ones)
                                const allWords = wordsArray.map(item => item.word);
                                const usedWords = currentAnswers;
                                const availableWords = allWords.filter(word => !usedWords.includes(word));
                                
                                // Handle drag and drop
                                const handleDragStart = (word: string) => {
                                    setDraggedVocabularyWord(word);
                                };
                                
                                const handleDragOver = (e: React.DragEvent) => {
                                    e.preventDefault();
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.2)';
                                };
                                
                                const handleDragLeave = (e: React.DragEvent) => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                                };
                                
                                const handleDrop = (e: React.DragEvent, imageIndex: number) => {
                                    e.preventDefault();
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(255, 255, 255, 0.05)';
                                    
                                    if (draggedVocabularyWord) {
                                        const newAnswers = [...currentAnswers];
                                        // Ensure array has enough elements
                                        while (newAnswers.length <= imageIndex) {
                                            newAnswers.push('');
                                        }
                                        newAnswers[imageIndex] = draggedVocabularyWord;
                                        handleAnswerChange(question.id!, newAnswers.join(','));
                                        setDraggedVocabularyWord(null);
                                    }
                                };
                                
                                const handleRemoveWord = (imageIndex: number) => {
                                    const newAnswers = [...currentAnswers];
                                    newAnswers[imageIndex] = '';
                                    handleAnswerChange(question.id!, newAnswers.join(','));
                                };
                                
                                return (
                                    <div className="vocabulary-question">
                                        {wordsArray.length > 0 ? (
                                            <>
                                                {/* Available words to drag */}
                                                <div style={{ 
                                                    marginBottom: '1.5rem',
                                                    padding: '1rem',
                                                    background: 'rgba(59, 130, 246, 0.1)',
                                                    borderRadius: '0.5rem',
                                                    border: '1px solid rgba(59, 130, 246, 0.3)'
                                                }}>
                                                    <label style={{ 
                                                        display: 'block', 
                                                        marginBottom: '0.75rem', 
                                                        fontSize: '0.95rem',
                                                        color: 'var(--text-secondary)',
                                                        fontWeight: 500
                                                    }}>
                                                        اسحب الكلمة وضَعها على الصورة المناسبة:
                                                    </label>
                                                    <div style={{ 
                                                        display: 'flex', 
                                                        flexWrap: 'wrap', 
                                                        gap: '0.75rem' 
                                                    }}>
                                                        {availableWords.map((word, index) => (
                                                            <div
                                                                key={index}
                                                                draggable
                                                                onDragStart={() => handleDragStart(word)}
                                                                onDragEnd={(e) => {
                                                                    (e.target as HTMLElement).style.opacity = '1';
                                                                    setDraggedVocabularyWord(null);
                                                                }}
                                                                onDrag={(e) => {
                                                                    (e.target as HTMLElement).style.opacity = '0.5';
                                                                }}
                                                                style={{
                                                                    padding: '0.75rem 1.25rem',
                                                                    background: 'rgba(59, 130, 246, 0.2)',
                                                                    border: '2px solid rgba(59, 130, 246, 0.5)',
                                                                    borderRadius: '0.5rem',
                                                                    cursor: 'grab',
                                                                    fontSize: '1rem',
                                                                    fontWeight: 500,
                                                                    color: 'var(--text-primary)',
                                                                    userSelect: 'none',
                                                                    transition: 'all 0.2s',
                                                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                                                }}
                                                            >
                                                                {word}
                                                            </div>
                                                        ))}
                                                        {availableWords.length === 0 && (
                                                            <div style={{ 
                                                                color: 'var(--text-secondary)',
                                                                fontSize: '0.9rem',
                                                                fontStyle: 'italic'
                                                            }}>
                                                                تم استخدام جميع الكلمات
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Images with drop zones */}
                                                <div className="vocabulary-images" style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                    gap: '1.5rem'
                                                }}>
                                                    {wordsArray.map((item: any, index: number) => {
                                                        const assignedWord = currentAnswers[index] || '';
                                                        return (
                                                            <div 
                                                                key={index} 
                                                                className="vocabulary-image-item"
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    gap: '1rem',
                                                                    padding: '1rem',
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    borderRadius: '0.75rem',
                                                                    border: '2px dashed rgba(255, 255, 255, 0.2)',
                                                                    transition: 'all 0.2s',
                                                                    minHeight: '200px'
                                                                }}
                                                                onDragOver={handleDragOver}
                                                                onDragLeave={handleDragLeave}
                                                                onDrop={(e) => handleDrop(e, index)}
                                                            >
                                                        <img 
                                                            src={item.imageUrl || item} 
                                                            alt={item.word || `صورة ${index + 1}`}
                                                            onError={(e) => {
                                                                console.error('Image load error:', item.imageUrl);
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                                    style={{
                                                                        maxWidth: '100%',
                                                                        height: 'auto',
                                                                        borderRadius: '0.5rem',
                                                                        border: '2px solid rgba(255, 255, 255, 0.1)'
                                                                    }}
                                                                />
                                                                <div style={{
                                                                    width: '100%',
                                                                    minHeight: '50px',
                                                                    padding: '0.75rem',
                                                                    background: assignedWord ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                                                    border: assignedWord ? '2px solid rgba(16, 185, 129, 0.5)' : '2px dashed rgba(255, 255, 255, 0.3)',
                                                                    borderRadius: '0.5rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    position: 'relative'
                                                                }}>
                                                                    {assignedWord ? (
                                                                        <>
                                                                            <span style={{
                                                                                fontSize: '1rem',
                                                                                fontWeight: 600,
                                                                                color: 'var(--text-primary)'
                                                                            }}>
                                                                                {assignedWord}
                                                                            </span>
                                                                            {!submitted && (
                                                                                <button
                                                                                    onClick={() => handleRemoveWord(index)}
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        top: '-8px',
                                                                                        right: '-8px',
                                                                                        width: '24px',
                                                                                        height: '24px',
                                                                                        borderRadius: '50%',
                                                                                        background: 'rgba(239, 68, 68, 0.8)',
                                                                                        border: 'none',
                                                                                        color: 'white',
                                                                                        cursor: 'pointer',
                                                                                        fontSize: '14px',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        fontWeight: 'bold'
                                                                                    }}
                                                                                    title="إزالة الكلمة"
                                                                                >
                                                                                    ×
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    ) : (
                                                                        <span style={{
                                                                            color: 'var(--text-secondary)',
                                                                            fontSize: '0.9rem'
                                                                        }}>
                                                                            اسحب الكلمة هنا
                                                                        </span>
                                                                    )}
                                                    </div>
                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        ) : (
                                            <input
                                                type="text"
                                                className="fill-in-answer"
                                                value={answers[question.id!] || ''}
                                                onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                                                placeholder="اكتب الكلمة هنا..."
                                                disabled={submitted}
                                            />
                                        )}
                                        {renderAnswerFeedback(question.id!, answers[question.id!] || '')}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'odd_word' && (() => {
                                const question = questions[currentQuestionIndex];
                                let wordsArray: string[] = [];
                                let optionsData: any = null;
                                
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                if (optionsData && optionsData.words && Array.isArray(optionsData.words)) {
                                    wordsArray = optionsData.words;
                                }
                                
                                return (
                                    <div className="odd-word-question">
                                        <div className="odd-word-options">
                                            {wordsArray.map((word, index) => (
                                                <label key={index} className="radio-option">
                                                    <input
                                                        type="radio"
                                                        name={`odd-word-${question.id}`}
                                                        value={index.toString()}
                                                        checked={answers[question.id!] === index.toString()}
                                                        onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                                                    />
                                                    <span>{word}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {renderAnswerFeedback(question.id!, answers[question.id!] || '')}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'matching' && (() => {
                                const question = questions[currentQuestionIndex];
                                let pairsArray: Array<{ word: string; matchKey: string; options: Array<{ key: string; value: string }> }> = [];
                                let optionsData: any = null;
                                
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                if (optionsData && optionsData.pairs && Array.isArray(optionsData.pairs)) {
                                    pairsArray = optionsData.pairs;
                                }
                                
                                const currentAnswers = (answers[question.id!] || '').split(',');
                                
                                return (
                                    <div className="matching-question">
                                        {pairsArray.map((pair, index) => (
                                            <div key={index} className="matching-pair-answer">
                                                <div className="matching-word">{pair.word}</div>
                                                <select
                                                    className="matching-select"
                                                    value={currentAnswers[index] || ''}
                                                    onChange={(e) => {
                                                        const newAnswers = [...currentAnswers];
                                                        newAnswers[index] = e.target.value;
                                                        handleAnswerChange(question.id!, newAnswers.join(','));
                                                    }}
                                                    disabled={submitted}
                                                >
                                                    <option value="">اختر...</option>
                                                    {pair.options.map((opt, optIdx) => (
                                                        <option key={optIdx} value={opt.key}>
                                                            {opt.key} - {opt.value}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        ))}
                                        {renderAnswerFeedback(question.id!, answers[question.id!] || '')}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'fill_from_box' && (() => {
                                const question = questions[currentQuestionIndex];
                                let wordsArray: string[] = [];
                                let sentencesArray: string[] = [];
                                let optionsData: any = null;
                                
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                if (optionsData) {
                                    if (optionsData.words && Array.isArray(optionsData.words)) {
                                        wordsArray = optionsData.words;
                                    }
                                    if (optionsData.sentences && Array.isArray(optionsData.sentences)) {
                                        sentencesArray = optionsData.sentences;
                                    }
                                }
                                
                                const currentAnswers = (answers[question.id!] || '').split(',');
                                
                                console.log('Fill from box question:', {
                                    wordsArray,
                                    sentencesArray,
                                    currentAnswers
                                });
                                
                                return (
                                    <div className="fill-from-box-question">
                                        <div className="box-words-display">
                                            <strong>الكلمات المتاحة:</strong>
                                            <div className="box-words-list">
                                                {wordsArray.map((word, index) => (
                                                    <span key={index} className="box-word-tag">{word}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="fill-sentences">
                                            {sentencesArray.length > 0 ? (
                                                sentencesArray.map((sentence, index) => {
                                                    // Replace ... or ....... with input field
                                                    // Support multiple patterns: ..., ....., ....... etc.
                                                    const blankPattern = /\.{3,}/g;
                                                    const parts = sentence.split(blankPattern);
                                                    const hasBlank = blankPattern.test(sentence);
                                                    
                                                    return (
                                                        <div key={index} className="fill-sentence-item">
                                                            {hasBlank ? (
                                                                // Sentence has blank - split and add input
                                                                <>
                                                                    {parts.map((part, partIndex) => (
                                                                        <React.Fragment key={partIndex}>
                                                                            <span>{part}</span>
                                                                            {partIndex < parts.length - 1 && (
                                                                                <input
                                                                                    type="text"
                                                                                    className="fill-blank-input"
                                                                                    value={currentAnswers[index] || ''}
                                                                                    onChange={(e) => {
                                                                                        const newAnswers = [...currentAnswers];
                                                                                        newAnswers[index] = e.target.value;
                                                                                        handleAnswerChange(question.id!, newAnswers.join(','));
                                                                                    }}
                                                                                    placeholder="الكلمة"
                                                                                />
                                                                            )}
                                                                        </React.Fragment>
                                                                    ))}
                                                                </>
                                                            ) : (
                                                                // Sentence doesn't have blank pattern - show sentence with input at the end
                                                                <>
                                                                    <span>{sentence}</span>
                                                                    <input
                                                                        type="text"
                                                                        className="fill-blank-input"
                                                                        value={currentAnswers[index] || ''}
                                                                        onChange={(e) => {
                                                                            const newAnswers = [...currentAnswers];
                                                                            newAnswers[index] = e.target.value;
                                                                            handleAnswerChange(question.id!, newAnswers.join(','));
                                                                        }}
                                                                        placeholder="الكلمة"
                                                                    />
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                // Fallback: show input fields for each answer
                                                currentAnswers.map((_, index) => (
                                                    <div key={index} className="fill-sentence-item">
                                                        <span>الجملة {index + 1}:</span>
                                                        <input
                                                            type="text"
                                                            className="fill-blank-input"
                                                            value={currentAnswers[index] || ''}
                                                            onChange={(e) => {
                                                                const newAnswers = [...currentAnswers];
                                                                newAnswers[index] = e.target.value;
                                                                handleAnswerChange(question.id!, newAnswers.join(','));
                                                            }}
                                                            placeholder="اكتب الكلمة"
                                                        />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        {renderAnswerFeedback(question.id!, answers[question.id!] || '')}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'do_as_shown' && (() => {
                                const question = questions[currentQuestionIndex];
                                let itemsArray: Array<{ sentence: string; instruction: string; answer: string }> = [];
                                let optionsData: any = null;
                                
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                if (optionsData && optionsData.items && Array.isArray(optionsData.items)) {
                                    itemsArray = optionsData.items;
                                }
                                
                                const currentAnswers = (answers[question.id!] || '').split(',');
                                
                                return (
                                    <div className="do-as-shown-question">
                                        {itemsArray.map((item, index) => (
                                            <div key={index} className="do-as-shown-item" style={{
                                                marginBottom: '1.5rem',
                                                padding: '1.25rem',
                                                background: 'rgba(30, 58, 138, 0.2)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '2px solid rgba(59, 130, 246, 0.3)'
                                            }}>
                                                <div style={{ marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                                                    <strong>{index + 1}.</strong> {item.sentence} <em style={{ color: 'rgba(251, 191, 36, 0.9)' }}>({item.instruction})</em>
                                                </div>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={currentAnswers[index] || ''}
                                                    onChange={(e) => {
                                                        const newAnswers = [...currentAnswers];
                                                        newAnswers[index] = e.target.value;
                                                        handleAnswerChange(question.id!, newAnswers.join(','));
                                                    }}
                                                    placeholder="اكتب إجابتك هنا..."
                                                    style={{
                                                        width: '100%',
                                                        padding: '1rem 1.25rem',
                                                        fontSize: '1rem',
                                                        background: 'rgba(30, 58, 138, 0.3)',
                                                        border: '2px solid rgba(59, 130, 246, 0.5)',
                                                        borderRadius: 'var(--radius-md)',
                                                        color: '#ffffff'
                                                    }}
                                                />
                                            </div>
                                        ))}
                                        {renderAnswerFeedback(question.id!, answers[question.id!] || '')}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'use_a_or_an' && (() => {
                                const question = questions[currentQuestionIndex];
                                let wordsArray: string[] = [];
                                let optionsData: any = null;
                                
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                if (optionsData && optionsData.words && Array.isArray(optionsData.words)) {
                                    wordsArray = optionsData.words;
                                }
                                
                                const currentAnswers = (answers[question.id!] || '').split(',');
                                
                                return (
                                    <div className="use-a-or-an-question">
                                        {wordsArray.map((word, index) => (
                                            <div key={index} className="use-a-or-an-item" style={{
                                                marginBottom: '1.5rem',
                                                padding: '1.25rem',
                                                background: 'rgba(30, 58, 138, 0.2)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '2px solid rgba(59, 130, 246, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '1rem'
                                            }}>
                                                <span style={{ fontSize: '1.1rem', fontWeight: 600, minWidth: '100px' }}>
                                                    {index + 1}. {word}
                                                </span>
                                                <select
                                                    value={currentAnswers[index] || ''}
                                                    onChange={(e) => {
                                                        const newAnswers = [...currentAnswers];
                                                        newAnswers[index] = e.target.value;
                                                        handleAnswerChange(question.id!, newAnswers.join(','));
                                                    }}
                                                    style={{
                                                        padding: '0.75rem 1rem',
                                                        fontSize: '1rem',
                                                        background: 'rgba(30, 58, 138, 0.3)',
                                                        border: '2px solid rgba(59, 130, 246, 0.5)',
                                                        borderRadius: 'var(--radius-md)',
                                                        color: '#ffffff',
                                                        cursor: 'pointer',
                                                        flex: 1,
                                                        maxWidth: '200px'
                                                    }}
                                                >
                                                    <option value="">اختر...</option>
                                                    <option value="a">a</option>
                                                    <option value="an">an</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'reading_comprehension' && (() => {
                                const question = questions[currentQuestionIndex];
                                let paragraphText = '';
                                let subQuestions: Array<{
                                    question: string;
                                    type: 'multiple_choice' | 'true_false' | 'fill_in_blank';
                                    options?: string[];
                                    correctAnswer: string | number;
                                }> = [];
                                let optionsData: any = null;
                                
                                if (question.options) {
                                    if (typeof question.options === 'string') {
                                        try {
                                            optionsData = JSON.parse(question.options);
                                        } catch (e) {
                                            console.error('Error parsing options:', e);
                                        }
                                    } else if (typeof question.options === 'object') {
                                        optionsData = question.options;
                                    }
                                }
                                
                                if (optionsData) {
                                    if (optionsData.paragraph) {
                                        paragraphText = optionsData.paragraph;
                                    }
                                    if (optionsData.questions && Array.isArray(optionsData.questions)) {
                                        subQuestions = optionsData.questions;
                                    }
                                }
                                
                                // Parse current answers (stored as JSON string)
                                let currentAnswers: Record<number, string> = {};
                                try {
                                    const answerText = answers[question.id!] || '{}';
                                    currentAnswers = JSON.parse(answerText);
                                } catch (e) {
                                    // If not JSON, treat as empty
                                }
                                
                                const handleSubQuestionAnswer = (subIndex: number, answer: string) => {
                                    const newAnswers = { ...currentAnswers, [subIndex]: answer };
                                    handleAnswerChange(question.id!, JSON.stringify(newAnswers));
                                };
                                
                                return (
                                    <div className="reading-comprehension-question">
                                        {/* Paragraph Text */}
                                        <div style={{
                                            marginBottom: '2rem',
                                            padding: '1.5rem',
                                            background: 'rgba(30, 58, 138, 0.15)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '2px solid rgba(59, 130, 246, 0.3)',
                                            fontSize: '1.1rem',
                                            lineHeight: '1.8',
                                            color: 'var(--text-primary)'
                                        }}>
                                            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(paragraphText, { 
                                                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'sub', 'sup', 'p'],
                                                ALLOWED_ATTR: []
                                            }) }} />
                                        </div>
                                        
                                        {/* Sub Questions */}
                                        {subQuestions.map((subQ, subIndex) => (
                                            <div key={subIndex} style={{
                                                marginBottom: '2rem',
                                                padding: '1.25rem',
                                                background: 'rgba(30, 58, 138, 0.1)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid rgba(59, 130, 246, 0.2)'
                                            }}>
                                                <div style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1.1rem' }}>
                                                    {subIndex + 1}. {subQ.question}
                                                </div>
                                                
                                                {subQ.type === 'multiple_choice' && subQ.options && (
                                                    <div className="answer-options">
                                                        {subQ.options.map((opt, optIndex) => (
                                                            <label key={optIndex} className="radio-option">
                                                                <input
                                                                    type="radio"
                                                                    name={`subQ-${question.id}-${subIndex}`}
                                                                    value={optIndex.toString()}
                                                                    checked={currentAnswers[subIndex] === optIndex.toString()}
                                                                    onChange={(e) => handleSubQuestionAnswer(subIndex, e.target.value)}
                                                                    disabled={submitted}
                                                                />
                                                                <span>{opt}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                                
                                                {subQ.type === 'true_false' && (
                                                    <div className="answer-options">
                                                        <label className="radio-option">
                                                            <input
                                                                type="radio"
                                                                name={`subQ-${question.id}-${subIndex}`}
                                                                value="true"
                                                                checked={currentAnswers[subIndex] === 'true'}
                                                                onChange={(e) => handleSubQuestionAnswer(subIndex, e.target.value)}
                                                                disabled={submitted}
                                                            />
                                                            <span>صحيح</span>
                                                        </label>
                                                        <label className="radio-option">
                                                            <input
                                                                type="radio"
                                                                name={`subQ-${question.id}-${subIndex}`}
                                                                value="false"
                                                                checked={currentAnswers[subIndex] === 'false'}
                                                                onChange={(e) => handleSubQuestionAnswer(subIndex, e.target.value)}
                                                                disabled={submitted}
                                                            />
                                                            <span>خطأ</span>
                                                        </label>
                                                    </div>
                                                )}
                                                
                                                {subQ.type === 'fill_in_blank' && (
                                                    <input
                                                        type="text"
                                                        className="fill-in-answer"
                                                        value={currentAnswers[subIndex] || ''}
                                                        onChange={(e) => handleSubQuestionAnswer(subIndex, e.target.value)}
                                                        placeholder="أدخل إجابتك..."
                                                        disabled={submitted}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}

                            {questions[currentQuestionIndex].question_type === 'essay' && (
                                <textarea
                                    className="essay-answer"
                                    value={answers[questions[currentQuestionIndex].id!] || ''}
                                    onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id!, e.target.value)}
                                    placeholder="اكتب إجابتك هنا..."
                                    rows={6}
                                />
                            )}

                            {/* Navigation Buttons - hide when reviewing single question */}
                            {!reviewingSingleQuestion && (
                                <div className="question-navigation">
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            if (currentQuestionIndex > 0 && !isTransitioning) {
                                                setIsTransitioning(true);
                                                setTimeout(() => {
                                                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                                                    setIsTransitioning(false);
                                                }, 300);
                                            }
                                        }}
                                        disabled={currentQuestionIndex === 0 || isTransitioning}
                                        className="nav-button prev-button"
                                    >
                                        ← السابق
                                    </Button>
                                    {currentQuestionIndex === questions.length - 1 ? (
                                        <Button
                                            variant="primary"
                                            onClick={handleSubmit}
                                            disabled={submitting || isTransitioning}
                                            className="nav-button submit-button"
                                        >
                                            {submitting ? 'جاري الإرسال...' : 'إرسال الإجابات'}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            onClick={() => {
                                                if (currentQuestionIndex < questions.length - 1 && !isTransitioning) {
                                                    setIsTransitioning(true);
                                                    setTimeout(() => {
                                                        setCurrentQuestionIndex(currentQuestionIndex + 1);
                                                        setIsTransitioning(false);
                                                    }, 300);
                                                }
                                            }}
                                            disabled={isTransitioning}
                                            className="nav-button next-button"
                                        >
                                            التالي →
                                        </Button>
                                    )}
                                </div>
                            )}
                            
                            {/* Back to results button - show when reviewing single question */}
                            {reviewingSingleQuestion && (
                                <div className="question-navigation">
                                    <Button
                                        variant="primary"
                                        onClick={handleBackToResults}
                                        className="nav-button back-to-results-button"
                                        fullWidth
                                    >
                                        ← العودة إلى النتائج
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

