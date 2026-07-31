import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { GhostBanner } from './components/GhostBanner';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentOnboardingTab } from './components/StudentOnboardingTab';
import { ExamScreen } from './components/ExamScreen';
import { PracticeScreen } from './components/PracticeScreen';
import { SheetSyncModal } from './components/SheetSyncModal';
import { QuizMakerModal } from './components/QuizMakerModal';
import { StudentAnalyticsModal } from './components/StudentAnalyticsModal';
import { LandingPage } from './components/LandingPage';
import { Test } from './types';

function MainAppContent() {
  const { profile, loading, loginAsUser } = useAuth();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Modals
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [isQuizMakerOpen, setIsQuizMakerOpen] = useState<boolean>(false);
  const [analyticsStudent, setAnalyticsStudent] = useState<{ name: string; rollNo: string } | null>(null);

  // Active Test / Practice Session State
  const [activeTest, setActiveTest] = useState<{ test: Test; mode: 'exam' | 'practice' } | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Initializing SaaS MockTest Platform...</p>
      </div>
    );
  }

  // Handle direct test start from Landing Page for unauthenticated visitors
  const handleStartTestAsGuest = async (test: Test, mode: 'exam' | 'practice') => {
    if (!profile) {
      await loginAsUser({
        uid: `guest_${Date.now()}`,
        email: 'guest.candidate@gmail.com',
        name: 'Guest Candidate',
        role: 'student',
        trade: test.trade_class || 'Electrician',
        status: 'active'
      });
    }
    setActiveTest({ test, mode });
  };

  // If user is signed out or no active profile, show Landing Page
  if (!profile) {
    return <LandingPage onStartTestDirectly={handleStartTestAsGuest} />;
  }

  // Active Exam or Practice Mode
  if (activeTest) {
    if (activeTest.mode === 'practice') {
      return <PracticeScreen test={activeTest.test} onClose={() => setActiveTest(null)} />;
    }
    return <ExamScreen test={activeTest.test} onClose={() => setActiveTest(null)} />;
  }

  const isSuperAdmin = profile?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased">
      {/* Ghost Banner when Impersonating */}
      <GhostBanner />

      {/* Global Navbar */}
      <Navbar
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenQuizMaker={() => setIsQuizMakerOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Role Dashboard or Onboarding Tab */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'onboard-students' && isSuperAdmin ? (
          <StudentOnboardingTab
            onOpenStudentAnalytics={(name, roll) => setAnalyticsStudent({ name, rollNo: roll })}
          />
        ) : (
          <>
            {isSuperAdmin ? (
              <SuperAdminDashboard
                onOpenSyncModal={() => setIsSyncModalOpen(true)}
                onOpenQuizMaker={() => setIsQuizMakerOpen(true)}
              />
            ) : (
              <StudentDashboard
                onStartTest={(test, mode) => setActiveTest({ test, mode })}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <SheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
      />

      <QuizMakerModal
        isOpen={isQuizMakerOpen}
        onClose={() => setIsQuizMakerOpen(false)}
        onTestCreated={() => window.dispatchEvent(new Event('tests_updated'))}
      />

      {analyticsStudent && (
        <StudentAnalyticsModal
          isOpen={!!analyticsStudent}
          studentName={analyticsStudent.name}
          rollNo={analyticsStudent.rollNo}
          onClose={() => setAnalyticsStudent(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
