import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { SelectionHeader } from '@/components/SelectionHeader';
import { selectedGrade, selectedReviewType } from '@/lib/navigation';
import { subscribePublishedReviewsRefresh, getMaterialsByGradeAndType } from '@/services/reviewService';
import { getGradeName } from '@/utils/gradeUtils';
import { getSubjectIconPath } from '@/utils/subjectIcons';
import { orderGroupedMaterials } from '@/utils/materialOrder';
import type { UploadedMaterial } from '@/types/database.types';
import './SubjectSelection.css';

interface GroupedMaterials {
    subject_name: string;
    teacher_whatsapp?: string;
    materials: UploadedMaterial[];
}

export function SubjectSelection() {
    const grade = useStore(selectedGrade);
    const reviewType = useStore(selectedReviewType);
    const [groupedMaterials, setGroupedMaterials] = useState<GroupedMaterials[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase('ar');
    const visibleGroups = groupedMaterials.filter(group =>
        group.subject_name.toLocaleLowerCase('ar').includes(normalizedSearch) ||
        group.materials.some(material => material.file_name.toLocaleLowerCase('ar').includes(normalizedSearch))
    );

    useEffect(() => {
        async function loadMaterials() {
            if (grade && reviewType) {
                setLoading(true);
                const data = await getMaterialsByGradeAndType(grade, reviewType);
                
                // Group materials by subject
                const grouped: { [key: string]: GroupedMaterials } = {};
                data.forEach((material) => {
                    if (!grouped[material.subject_name]) {
                        grouped[material.subject_name] = {
                            subject_name: material.subject_name,
                            teacher_whatsapp: material.teacher_whatsapp,
                            materials: []
                        };
                    }
                    grouped[material.subject_name].materials.push(material);
                });
                
                setGroupedMaterials(
                    orderGroupedMaterials(Object.values(grouped)) as GroupedMaterials[]
                );
                setLoading(false);
            }
        }

        loadMaterials();
        const stopPublishedRefresh = subscribePublishedReviewsRefresh(loadMaterials);

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade && reviewType) {
            (async () => {
                const { supabase } = await import('@/lib/supabase');
                if (supabase) {
                    const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';
                    // Use unique channel name per grade and review type to avoid conflicts
                    const channelName = `materials-changes-${grade}-${reviewType}-${Date.now()}`;
                    channel = supabase
                        .channel(channelName)
                        .on(
                            'postgres_changes',
                            {
                                event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                                schema: 'public',
                                table: 'uploaded_materials',
                                // Remove filter - listen to all changes and filter in code
                            },
                            async (payload) => {
                                console.log('🔄 Real-time update detected (all changes):', payload);
                                console.log('📊 Current filters:', { stage, grade, reviewType });
                                
                                // Use payload data directly for immediate update
                                if (payload.eventType === 'INSERT' && payload.new) {
                                    const newMaterial = payload.new as UploadedMaterial;
                                    console.log('📦 New material data:', newMaterial);
                                    // Check if this material matches our filters
                                    const materialStage: 'middle' | 'high' = newMaterial.grade >= 7 && newMaterial.grade <= 9 ? 'middle' : 'high';
                                    const matchesStage = newMaterial.stage === stage;
                                    const matchesGrade = newMaterial.grade === grade;
                                    const matchesType = (reviewType === 'all' ? ['solved', 'unsolved'].includes(newMaterial.content_type) : newMaterial.content_type === reviewType);
                                    
                                    console.log('🔍 Filter check:', {
                                        materialStage,
                                        matchesStage,
                                        matchesGrade,
                                        matchesType,
                                        materialGrade: newMaterial.grade,
                                        materialType: newMaterial.content_type
                                    });
                                    
                                    if (matchesStage && matchesGrade && matchesType) {
                                        console.log('✅ Material matches! Adding immediately:', newMaterial);
                                        setGroupedMaterials(prev => {
                                            const grouped: { [key: string]: GroupedMaterials } = {};
                                            prev.forEach(g => {
                                                grouped[g.subject_name] = {
                                                    ...g,
                                                    materials: [...g.materials]
                                                };
                                            });
                                            
                                            if (!grouped[newMaterial.subject_name]) {
                                                grouped[newMaterial.subject_name] = {
                                                    subject_name: newMaterial.subject_name,
                                                    teacher_whatsapp: newMaterial.teacher_whatsapp || '',
                                                    materials: []
                                                };
                                            }
                                            
                                            const existingIndex = grouped[newMaterial.subject_name].materials.findIndex(m => m.id === newMaterial.id);
                                            if (existingIndex >= 0) {
                                                grouped[newMaterial.subject_name].materials[existingIndex] = newMaterial;
                                            } else {
                                                grouped[newMaterial.subject_name].materials.unshift(newMaterial);
                                            }
                                            
                                            return orderGroupedMaterials(
                                                Object.values(grouped)
                                            ) as GroupedMaterials[];
                                        });
                                        return; // Exit early, no need to reload
                                    } else {
                                        console.log('❌ Material does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedMaterial = payload.old as UploadedMaterial;
                                    const materialStage: 'middle' | 'high' = deletedMaterial.grade >= 7 && deletedMaterial.grade <= 9 ? 'middle' : 'high';
                                    const matchesStage = deletedMaterial.stage === stage;
                                    const matchesGrade = deletedMaterial.grade === grade;
                                    const matchesType = (reviewType === 'all' ? ['solved', 'unsolved'].includes(deletedMaterial.content_type) : deletedMaterial.content_type === reviewType);
                                    
                                    console.log('🗑️ Delete event detected:', deletedMaterial);
                                    console.log('🔍 Delete filter check:', {
                                        materialStage,
                                        matchesStage,
                                        matchesGrade,
                                        matchesType,
                                        materialGrade: deletedMaterial.grade,
                                        materialType: deletedMaterial.content_type
                                    });
                                    
                                    if (matchesStage && matchesGrade && matchesType) {
                                        console.log('✅ Delete matches! Removing immediately:', deletedMaterial);
                                        setGroupedMaterials((prev) =>
                                            orderGroupedMaterials(
                                                prev
                                                    .map((group) => ({
                                                        ...group,
                                                        materials: group.materials.filter(
                                                            (m) => m.id !== deletedMaterial.id
                                                        ),
                                                    }))
                                                    .filter((group) => group.materials.length > 0)
                                            ) as GroupedMaterials[]
                                        );
                                        return; // Exit early, no need to reload
                                    } else {
                                        console.log('❌ Delete does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedMaterial = payload.new as UploadedMaterial;
                                    const matchesStage = updatedMaterial.stage === stage;
                                    const matchesGrade = updatedMaterial.grade === grade;
                                    const matchesType = (reviewType === 'all' ? ['solved', 'unsolved'].includes(updatedMaterial.content_type) : updatedMaterial.content_type === reviewType);
                                    
                                    if (matchesStage && matchesGrade && matchesType) {
                                        console.log('🔄 Updating material:', updatedMaterial);
                                        setGroupedMaterials(prev => {
                                            const grouped: { [key: string]: GroupedMaterials } = {};
                                            prev.forEach(g => {
                                                grouped[g.subject_name] = {
                                                    ...g,
                                                    materials: [...g.materials]
                                                };
                                            });
                                            
                                            if (!grouped[updatedMaterial.subject_name]) {
                                                grouped[updatedMaterial.subject_name] = {
                                                    subject_name: updatedMaterial.subject_name,
                                                    teacher_whatsapp: updatedMaterial.teacher_whatsapp || '',
                                                    materials: []
                                                };
                                            }
                                            
                                            const existingIndex = grouped[updatedMaterial.subject_name].materials.findIndex(m => m.id === updatedMaterial.id);
                                            if (existingIndex >= 0) {
                                                grouped[updatedMaterial.subject_name].materials[existingIndex] = updatedMaterial;
                                            } else {
                                                grouped[updatedMaterial.subject_name].materials.unshift(updatedMaterial);
                                            }
                                            
                                            return orderGroupedMaterials(
                                                Object.values(grouped)
                                            ) as GroupedMaterials[];
                                        });
                                        return;
                                    }
                                }
                                
                                console.log('⚠️ Payload did not match or was incomplete, skipping');
                            }
                        )
                        .subscribe((status, err) => {
                            console.log('📡 Realtime subscription status:', status);
                            if (err) {
                                console.error('❌ Realtime subscription error:', err);
                                // Only show warning if it's a real error (not just closing)
                                if (status !== 'CLOSED') {
                                    console.warn('⚠️ Realtime subscription failed. Make sure Realtime is enabled in Supabase Dashboard.');
                                    console.warn('⚠️ Go to: Database → Replication → Enable Realtime for uploaded_materials table');
                                }
                            }
                            if (status === 'SUBSCRIBED') {
                                console.log('✅ Successfully subscribed to real-time updates');
                            } else if (status === 'CHANNEL_ERROR') {
                                // Only show warning for actual errors, not when closing
                                console.warn('⚠️ Realtime subscription error. Make sure Realtime is enabled in Supabase Dashboard.');
                                console.warn('⚠️ Go to: Database → Replication → Enable Realtime for uploaded_materials table');
                            } else if (status === 'CLOSED') {
                                // This is normal when unmounting, don't show warning
                                console.log('📡 Realtime subscription closed (normal)');
                            }
                        });
                }
            })();
        }

        // Cleanup subscription on unmount
        return () => {
            stopPublishedRefresh();
            if (channel) {
                (async () => {
                    const { supabase } = await import('@/lib/supabase');
                    if (supabase) {
                        supabase.removeChannel(channel);
                    }
                })();
            }
        };
    }, [grade, reviewType]);

    const handleShareLink = async (url: string, subjectName: string) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `مراجعة ${subjectName}`,
                    text: `مراجعة ${subjectName} - ${grade ? getGradeName(grade) : ''}`,
                    url: url
                });
            } catch (error) {
                // User cancelled or error occurred, fallback to copy
                try {
                    await navigator.clipboard.writeText(url);
                    alert('تم نسخ الرابط إلى الحافظة');
                } catch (clipboardError) {
                    console.error('Failed to copy to clipboard:', clipboardError);
                }
            }
        } else {
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(url);
                alert('تم نسخ الرابط إلى الحافظة');
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                // Last resort: show the URL in an alert
                alert(`الرابط: ${url}`);
            }
        }
    };

    const handleDownload = (url: string, fileName: string) => {
        // Direct download
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleWhatsApp = (phoneNumber: string, subjectName: string) => {
        // Remove any non-digit characters except +
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        // Ensure it starts with country code (if not, assume Saudi Arabia +966)
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+966${cleanNumber}`;
        // Create WhatsApp URL
        const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}?text=السلام عليكم، أريد التواصل بخصوص مادة ${subjectName}`;
        window.open(whatsappUrl, '_blank');
    };


    if (loading) {
        return (
            <Layout showFooter>
                <div className="subject-selection">
                    <SelectionHeader>جاري التحميل...</SelectionHeader>
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (groupedMaterials.length === 0) {
        return (
            <Layout showFooter>
                <div className="subject-selection">
                    <SelectionHeader>
                        {reviewType === 'all' ? 'عرض الكل' : reviewType === 'solved' ? 'مراجعات محلولة' : 'مراجعات غير محلولة'}
                    </SelectionHeader>
                    <div className="empty-state">
                        <p className="empty-text">لا توجد مواد متاحة لهذا الصف</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="subject-selection">
                <SelectionHeader>
                    {reviewType === 'all' ? 'عرض الكل' : reviewType === 'solved' ? 'مراجعات محلولة' : 'مراجعات غير محلولة'}
                </SelectionHeader>
                <div className="portal-search">
                    <label htmlFor="review-search">ابحث عن مراجعتك</label>
                    <div className="portal-search-field">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6" /><path d="m15 15 5 5" /></svg>
                        <input id="review-search" type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="اسم المادة أو الملف…" />
                    </div>
                    <span className="portal-results" role="status">{visibleGroups.length} من {groupedMaterials.length} مواد</span>
                </div>
                {visibleGroups.length === 0 && <div className="empty-state"><p>لا توجد مراجعات مطابقة للبحث</p><button className="portal-clear-search" onClick={() => setSearchQuery('')}>مسح البحث</button></div>}

                <div className="subject-options">
                    {visibleGroups.map((group) => {
                        const subjectIcon = getSubjectIconPath(group.subject_name);
                        return (
                            <div
                                key={group.subject_name}
                                className="subject-card-horizontal"
                            >
                                <div className="library-subject-heading"><h2>{group.subject_name}</h2><span>{group.materials.length} ملفات</span></div>
                                {group.materials.map((material) => (
                                    <div key={material.source_id ?? material.id} className="subject-card-content-horizontal">
                                        {subjectIcon ? (
                                            <div className="subject-icon-wrapper">
                                                <img 
                                                    src={subjectIcon} 
                                                    alt={group.subject_name}
                                                    className="subject-icon-img"
                                                />
                                            </div>
                                        ) : <div className="subject-icon-wrapper" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M16 8c-4-3-8-3-12-2v20c4-1 8-1 12 2 4-3 8-3 12-2V6c-4-1-8-1-12 2Zm0 0v20" /></svg></div>}
                                        <div className="material-item-actions">
                                            <button
                                                className="material-action-btn download-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDownload(material.file_url, material.file_name);
                                                }}
                                                title="تحميل"
                                            >
                                                ⬇ تحميل
                                            </button>
                                            <button
                                                className="material-action-btn share-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleShareLink(material.file_url, material.file_name);
                                                }}
                                                title="مشاركة"
                                            >
                                                🔗 مشاركة
                                            </button>
                                        </div>
                                        {group.teacher_whatsapp && (
                                            <div 
                                                className="whatsapp-link-horizontal"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleWhatsApp(group.teacher_whatsapp!, group.subject_name);
                                                }}
                                            >
                                                اضغط للتواصل مع معلم المادة
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}
