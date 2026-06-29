import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { navigateTo, navigateBack } from '@/lib/navigation';
import './TermsScreen.css';

export function TermsScreen() {
    const [isAccepted, setIsAccepted] = useState(false);

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIsAccepted(e.target.checked);
    };

    const handleContinue = () => {
        navigateTo('stage');
    };

    return (
        <Layout showFooter={false}>
            <div className="terms-screen">
                {/* Background */}
                <div className="terms-background"></div>

                {/* Main Card */}
                <div className="terms-main-card">
                    {/* Back Button */}
                    <button 
                        className="terms-back-button"
                        onClick={navigateBack}
                        aria-label="رجوع"
                    >
                        <span className="back-icon">←</span>
                        <span className="back-text">رجوع</span>
                    </button>

                    {/* Title */}
                    <div className="terms-title-wrapper">
                        <h1 className="terms-title">تعليمات</h1>
                        <h1 className="terms-title">ولي الأمر</h1>
                    </div>

                    {/* Content */}
                    <div className="terms-content">
                        <p className="term-paragraph">
                            <strong>عزيزي ولي الأمر :</strong>
                        </p>
                        <p className="term-paragraph">
                        نودّ التأكيد على أن هذه المراجعات شاملة لجميع أجزاء المنهج الدراسي، وقد تم إعدادها لتكون مرجعًا يساعد الطّالب على الإلمام الكامل بالمنهج الدراسي ولا تغني عن الكتاب المدرسي .
                        </p>
                        <p className="term-paragraph">
                            ونظرًا لأن الاختبارات أصبحت الآن اختبارات وزارية تُعدّ مركزيًا من قبل إدارة التعليم، ولا علاقة للمدرسة بوضع أسئلة الاختبار،
                        </p>
                        <p className="term-paragraph">
                            عليه ..فإننا نؤكد على أهمية قيام الطالب بـ:
                        </p>
                        <ol className="term-list">
                            <li className="term-list-item">مراجعة جميع أوراق المراجعات المرسلة عبر الرابط بشكل كامل ودقيق.</li>
                            <li className="term-list-item">طباعة أوراق المراجعات وإحضارها إلى المدرسة ليتم حلّها مع المعلم داخل الصف لتعزيز الفهم ومعالجة أي صعوبات.</li>
                        </ol>
                        <p className="term-paragraph">
                            <strong>عزيزي ولي الأمر :</strong>
                        </p>
                        <p className="term-paragraph">
                            إن تعاونكم ومتابعتكم المستمرة ضروريان لدعم أبنائنا وتحقيق أفضل النتائج في الاختبارات الوزارية. شاكرين لكم حرصكم وتعاونكم الدائم.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="terms-actions">
                        <label className="terms-checkbox-label">
                            <input
                                type="checkbox"
                                className="terms-checkbox"
                                checked={isAccepted}
                                onChange={handleCheckboxChange}
                            />
                            <span className="terms-checkbox-text">قرأت التعليمات</span>
                        </label>

                        <button
                            className="terms-continue-button"
                            onClick={handleContinue}
                            disabled={!isAccepted}
                        >
                            استمرار
                        </button>
                    </div>
                </div>

                {/* Director Name */}
                <div className="terms-director">
                    <p className="director-text">مدير المدرسة: محمد نصر الدين</p>
                </div>
            </div>
        </Layout>
    );
}
