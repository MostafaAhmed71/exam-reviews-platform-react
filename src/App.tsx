import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { currentScreen, navigateToAdmin } from './lib/navigation';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { TermsScreen } from './pages/TermsScreen';
import { StageSelection } from './pages/StageSelection';
import { GradeSelection } from './pages/GradeSelection';
import { ReviewTypeSelection } from './pages/ReviewTypeSelection';
import { SubjectSelection } from './pages/SubjectSelection';
import { ScheduleScreen } from './pages/ScheduleScreen';
import { VideosScreen } from './pages/VideosScreen';
import { ElectronicScreen } from './pages/ElectronicScreen';
import { AdminUpload } from './pages/AdminUpload';
import { MaterialsManagement } from './pages/MaterialsManagement';
import { SubjectsManagement } from './pages/SubjectsManagement';
import { ElectronicTestsManagement } from './pages/ElectronicTestsManagement';
import { TestBuilder } from './pages/TestBuilder';
import { TakeTestScreen } from './pages/TakeTestScreen';
import { MyTestsScreen } from './pages/MyTestsScreen';
import { AddQuestionScreen } from './pages/AddQuestionScreen';
import { SubjectVideosScreen } from './pages/SubjectVideosScreen';
import { SubjectTestsScreen } from './pages/SubjectTestsScreen';
import { SubjectMaterialsScreen } from './pages/SubjectMaterialsScreen';
import { StatisticsScreen } from './pages/StatisticsScreen';
import { QuestionReviewScreen } from './pages/QuestionReviewScreen';
import { LiveStreamScreen } from './pages/LiveStreamScreen';
import { LiveStreamSettingsScreen } from './pages/LiveStreamSettingsScreen';
import { TestDataScreen } from './pages/TestDataScreen';
import { StudentManagement } from './pages/StudentManagement';
import { SavedVideosScreen } from './pages/SavedVideosScreen';
import { AdminSeatLookup } from './pages/AdminSeatLookup';
import { FloatingTelegramBot } from './components/FloatingTelegramBot';
import './index.css';

const showTelegramFloatingBot =
    import.meta.env.VITE_SHOW_TELEGRAM_BOT === 'true';

function App() {
  const screen = useStore(currentScreen);
  const [showTestScreen, setShowTestScreen] = useState(window.location.hash.startsWith('#test/'));
  const [showTestDataScreen, setShowTestDataScreen] = useState(window.location.hash === '#tata');
  const [showAdminSeatLookup, setShowAdminSeatLookup] = useState(window.location.hash.startsWith('#admin-seat'));

  // Check for admin access and test links via URL hash
  useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash;
      // Access admin via #mo only (admin screens don't require activation)
      if (hash === '#mo') {
        navigateToAdmin();
        setShowTestScreen(false);
      }
      // Test links: #test/{token} (test screens don't require activation)
      else if (hash.startsWith('#test/')) {
        setShowTestScreen(true);
        setShowTestDataScreen(false);
      }
      // Test data screen: #tata
      else if (hash === '#tata') {
        setShowTestDataScreen(true);
        setShowTestScreen(false);
        setShowAdminSeatLookup(false);
      }
      // Admin seat lookup: #admin-seat or #admin-seat/{national_id}
      else if (hash.startsWith('#admin-seat')) {
        setShowAdminSeatLookup(true);
        setShowTestScreen(false);
        setShowTestDataScreen(false);
      }
      else {
        setShowTestScreen(false);
        setShowTestDataScreen(false);
        setShowAdminSeatLookup(false);
      }
    };

    checkHash();

    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);


  // If test screen should be shown, show it regardless of current screen
  if (showTestScreen) {
    return (
      <>
        <TakeTestScreen />
        {showTelegramFloatingBot && <FloatingTelegramBot />}
      </>
    );
  }

  // If test data screen should be shown, show it regardless of current screen
  if (showTestDataScreen) {
    return (
      <>
        <TestDataScreen />
        {showTelegramFloatingBot && <FloatingTelegramBot />}
      </>
    );
  }

  // If admin seat lookup screen should be shown, show it regardless of current screen
  if (showAdminSeatLookup) {
    return (
      <>
        <AdminSeatLookup />
        {showTelegramFloatingBot && <FloatingTelegramBot />}
      </>
    );
  }

  return (
    <>
      {screen === 'welcome' && <WelcomeScreen />}
      {screen === 'terms' && <TermsScreen />}
      {screen === 'stage' && <StageSelection />}
      {screen === 'grade' && <GradeSelection />}
      {screen === 'reviewType' && <ReviewTypeSelection />}
      {screen === 'subject' && <SubjectSelection />}
      {screen === 'schedule' && <ScheduleScreen />}
      {screen === 'videos' && <VideosScreen />}
      {screen === 'subject-videos' && <SubjectVideosScreen />}
      {screen === 'electronic' && <ElectronicScreen />}
      {screen === 'subject-tests' && <SubjectTestsScreen />}
      {screen === 'subject-materials' && <SubjectMaterialsScreen />}
      {screen === 'admin' && <AdminUpload />}
      {screen === 'materials' && <MaterialsManagement />}
      {screen === 'subjects-management' && <SubjectsManagement />}
      {screen === 'electronic-tests' && <ElectronicTestsManagement />}
      {screen === 'test-builder' && <TestBuilder />}
      {screen === 'my-tests' && <MyTestsScreen />}
      {screen === 'add-question' && <AddQuestionScreen />}
      {screen === 'statistics' && <StatisticsScreen />}
      {screen === 'question-review' && <QuestionReviewScreen />}
      {screen === 'live-stream' && <LiveStreamScreen />}
      {screen === 'live-stream-settings' && <LiveStreamSettingsScreen />}
      {screen === 'test-data' && <TestDataScreen />}
      {screen === 'student-management' && <StudentManagement />}
      {screen === 'saved-videos' && <SavedVideosScreen />}
      {showTelegramFloatingBot && <FloatingTelegramBot />}
    </>
  );
}

export default App;
