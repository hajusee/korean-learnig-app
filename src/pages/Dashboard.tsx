import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { CalendarCheck, BookOpen, Brain, MessageCircle, Flame, TrendingUp, Award } from 'lucide-react';

interface DashboardStats {
  totalWords: number;
  studiedWords: number;
  quizCount: number;
  bestScore: number;
  attendanceStreak: number;
  totalAttendance: number;
}

export default function Dashboard({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalWords: 0,
    studiedWords: 0,
    quizCount: 0,
    bestScore: 0,
    attendanceStreak: 0,
    totalAttendance: 0,
  });

  useEffect(() => {
    (async () => {
      const [{ count: totalWords }, { count: studiedWords }, { data: quizData }, { data: attendance }] = await Promise.all([
        supabase.from('words').select('*', { count: 'exact', head: true }),
        supabase.from('study_progress').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('quiz_results').select('score_percentage').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('attendance').select('check_in_date').eq('user_id', user?.id).order('check_in_date', { ascending: false }),
      ]);

      const bestScore = quizData && quizData.length > 0 ? Math.max(...quizData.map((q) => q.score_percentage)) : 0;
      const streak = calculateStreak(attendance?.map((a) => a.check_in_date) ?? []);

      setStats({
        totalWords: totalWords ?? 0,
        studiedWords: studiedWords ?? 0,
        quizCount: quizData?.length ?? 0,
        bestScore,
        attendanceStreak: streak,
        totalAttendance: attendance?.length ?? 0,
      });
    })();
  }, [user?.id]);

  function calculateStreak(dates: string[]): number {
    if (dates.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateSet = new Set(dates.map((d) => d));

    let streak = 0;
    const cursor = new Date(today);

    if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
        return 0;
      }
    }

    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }

  const features = [
    { id: 'attendance', icon: CalendarCheck, title: 'Attendance', subtitle: '출석부', color: 'bg-emerald-500', desc: 'Check in daily and keep your streak going' },
    { id: 'vocabulary', icon: BookOpen, title: 'Vocabulary', subtitle: '한글 단어', color: 'bg-sky-500', desc: 'Learn Korean words by category' },
    { id: 'quiz', icon: Brain, title: 'Quiz', subtitle: '퀴즈', color: 'bg-amber-500', desc: 'Test your knowledge with quizzes' },
    { id: 'conversation', icon: MessageCircle, title: 'Conversation', subtitle: '회화', color: 'bg-rose-500', desc: 'Practice real-life Korean dialogues' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">
          안녕하세요, {profile?.display_name || 'Learner'}!
        </h1>
        <p className="text-stone-600 mt-1">Ready to learn Korean today?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Flame} label="Day Streak" value={stats.attendanceStreak} color="text-orange-500" />
        <StatCard icon={BookOpen} label="Words Studied" value={`${stats.studiedWords}/${stats.totalWords}`} color="text-sky-500" />
        <StatCard icon={Award} label="Best Score" value={`${stats.bestScore}%`} color="text-amber-500" />
        <StatCard icon={TrendingUp} label="Check-ins" value={stats.totalAttendance} color="text-emerald-500" />
      </div>

      <h2 className="text-lg font-semibold text-stone-900 mb-4">Learning Center</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature) => (
          <button
            key={feature.id}
            onClick={() => onNavigate(feature.id)}
            className="group bg-white rounded-2xl p-6 border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all text-left animate-slide-up"
          >
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${feature.color} text-white flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-semibold text-stone-900">{feature.title}</h3>
                  <span className="font-korean text-sm text-stone-500">{feature.subtitle}</span>
                </div>
                <p className="text-sm text-stone-600 mt-1">{feature.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-200">
      <Icon className={`w-5 h-5 mb-2 ${color}`} />
      <div className="text-2xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}
