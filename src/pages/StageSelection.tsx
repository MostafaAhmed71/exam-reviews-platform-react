import { Layout } from '@/components/Layout';
import { setStage, navigateBack } from '@/lib/navigation';
import './StageSelection.css';

export function StageSelection() {
    const stages = [
        {
            id: 'middle',
            name: 'المرحلة المتوسطة',
            icon: '/school.png',
        },
        {
            id: 'high',
            name: 'المرحلة الثانوية',
            icon: '/school (1).png',
        },
        
    ];

    const handleStageSelect = (stageId: 'middle' | 'high') => {
        setStage(stageId);
    };

    return (
        <Layout showFooter={false}>
            <div className="stage-selection">
                {/* Background */}
                <div className="stage-background"></div>

                {/* Main Glass Card */}
                <div className="stage-main-card">
                    <header className="stage-header">
                    <button 
                        className="stage-back-button"
                        onClick={navigateBack}
                        aria-label="رجوع"
                    >
                        <span className="back-icon">←</span>
                        <span className="back-text">رجوع</span>
                    </button>

                    {/* Title */}
                    <h1 className="stage-title">اختر المرحلة</h1>
                    </header>

                    {/* Stage Cards */}
                    <div className="stage-cards-container">
                        {stages.map((stage, index) => (
                            <button
                                type="button"
                                key={stage.id}
                                className="stage-card"
                                onClick={() => handleStageSelect(stage.id as 'middle' | 'high')}
                            >
                                <span className="stage-index" aria-hidden="true">0{index + 1}</span>
                                <div className="stage-card-content">
                                    <div className="stage-icon-wrapper">
                                        <img 
                                            src={stage.icon} 
                                            alt={stage.name}
                                            className="stage-icon"
                                        />
                                    </div>
                                    <h2 className="stage-name">{stage.name}</h2>
                                    <span className="stage-enter">استكشف مراجعاتك <span aria-hidden="true">↗</span></span>
                                </div>
                            </button>
                        ))}
                    </div>

                </div>
            </div>
        </Layout>
    );
}

