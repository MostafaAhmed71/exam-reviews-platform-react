import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { setGrade, selectedStage } from '@/lib/navigation';
import { SelectionHeader } from '@/components/SelectionHeader';
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
                    <SelectionHeader>اختر الصف</SelectionHeader>

                    {/* Stage Section */}
                    <div className="stage-section">
                        {stageName}
                    </div>

                    {/* Grade Buttons */}
                    <div className="grade-buttons-row">
                        {grades.map((grade, index) => (
                            <button
                                key={grade.id}
                                className="grade-button"
                                onClick={() => handleGradeSelect(grade.id)}
                            >
                                <span className="grade-index" aria-hidden="true">0{index + 1}</span>
                                <span className="grade-name">{grade.name}</span>
                                <span className="grade-action">إلى مراجعاتك <span aria-hidden="true">←</span></span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
