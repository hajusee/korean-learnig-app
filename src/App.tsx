import { useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import AttendancePage from '@/pages/AttendancePage';
import VocabularyPage from '@/pages/VocabularyPage';
import QuizPage from '@/pages/QuizPage';
import ConversationPage from '@/pages/ConversationPage';
import ProgressPage from '@/pages/ProgressPage';
import CommunityPage from '@/pages/CommunityPage';
import AdminPage from '@/pages/AdminPage';
import { BookOpen, CalendarCheck, Brain, MessageCircle, Home, LogOut, ChartNoAxesColumnIncreasing, MessagesSquare, Shield } from 'lucide-react';

type Page = 'dashboard' | 'attendance' | 'vocabulary' | 'quiz' | 'conversation' | 'progress' | 'community' | 'admin';

function AppContent() {
  const { user, profile, loading, signOut } = useAuth();
  const [page, setPage] = useState<Page>('dashboard');

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-stone-500">Loading...</div></div>;
  if (!user) return <AuthPage />;

  const navItems: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: '홈', icon: Home },
    { id: 'attendance', label: '출석', icon: CalendarCheck },
    { id: 'vocabulary', label: '단어', icon: BookOpen },
    { id: 'quiz', label: '퀴즈', icon: Brain },
    { id: 'conversation', label: '회화', icon: MessageCircle },
    { id: 'progress', label: '진도', icon: ChartNoAxesColumnIncreasing },
    { id: 'community', label: '게시판', icon: MessagesSquare },
  ];

  function navigate(p: string) { setPage(p as Page); window.scrollTo(0, 0); }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('dashboard')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center"><BookOpen className="w-4 h-4" /></div>
            <span className="font-bold text-stone-900 hidden sm:inline">한국어 배우기</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {profile?.role === 'admin' && <button onClick={() => navigate('admin')} className={`p-2 rounded-lg transition-colors ${page === 'admin' ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`} title="관리자 페이지"><Shield className="w-4 h-4" /></button>}
            <div className="text-right hidden sm:block"><div className="text-sm font-medium text-stone-700">{profile?.display_name || 'Learner'}</div><div className="text-xs text-stone-400">{profile?.target_level || 'Beginner'}</div></div>
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-lg">{profile?.avatar_emoji || '🇰🇷'}</div>
            <button onClick={() => signOut()} className="text-stone-400 hover:text-stone-900 transition-colors p-1" title="Sign out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="pb-20">
        {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
        {page === 'attendance' && <AttendancePage />}
        {page === 'vocabulary' && <VocabularyPage />}
        {page === 'quiz' && <QuizPage />}
        {page === 'conversation' && <ConversationPage />}
        {page === 'progress' && <ProgressPage />}
        {page === 'community' && <CommunityPage />}
        {page === 'admin' && <AdminPage />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-20">
        <div className="max-w-5xl mx-auto flex items-center h-16 overflow-x-auto px-1">
          {navItems.map((item) => <button key={item.id} onClick={() => navigate(item.id)} className={`min-w-[68px] flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 ${page === item.id ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}><item.icon className={`w-5 h-5 ${page === item.id ? 'scale-110' : ''} transition-transform`} /><span className="text-[10px] font-medium">{item.label}</span></button>)}
        </div>
      </nav>
    </div>
  );
}

export default function App() { return <AuthProvider><AppContent /></AuthProvider>; }
