import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { BackButton } from '../components/BackButton';
import { selectedGrade, selectedSubjectName } from '../lib/navigation';
import { getElectronicTestsByGrade, generateShareLink } from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import { supabase } from '../lib/supabase';
import type { ElectronicTest } from '../types/database.types';
import './SubjectTestsScreen.css';

interface TestWithQuestionCount extends ElectronicTest {
    questionCount: number;
}

export function SubjectTestsScreen() {
    const grade = useStore(selectedGrade);
    const subjectName = useStore(selectedSubjectName);
    const [tests, setTests] = useState<TestWithQuestionCount[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadTests() {
            if (grade && subjectName) {
                setLoading(true);
                const data = await getElectronicTestsByGrade(grade);
                // Filter tests by subject name
                const subjectTests = data.filter(test => test.subject_name === subjectName);
                
                // Get question count for each test
                const testsWithCounts = await Promise.all(
                    subjectTests.map(async (test) => {
                        let questionCount = 0;
                        if (supabase && test.id) {
                            const { data: questions } = await supabase
                                .from('test_questions')
                                .select('id')
                                .eq('test_id', test.id);
                            questionCount = questions?.length || 0;
                        }
                        return {
                            ...test,
                            questionCount
                        };
                    })
                );
                
                setTests(testsWithCounts);
                setLoading(false);
            }
        }
        loadTests();

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade && subjectName) {
            (async () => {
                const { supabase } = await import('../lib/supabase');
                if (supabase) {
                    // Use unique channel name per grade and subject to avoid conflicts
                    const channelName = `tests-changes-${grade}-${subjectName}-${Date.now()}`;
                    channel = supabase
                        .channel(channelName)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'electronic_tests',
                            },
                            async (payload) => {
                                console.log('🔄 Real-time update detected (all changes):', payload);
                                
                                const currentStage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';
                                
                                if (payload.eventType === 'INSERT' && payload.new) {
                                    const newTest = payload.new as ElectronicTest;
                                    console.log('📦 New test data:', newTest);
                                    
                                    if (newTest.stage === currentStage && 
                                        newTest.grade === grade && 
                                        newTest.subject_name === subjectName &&
                                        newTest.is_active === true) {
                                        console.log('✅ Test matches! Adding immediately:', newTest);
                                        // Get question count for new test
                                        let questionCount = 0;
                                        if (supabase && newTest.id) {
                                            const { data: questions } = await supabase
                                                .from('test_questions')
                                                .select('id')
                                                .eq('test_id', newTest.id);
                                            questionCount = questions?.length || 0;
                                        }
                                        setTests(prev => {
                                            if (prev.some(t => t.id === newTest.id)) {
                                                return prev.map(t => t.id === newTest.id ? { ...newTest, questionCount } : t);
                                            }
                                            return [{ ...newTest, questionCount }, ...prev];
                                        });
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedTest = payload.old as ElectronicTest;
                                    console.log('🗑️ Delete event detected:', deletedTest);
                                    
                                    if (deletedTest.stage === currentStage && 
                                        deletedTest.grade === grade && 
                                        deletedTest.subject_name === subjectName) {
                                        console.log('✅ Delete matches! Removing immediately:', deletedTest);
                                        setTests(prev => prev.filter(t => t.id !== deletedTest.id));
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedTest = payload.new as ElectronicTest;
                                    if (updatedTest.stage === currentStage && 
                                        updatedTest.grade === grade && 
                                        updatedTest.subject_name === subjectName) {
                                        console.log('🔄 Updating test:', updatedTest);
                                        // Get question count for updated test
                                        let questionCount = 0;
                                        if (supabase && updatedTest.id) {
                                            const { data: questions } = await supabase
                                                .from('test_questions')
                                                .select('id')
                                                .eq('test_id', updatedTest.id);
                                            questionCount = questions?.length || 0;
                                        }
                                        if (updatedTest.is_active) {
                                            setTests(prev => {
                                                if (prev.some(t => t.id === updatedTest.id)) {
                                                    return prev.map(t => t.id === updatedTest.id ? { ...updatedTest, questionCount } : t);
                                                } else {
                                                    return [{ ...updatedTest, questionCount }, ...prev];
                                                }
                                            });
                                        } else {
                                            setTests(prev => prev.filter(t => t.id !== updatedTest.id));
                                        }
                                        return;
                                    }
                                }
                                
                                console.log('⚠️ Payload did not match, skipping');
                            }
                        )
                        .subscribe((status, err) => {
                            console.log('📡 Realtime subscription status:', status);
                            if (err) {
                                console.error('❌ Realtime subscription error:', err);
                                if (status !== 'CLOSED') {
                                    console.warn('⚠️ Realtime subscription failed. Make sure Realtime is enabled in Supabase Dashboard.');
                                    console.warn('⚠️ Go to: Database → Replication → Enable Realtime for electronic_tests table');
                                }
                            }
                            if (status === 'SUBSCRIBED') {
                                console.log('✅ Successfully subscribed to real-time updates');
                            } else if (status === 'CHANNEL_ERROR') {
                                console.warn('⚠️ Realtime subscription error. Make sure Realtime is enabled in Supabase Dashboard.');
                                console.warn('⚠️ Go to: Database → Replication → Enable Realtime for electronic_tests table');
                            } else if (status === 'CLOSED') {
                                console.log('📡 Realtime subscription closed (normal)');
                            }
                        });
                }
            })();
        }

        return () => {
            if (channel) {
                (async () => {
                    const { supabase } = await import('../lib/supabase');
                    if (supabase) {
                        supabase.removeChannel(channel);
                    }
                })();
            }
        };
    }, [grade, subjectName]);

    const handleTakeTest = (test: ElectronicTest) => {
        // Navigate to test using share token
        window.location.hash = `#test/${test.share_token}`;
    };

    const handleShare = async (test: ElectronicTest) => {
        const shareLink = generateShareLink(test.share_token);
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: test.test_title,
                    text: `اختبار ${test.subject_name} - ${test.test_title}`,
                    url: shareLink,
                });
            } catch (error) {
                // User cancelled or error occurred
                navigator.clipboard.writeText(shareLink);
                alert('تم نسخ الرابط إلى الحافظة');
            }
        } else {
            navigator.clipboard.writeText(shareLink);
            alert('تم نسخ الرابط إلى الحافظة');
        }
    };

    const handleWhatsApp = (phoneNumber: string, subjectName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent test card click
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+966${cleanNumber}`;
        const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}?text=السلام عليكم، أريد التواصل بخصوص مادة ${subjectName}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="subject-tests-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="tests-title heading-shadow">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (tests.length === 0) {
        return (
            <Layout showFooter>
                <div className="subject-tests-screen">
                    <BackButton />
                    <h1 className="tests-title heading-shadow">الاختبارات الإلكترونية</h1>
                    <p className="tests-subtitle">
                        {grade ? getGradeName(grade) : ''} - {subjectName}
                    </p>
                    <div className="empty-state">
                        <p className="empty-text">لا توجد اختبارات متاحة لهذه المادة حالياً</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="subject-tests-screen">
                <BackButton />
                <h1 className="tests-title">الاختبارات الإلكترونية</h1>
                <p className="tests-subtitle">
                    {grade ? getGradeName(grade) : ''} - {subjectName}
                </p>

                <div className="tests-grid">
                    {tests.map((test) => (
                        <Card 
                            key={test.id} 
                            className="test-card"
                        >
                            <div className="test-card-content">
                                <div className="test-card-header">
                                    <h2 className="test-card-title">{test.test_title}</h2>
                                    {test.teacher_whatsapp && (
                                        <div 
                                            className="whatsapp-link-text"
                                            onClick={(e) => handleWhatsApp(test.teacher_whatsapp!, test.subject_name, e)}
                                        >
                                            اضغط لتواصل مع المعلم
                                        </div>
                                    )}
                                </div>
                                {test.test_description && (
                                    <p className="test-card-description">{test.test_description}</p>
                                )}
                                <div className="test-card-meta">
                                    <span>
                                        {test.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}
                                    </span>
                                    <span>{getGradeName(test.grade)}</span>
                                    <span className="question-count">{test.questionCount} سؤال</span>
                                </div>
                                <div className="test-card-actions">
                                    <button
                                        className="test-btn primary"
                                        onClick={() => handleTakeTest(test)}
                                    >
                                        بدء الاختبار
                                    </button>
                                    <button
                                        className="test-btn secondary"
                                        onClick={() => handleShare(test)}
                                    >
                                        مشاركة
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

