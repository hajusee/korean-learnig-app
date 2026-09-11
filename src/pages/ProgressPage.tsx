import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BookOpenCheck, Brain, CalendarCheck, Flame } from 'lucide-react';

interface Stats {
  totalWords: number;
  completedWords: number;
  studiedWords: number;
  quizzes: number;
  bestScore: number;
  attendance: number;
  streak: number;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalWords: 0, completedWords: 0, studiedWords: 0, quizzes: 0, bestScore: 0, attendance: 0, streak: 0 });
  const [recent, setRecent] = useState<{ score_percentage: number; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: totalWords }, { data: progress }, { data: quizzes }, { data: attendance }] = await Promise.all([
        supabase.from('words').select('*', { count: 'exact', head: true }),
        supabase.from('study_progress').select('is_completed, study_count').eq('user_id', user.id),
        supabase.from('quiz_results').select('score_percentage, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('attendance').select('check_in_date').eq('user_id', user.id).order('check_in_date', { ascending: false }),
      ]);

      const dates = attendance?.map((a) => a.check_in_date) ?? [];
      setStats({
        totalWords: totalWords ?? 0,
        completedWords: progress?.filter((p) => p.is_completed).length ?? 0,
        studiedWords: progress?.length ?? 0,
        quizzes: quizzes?.length ?? 0,
        bestScore: quizzes?.length ? Math.max(...quizzes.map((q) => q.score_percentage)) : 0,
        attendance: dates.length,
        streak: calculateStreak(dates),
      });
      setRecent((quizzes ?? []).slice(0, 5));
      setLoading(false);
    })();
  }, [user]);

  const percent = stats.totalWords ? Math.round((stats.completedWords / stats.totalWords) * 100) : 0;
  if (loading) return <div className="text-center py-20 text-stone-500">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-stone-900">학습 진도</h1>
      <p className="text-stone-600 mt-1">내가 공부한 기록이 자동으로 저장됩니다.</p>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 mt-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="text-sm text-stone-500">단어 학습 완료</div>
            <div className="text-3xl font-bold text-stone-900 mt-1">{percent}%</div>
          </div>
          <div className="text-sm text-stone-500">{stats.completedWords} / {stats.totalWords} 단어</div>
        </div>
        <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-stone-900 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        <Card icon={BookOpenCheck} label="공부한 단어" value={stats.studiedWords} />
        <Card icon={Brain} label="퀴즈 응시" value={stats.quizzes} />
        <Card icon={Flame} label="연속 출석" value={`${stats.streak}일`} />
        <Card icon={CalendarCheck} label="총 출석" value={`${stats.attendance}일`} />
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 mt-4">
        <h2 className="font-semibold text-stone-900">퀴즈 기록</h2>
        <div className="text-sm text-stone-500 mt-1">최고 점수 {stats.bestScore}%</div>
        <div className="mt-4 space-y-2">
          {recent.length === 0 ? <p className="text-sm text-stone-400">아직 퀴즈 기록이 없습니다.</p> : recent.map((r, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
              <span className="text-sm text-stone-500">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
              <span className="font-semibold">{r.score_percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return <div className="bg-white border border-stone-200 rounded-2xl p-4"><Icon className="w-5 h-5 text-stone-500" /><div className="text-2xl font-bold mt-2">{value}</div><div className="text-xs text-stone-500 mt-1">{label}</div></div>;
}
