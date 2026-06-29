import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { selectedGrade, selectedSubjectName, selectedReviewType } from '@/lib/navigation';
import { getMaterialsByGradeAndType } from '@/services/reviewService';
import { getGradeName } from '@/utils/gradeUtils';
import { sortUploadedMaterials } from '@/utils/materialOrder';
import type { UploadedMaterial } from '@/types/database.types';
import './SubjectMaterialsScreen.css';

export function SubjectMaterialsScreen() {
    const grade = useStore(selectedGrade);
    const subjectName = useStore(selectedSubjectName);
    const reviewType = useStore(selectedReviewType);
    const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadMaterials() {
            if (grade && subjectName && reviewType) {
                setLoading(true);
                const data = await getMaterialsByGradeAndType(grade, reviewType);
                // Filter materials by subject name
                const subjectMaterials = sortUploadedMaterials(
                    data.filter((material) => material.subject_name === subjectName)
                );
                setMaterials(subjectMaterials);
                setLoading(false);
            }
        }
        loadMaterials();

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade && subjectName && reviewType) {
            (async () => {
                const { supabase } = await import('@/lib/supabase');
                if (supabase) {
                    const channelName = `materials-changes-${grade}-${subjectName}-${reviewType}-${Date.now()}`;
                    channel = supabase
                        .channel(channelName)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'uploaded_materials',
                            },
                            async (payload) => {
                                console.log('🔄 Real-time update detected:', payload);
                                
                                const currentStage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';
                                
                                if (payload.eventType === 'INSERT' && payload.new) {
                                    const newMaterial = payload.new as UploadedMaterial;
                                    
                                    if (newMaterial.stage === currentStage && 
                                        newMaterial.grade === grade && 
                                        newMaterial.content_type === reviewType &&
                                        newMaterial.subject_name === subjectName) {
                                        setMaterials((prev) =>
                                            sortUploadedMaterials(
                                                prev.some((m) => m.id === newMaterial.id)
                                                    ? prev.map((m) =>
                                                          m.id === newMaterial.id ? newMaterial : m
                                                      )
                                                    : [newMaterial, ...prev]
                                            )
                                        );
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedMaterial = payload.old as UploadedMaterial;
                                    
                                    if (deletedMaterial.subject_name === subjectName) {
                                        setMaterials(prev => prev.filter(m => m.id !== deletedMaterial.id));
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedMaterial = payload.new as UploadedMaterial;
                                    if (updatedMaterial.subject_name === subjectName) {
                                        setMaterials((prev) =>
                                            sortUploadedMaterials(
                                                prev.some((m) => m.id === updatedMaterial.id)
                                                    ? prev.map((m) =>
                                                          m.id === updatedMaterial.id
                                                              ? updatedMaterial
                                                              : m
                                                      )
                                                    : [updatedMaterial, ...prev]
                                            )
                                        );
                                        return;
                                    }
                                }
                            }
                        )
                        .subscribe((status, err) => {
                            console.log('📡 Realtime subscription status:', status);
                            if (err && status !== 'CLOSED') {
                                console.warn('⚠️ Realtime subscription failed.');
                            }
                        });
                }
            })();
        }

        return () => {
            if (channel) {
                (async () => {
                    const { supabase } = await import('@/lib/supabase');
                    if (supabase) {
                        supabase.removeChannel(channel);
                    }
                })();
            }
        };
    }, [grade, subjectName, reviewType]);

    const handleShareLink = async (url: string, fileName: string) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: fileName,
                    text: `مراجعة ${subjectName} - ${grade ? getGradeName(grade) : ''}`,
                    url: url
                });
            } catch (error) {
                try {
                    await navigator.clipboard.writeText(url);
                    alert('تم نسخ الرابط إلى الحافظة');
                } catch (clipboardError) {
                    console.error('Failed to copy to clipboard:', clipboardError);
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                alert('تم نسخ الرابط إلى الحافظة');
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                alert(`الرابط: ${url}`);
            }
        }
    };

    const handleDownload = (url: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWhatsApp = (phoneNumber: string, subjectName: string) => {
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+966${cleanNumber}`;
        const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}?text=السلام عليكم، أريد التواصل بخصوص مادة ${subjectName}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="materials-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="materials-title heading-shadow">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (materials.length === 0) {
        return (
            <Layout showFooter>
                <div className="materials-screen">
                    <BackButton />
                    <h1 className="materials-title heading-shadow">
                        {reviewType === 'solved' ? 'مراجعات محلولة' : 'مراجعات غير محلولة'} - {subjectName}
                    </h1>
                    <p className="materials-subtitle">
                        {grade ? getGradeName(grade) : ''}
                    </p>
                    <div className="empty-state">
                        <p className="empty-text">لا توجد مواد متاحة لهذه المادة حالياً</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    const teacherWhatsApp = materials[0]?.teacher_whatsapp;

    return (
        <Layout showFooter>
            <div className="materials-screen">
                <BackButton />
                <h1 className="materials-title">
                    {reviewType === 'solved' ? 'مراجعات محلولة' : 'مراجعات غير محلولة'} - {subjectName}
                </h1>
                <p className="materials-subtitle">
                    {grade ? getGradeName(grade) : ''}
                </p>

                {teacherWhatsApp && (
                    <div className="whatsapp-link-container">
                        <div 
                            className="whatsapp-link-text"
                            onClick={() => handleWhatsApp(teacherWhatsApp, subjectName || '')}
                        >
                            اضغط لتواصل مع المعلم
                        </div>
                    </div>
                )}

                <div className="materials-grid">
                    {materials.map((material) => (
                        <Card key={material.id} className="material-card">
                            <div className="material-card-content">
                                <h3 className="material-title">{material.file_name}</h3>
                                {material.uploaded_at && (
                                    <p className="material-date">
                                        {new Date(material.uploaded_at).toLocaleDateString('ar-SA')}
                                    </p>
                                )}
                                <div className="material-actions">
                                    <Button
                                        variant="primary"
                                        onClick={() => handleDownload(material.file_url, material.file_name)}
                                        className="material-download-btn"
                                    >
                                        تحميل
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleShareLink(material.file_url, material.file_name)}
                                        className="material-share-btn"
                                    >
                                        مشاركة
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </Layout>
    );
}

