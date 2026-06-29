import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { searchStudentAdmin } from '@/services/studentService';
import type { Student } from '@/types/database.types';
import './SeatLookupModal.css';
import './AdminSeatLookup.css';

type SearchType = 'national_id' | 'name';

export function AdminSeatLookup() {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchType, setSearchType] = useState<SearchType>('national_id');
    const [searchResults, setSearchResults] = useState<Student[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [nationalIdFromUrl, setNationalIdFromUrl] = useState<string | null>(null);

    const handleSearch = async (query: string, type: SearchType = searchType) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setSearchError('');
        setSearchResults([]);
        setHasSearched(false);

        const result = await searchStudentAdmin(query.trim(), type);

        if (result.success && result.data) {
            setSearchResults(result.data);
            if (result.data.length === 0) {
                const errorMsg = type === 'national_id' 
                    ? 'لا توجد نتائج مطابقة لهذا رقم الهوية'
                    : 'لا توجد نتائج مطابقة لهذا الاسم';
                setSearchError(errorMsg);
            }
        } else {
            setSearchError(result.error || 'حدث خطأ أثناء البحث');
        }

        setHasSearched(true);
        setIsSearching(false);
    };

    // Extract national ID from URL hash: #admin-seat/{national_id}
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.startsWith('#admin-seat/')) {
            const nationalId = hash.substring('#admin-seat/'.length);
            if (nationalId) {
                setNationalIdFromUrl(nationalId);
                setSearchQuery(nationalId);
                setSearchType('national_id');
                // Auto-search when national ID is provided in URL
                handleSearch(nationalId, 'national_id');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleSearch(searchQuery, searchType);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setSearchError('');
        if (hasSearched) {
            setHasSearched(false);
            setSearchResults([]);
        }
    };

    return (
        <Layout showFooter={false}>
            <div className="admin-seat-lookup-container">
                <div className="admin-seat-lookup-header">
                    <h1 className="admin-seat-lookup-title">البحث عن رقم الجلوس - لوحة الإدارة</h1>
                    <p className="admin-seat-lookup-subtitle">يمكنك البحث عن رقم الجلوس باستخدام رقم الهوية أو الاسم</p>
                </div>

                <div className="admin-seat-lookup-content">
                    <div className="search-type-selector">
                        <label className="search-type-label">نوع البحث:</label>
                        <div className="search-type-buttons">
                            <button
                                type="button"
                                className={`search-type-btn ${searchType === 'national_id' ? 'active' : ''}`}
                                onClick={() => {
                                    setSearchType('national_id');
                                    setSearchError('');
                                    setSearchResults([]);
                                    setHasSearched(false);
                                }}
                                disabled={isSearching}
                            >
                                رقم الهوية
                            </button>
                            <button
                                type="button"
                                className={`search-type-btn ${searchType === 'name' ? 'active' : ''}`}
                                onClick={() => {
                                    setSearchType('name');
                                    setSearchError('');
                                    setSearchResults([]);
                                    setHasSearched(false);
                                }}
                                disabled={isSearching}
                            >
                                الاسم
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleFormSubmit} className="seat-lookup-form">
                        <input
                            type="text"
                            className="seat-lookup-input"
                            placeholder={searchType === 'national_id' ? 'أدخل رقم الهوية' : 'أدخل اسم الطالب'}
                            value={searchQuery}
                            onChange={handleInputChange}
                            autoFocus={!nationalIdFromUrl}
                            disabled={isSearching}
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
                            <div key={student.id} className="student-result-card admin-result-card">
                                <div className="result-header">
                                    <h3 className="result-student-name">{student.name}</h3>
                                </div>
                                <div className="result-row">
                                    <span className="result-label">رقم الهوية:</span>
                                    <span className="result-value">{student.national_id}</span>
                                </div>
                                <div className="result-row">
                                    <span className="result-label">الصف:</span>
                                    <span className="result-value">{student.grade}</span>
                                </div>
                                <div className="result-row highlight-row">
                                    <span className="result-label">رقم الجلوس:</span>
                                    <span className="result-value highlight-value">{student.seat_number}</span>
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

                    {nationalIdFromUrl && (
                        <div className="url-info">
                            <p>تم البحث تلقائياً بناءً على الرابط المباشر</p>
                            <p className="url-link">الرابط: <code>#admin-seat/{nationalIdFromUrl}</code></p>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

