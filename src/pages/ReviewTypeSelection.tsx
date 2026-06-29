import { Layout } from '@/components/Layout';
import { useStore } from '@nanostores/react';
import { selectedStage, selectedGrade, setContentType, navigateBack, navigateTo, type ContentType } from '@/lib/navigation';
import './ReviewTypeSelection.css';
import './SeatLookupModal.css';
import { useState } from 'react';
import { searchStudent } from '@/services/studentService';
import type { Student } from '@/types/database.types';

export function ReviewTypeSelection() {
    const stage = useStore(selectedStage);
    const gradeId = useStore(selectedGrade);
    const [showSeatModal, setShowSeatModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [hasSearched, setHasSearched] = useState(false); // To show "No results" only after search

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setSearchError('');
        setSearchResults([]);
        setHasSearched(false);

        // Get grade label for filtering (e.g. "الأول متوسط")
        let gradeFilter = '';
        if (gradeId !== null) {
            const middleGrades: Record<number, string> = { 7: 'الأول', 8: 'الثاني', 9: 'الثالث' };
            const highGrades: Record<number, string> = { 10: 'الأول', 11: 'الثاني', 12: 'الثالث' };
            const gradeName = stage === 'middle' ? middleGrades[gradeId] : highGrades[gradeId];
            const stageName = stage === 'middle' ? 'متوسط' : 'ثانوي';
            if (gradeName) gradeFilter = `${gradeName} ${stageName}`;
        }

        const result = await searchStudent(searchQuery, gradeFilter);

        if (result.success && result.data) {
            setSearchResults(result.data);
            if (result.data.length === 0) {
                console.log(`DEBUG: No results for query: [${searchQuery}] with filter: [${gradeFilter}]`);
            }
        } else {
            console.error('Search failed:', result.error);
            setSearchError(result.error || 'حدث خطأ أثناء البحث');
        }

        setHasSearched(true);
        setIsSearching(false);
    };

    const allContentTypes: Array<{
        id: ContentType | 'live-stream' | 'seat-number' | 'saved-videos';
        number: number;
        name: string;
        description: string;
        icon: string;
        iconImage?: string;
        availableFor?: 'middle' | 'high' | 'all';
    }> = [
            {
                id: 'live-stream' as any,
                number: 6,
                name: 'مراجعة ليلة الاختبار',
                description: 'شاهد فيديو مراجعة ليلة الاختبار مع معلم المادة',
                icon: '📺',
                iconImage: '/بث مباشر.png',
                availableFor: 'middle'
            },
            {
                id: 'saved-videos' as any,
                number: 8,
                name: 'الفيديوهات المحفوظة',
                description: 'شاهد الفيديوهات التي حفظتها للمشاهدة لاحقاً',
                icon: '💾',
                iconImage: '/فديو.png',
                availableFor: 'middle'  // Only show for middle school, not high school
            },
            {
                id: 'seat-number' as any,
                number: 7,
                name: 'اعرف رقم جلوسك',
                description: 'استعلم عن بيانات لجنتك ورقم الجلوس',
                icon: '🔢',
                iconImage: '/رقم الجلوس.png', // Assuming user might provide this image, or use placeholder
                availableFor: 'all'
            },
            {
                id: 'schedule',
                number: 3,
                name: 'جدول الاختبارات',
                description: 'اطلع على جدول الاختبارات للصف المطلوب.',
                icon: '📅',
                iconImage: '/جدول الاختبارات.png',
                availableFor: 'all'
            },
            {
                id: 'solved',
                number: 1,
                name: 'مراجعات محلولة',
                description: 'اطلع على إجابات نموذجية وشروحات مفصلة.',
                icon: '✓',
                iconImage: '/مراجعات محلولة.png',
                availableFor: 'all'
            },
            {
                id: 'unsolved',
                number: 2,
                name: 'مراجعات غير محلولة',
                description: 'اختبر معرفتك وتدرب على حل الأسئلة بنفسك.',
                icon: '🔒',
                iconImage: '/مراجعات غير محلولة.png',
                availableFor: 'all'
            },

            {
                id: 'videos',
                number: 4,
                name: 'فيديوهات',
                description: 'فيديوهات شرح المراجعة بصوت معلم المادة',
                icon: '▶️',
                iconImage: '/فديو.png',
                availableFor: 'middle'
            },
            {
                id: 'electronic',
                number: 5,
                name: ' اختبر نفسك',
                description: 'ينصح بعدم البدء فى هذه الاختبارات إلا بعد اتمام المراجعة حيث أنها تحتوي علي أجزاء متفرقة من المنهج ولا تمثل الأختبار النهائي',
                icon: '💻',
                iconImage: '/اختبار.png',
                availableFor: 'middle'
            },

        ];

    // Hide selected options temporarily from the review type cards.
    // Remove ids from this set when you want to show them again.
    const temporarilyHiddenTypeIds = new Set([
        'live-stream',
        'videos',
        'electronic',
        'seat-number',
        'saved-videos'
    ]);

    // Filter content types based on stage
    const contentTypes = allContentTypes
        .filter(type => {
            if (temporarilyHiddenTypeIds.has(type.id)) return false;
            if (type.availableFor === 'all') return true;
            return type.availableFor === stage;
        })
        .map((type, index) => ({
            ...type,
            number: index + 1
        }));

    const handleTypeSelect = (type: ContentType | 'live-stream' | 'seat-number' | 'saved-videos') => {
        if (type === 'live-stream') {
            navigateTo('live-stream');
        } else if (type === 'seat-number') {
            setShowSeatModal(true);
        } else if (type === 'saved-videos') {
            navigateTo('saved-videos');
        } else {
            setContentType(type);
        }
    };

    return (
        <Layout showFooter={false}>
            <div className="review-type-selection">
                {/* Background */}
                <div className="review-type-background"></div>

                {/* Header */}
                <div className="review-type-header">
                    <div className="header-content">
                        <div className="title-with-logo">
                            <div className="header-logo">
                                <img
                                    src="/logo.jpeg"
                                    alt="شعار المدرسة"
                                    className="logo-image"
                                />
                            </div>
                            <h1 className="review-type-title">اختر نوع المراجعة</h1>
                        </div>
                        <p className="school-name">متوسطة وثانوية نخبة الشمال الأهلية</p>
                    </div>
                </div>

                {/* Options */}
                <div className="review-type-options">
                    {contentTypes.map((type) => (
                        <div
                            key={type.id}
                            className={`review-type-card ${(type.id === 'live-stream' || type.id === 'seat-number' || type.id === 'schedule' || type.id === 'saved-videos') ? 'new-feature-card' : ''}`}
                            onClick={() => handleTypeSelect(type.id)}
                        >
                            {(type.id === 'live-stream' || type.id === 'seat-number' || type.id === 'schedule' || type.id === 'saved-videos') && (
                                <div className="new-badge">
                                    <img
                                        src={type.iconImage}
                                        alt={type.name}
                                        className="new-badge-icon"
                                    />
                                    <span className="new-badge-text">
                                        {type.id === 'schedule' ? 'محدث' : 'جديدنا'}
                                    </span>
                                </div>
                            )}
                            {type.iconImage && (
                                <div className="card-icon">
                                    <img
                                        src={type.iconImage}
                                        alt={type.name}
                                        className="card-icon-image"
                                    />
                                </div>
                            )}
                            <div className="card-content">
                                <h2 className="card-title">{type.name}</h2>
                                <p className={`card-description ${type.id === 'electronic' ? 'card-description-phosphorescent' : ''}`}>{type.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Back Button */}
                <div className="review-type-back-section">
                    <button
                        className="review-type-back-button"
                        onClick={navigateBack}
                    >
                        <span className="back-icon">←</span>
                        <span className="back-text">رجوع</span>
                    </button>
                </div>
            </div>

            {/* Seat Number Lookup Modal */}
            {showSeatModal && (
                <div className="seat-lookup-modal-overlay">
                    <div className="seat-lookup-modal">
                        <button className="modal-close-btn" onClick={() => setShowSeatModal(false)} aria-label="إغلاق">×</button>

                        <h2 className="modal-title">اعرف رقم جلوسك</h2>

                        <form onSubmit={handleSearch} className="seat-lookup-form">
                            <input
                                type="number"
                                className="seat-lookup-input"
                                placeholder="أدخل رقم الهوية فقط"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="seat-lookup-submit"
                                disabled={isSearching || !searchQuery.trim()}
                            >
                                {isSearching ? 'جاري البحث...' : 'بحث'}
                            </button>
                        </form>

                        {searchError && <div className="error-message">{searchError}</div>}

                        <div className="search-results">
                            {hasSearched && searchResults.length === 0 && !searchError && (
                                <div className="no-results">لا توجد نتائج مطابقة</div>
                            )}

                            {searchResults.map((student) => (
                                <div key={student.id} className="student-result-card">
                                    <div className="result-row">
                                        <span className="result-label">الاسم:</span>
                                        <span className="result-value">{student.name}</span>
                                    </div>
                                    <div className="result-row">
                                        <span className="result-label">الصف:</span>
                                        <span className="result-value">{student.grade}</span>
                                    </div>
                                    <div className="result-row">
                                        <span className="result-label">رقم الجلوس:</span>
                                        <span className="result-value">{student.seat_number}</span>
                                    </div>
                                    <div className="result-row">
                                        <span className="result-label">رقم اللجنة:</span>
                                        <span className="result-value">{student.committee_number}</span>
                                    </div>
                                    <div className="result-row">
                                        <span className="result-label">المقر:</span>
                                        <span className="result-value">{student.headquarters}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
