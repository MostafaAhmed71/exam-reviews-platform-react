import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { useStore } from '@nanostores/react';
import { selectedGrade, selectedSubjectName, navigateTo } from '../lib/navigation';
import { getElectronicTestsByGrade } from '../services/testService';
import { getGradeName } from '../utils/gradeUtils';
import { getSubjectIconPath } from '../utils/subjectIcons';
import { trackVisitor } from '../services/trackingService';
import type { ElectronicTest } from '../types/database.types';
import './ElectronicScreen.css';

interface GroupedTests {
    subject_name: string;
    teacher_whatsapp?: string;
    tests: ElectronicTest[];
}

export function ElectronicScreen() {
    const grade = useStore(selectedGrade);
    const [groupedTests, setGroupedTests] = useState<GroupedTests[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        trackVisitor('electronic');
    }, []);

    useEffect(() => {
        loadTests();

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade) {
            (async () => {
                const { supabase } = await import('../lib/supabase');
                if (supabase) {
                    // Use unique channel name per grade to avoid conflicts
                    const channelName = `electronic-tests-changes-${grade}-${Date.now()}`;
                    channel = supabase
                        .channel(channelName)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'electronic_tests',
                                // Remove filter - listen to all changes and filter in code
                            },
                            async (payload) => {
                                console.log('🔄 Real-time update detected (all changes):', payload);
                                
                                const currentStage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';
                                
                                // Use payload data directly for immediate update
                                if (payload.eventType === 'INSERT' && payload.new) {
                                    const newTest = payload.new as ElectronicTest;
                                    console.log('📦 New test data:', newTest);
                                    
                                    if (newTest.stage === currentStage && 
                                        newTest.grade === grade && 
                                        newTest.is_active === true) {
                                        console.log('✅ Test matches! Adding immediately:', newTest);
                                        setGroupedTests(prev => {
                                            // Convert array to object for easier manipulation
                                            const grouped: { [key: string]: GroupedTests } = {};
                                            prev.forEach(g => {
                                                grouped[g.subject_name] = {
                                                    ...g,
                                                    tests: [...g.tests]
                                                };
                                            });
                                            
                                            // Add new test to appropriate group
                                            if (!grouped[newTest.subject_name]) {
                                                grouped[newTest.subject_name] = {
                                                    subject_name: newTest.subject_name,
                                                    teacher_whatsapp: newTest.teacher_whatsapp || '',
                                                    tests: []
                                                };
                                            }
                                            
                                            // Check if test already exists
                                            const existingIndex = grouped[newTest.subject_name].tests.findIndex(t => t.id === newTest.id);
                                            if (existingIndex >= 0) {
                                                grouped[newTest.subject_name].tests[existingIndex] = newTest;
                                            } else {
                                                grouped[newTest.subject_name].tests.unshift(newTest);
                                            }
                                            
                                            // Convert back to array
                                            return Object.values(grouped);
                                        });
                                        return;
                                    } else {
                                        console.log('❌ Test does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedTest = payload.old as ElectronicTest;
                                    console.log('🗑️ Delete event detected:', deletedTest);
                                    
                                    if (deletedTest.stage === currentStage && deletedTest.grade === grade) {
                                        console.log('✅ Delete matches! Removing immediately:', deletedTest);
                                        setGroupedTests(prev => prev.map(group => ({
                                            ...group,
                                            tests: group.tests.filter(t => t.id !== deletedTest.id)
                                        })).filter(group => group.tests.length > 0));
                                        return;
                                    } else {
                                        console.log('❌ Delete does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedTest = payload.new as ElectronicTest;
                                    if (updatedTest.stage === currentStage && updatedTest.grade === grade) {
                                        console.log('🔄 Updating test:', updatedTest);
                                        setGroupedTests(prev => {
                                            const grouped: { [key: string]: GroupedTests } = {};
                                            prev.forEach(g => {
                                                grouped[g.subject_name] = {
                                                    ...g,
                                                    tests: [...g.tests]
                                                };
                                            });
                                            
                                            // Update or add test
                                            if (!grouped[updatedTest.subject_name]) {
                                                grouped[updatedTest.subject_name] = {
                                                    subject_name: updatedTest.subject_name,
                                                    teacher_whatsapp: updatedTest.teacher_whatsapp || '',
                                                    tests: []
                                                };
                                            }
                                            
                                            const existingIndex = grouped[updatedTest.subject_name].tests.findIndex(t => t.id === updatedTest.id);
                                            if (updatedTest.is_active) {
                                                if (existingIndex >= 0) {
                                                    grouped[updatedTest.subject_name].tests[existingIndex] = updatedTest;
                                                } else {
                                                    grouped[updatedTest.subject_name].tests.unshift(updatedTest);
                                                }
                                            } else {
                                                // Remove if not active
                                                if (existingIndex >= 0) {
                                                    grouped[updatedTest.subject_name].tests.splice(existingIndex, 1);
                                                }
                                            }
                                            
                                            return Object.values(grouped).filter(group => group.tests.length > 0);
                                        });
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
                                // Only show warning if it's a real error (not just closing)
                                if (status !== 'CLOSED') {
                                    console.warn('⚠️ Realtime subscription failed. Make sure Realtime is enabled in Supabase Dashboard.');
                                    console.warn('⚠️ Go to: Database → Replication → Enable Realtime for electronic_tests table');
                                }
                            }
                            if (status === 'SUBSCRIBED') {
                                console.log('✅ Successfully subscribed to real-time updates');
                            } else if (status === 'CHANNEL_ERROR') {
                                // Only show warning for actual errors, not when closing
                                console.warn('⚠️ Realtime subscription error. Make sure Realtime is enabled in Supabase Dashboard.');
                                console.warn('⚠️ Go to: Database → Replication → Enable Realtime for electronic_tests table');
                            } else if (status === 'CLOSED') {
                                // This is normal when unmounting, don't show warning
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
    }, [grade]);

    const loadTests = async () => {
        if (!grade) {
            setGroupedTests([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const electronicTests = await getElectronicTestsByGrade(grade);
        
        // Group tests by subject
        const grouped: { [key: string]: GroupedTests } = {};
        electronicTests.forEach((test) => {
            if (!grouped[test.subject_name]) {
                grouped[test.subject_name] = {
                    subject_name: test.subject_name,
                    teacher_whatsapp: test.teacher_whatsapp,
                    tests: []
                };
            }
            grouped[test.subject_name].tests.push(test);
        });
        
        setGroupedTests(Object.values(grouped));
        setLoading(false);
    };

    const handleSubjectClick = (subjectName: string) => {
        selectedSubjectName.set(subjectName);
        navigateTo('subject-tests');
    };

    const handleWhatsApp = (phoneNumber: string, subjectName: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent subject card click
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+966${cleanNumber}`;
        const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}?text=السلام عليكم، أريد التواصل بخصوص مادة ${subjectName}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="electronic-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="electronic-title heading-shadow">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (groupedTests.length === 0) {
        return (
            <Layout showFooter>
                <div className="electronic-screen">
                    <BackButton />
                    <h1 className="electronic-title heading-shadow">المراجعات الإلكترونية</h1>
                    <p className="electronic-subtitle">
                        {grade ? getGradeName(grade) : ''} - اختر اختباراً للبدء
                    </p>
                    <div className="empty-state">
                        <p className="empty-text">لا توجد اختبارات إلكترونية متاحة لهذا الصف</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="electronic-screen">
                <BackButton />
                <h1 className="electronic-title">المراجعات الإلكترونية</h1>
                <p className="electronic-subtitle">
                    {grade ? getGradeName(grade) : ''} - اختر مادة للبدء
                </p>

                <div className="electronic-options">
                    {groupedTests.map((group) => {
                        const subjectIcon = getSubjectIconPath(group.subject_name);
                        return (
                            <div
                                key={group.subject_name}
                                className="electronic-card-horizontal"
                                onClick={() => handleSubjectClick(group.subject_name)}
                            >
                                <div className="electronic-card-content-horizontal">
                                    {subjectIcon && (
                                        <div className="electronic-subject-icon-wrapper">
                                            <img 
                                                src={subjectIcon} 
                                                alt={group.subject_name}
                                                className="electronic-subject-icon"
                                            />
                                        </div>
                                    )}
                                    <div className="electronic-subject-info-horizontal">
                                        <h3 className="electronic-subject-horizontal">{group.subject_name}</h3>
                                        <p className="electronic-count-horizontal">({group.tests.length} اختبار)</p>
                                    </div>
                                    {group.teacher_whatsapp && (
                                        <div 
                                            className="whatsapp-link-horizontal"
                                            onClick={(e) => handleWhatsApp(group.teacher_whatsapp!, group.subject_name, e)}
                                        >
                                            اضغط لتواصل مع المعلم
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}
