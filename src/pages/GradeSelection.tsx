import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { setGrade, selectedStage, navigateBack } from '@/lib/navigation';
import './GradeSelection.css';

export function GradeSelection() {
    const stage = useStore(selectedStage);

    // تحديد الصفوف حسب المرحلة
    const getGrades = () => {
        if (stage === 'middle') {
            return [
                { id: 7, name: 'الصف الأول', shortName: 'الأول' },
                { id: 8, name: 'الصف الثاني', shortName: 'الثاني' },
                { id: 9, name: 'الصف الثالث', shortName: 'الثالث' },
            ];
        } else if (stage === 'high') {
            return [
                { id: 10, name: 'الصف الأول', shortName: 'الأول' },
                { id: 11, name: 'الصف الثاني', shortName: 'الثاني' },
                { id: 12, name: 'الصف الثالث', shortName: 'الثالث' },
            ];
        }
        return [];
    };

    const grades = getGrades();

    const handleGradeSelect = (gradeId: number) => {
        setGrade(gradeId);
    };

    const stageName = stage === 'middle' ? 'المرحلة المتوسطة' : stage === 'high' ? 'المرحلة الثانوية' : '';

    return (
        <Layout showFooter={false}>
            <div className="grade-selection">
                <div className="grade-main-card">
                    {/* Back Button */}
                    <button 
                        className="grade-back-button"
                        onClick={navigateBack}
                        aria-label="رجوع"
                    >
                        <span className="back-icon">←</span>
                        <span className="back-text">رجوع</span>
                    </button>

                    {/* Title */}
                    <h1 className="grade-title">اختر الصف</h1>

                    {/* Stage Section */}
                    <div className="stage-section">
                        {stageName}
                    </div>

                    {/* Grade Buttons */}
                    <div className="grade-buttons-row">
                        {grades.map((grade) => (
                            <button
                                key={grade.id}
                                className="grade-button"
                                onClick={() => handleGradeSelect(grade.id)}
                            >
                                {grade.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
