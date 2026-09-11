import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Bookmark, CheckCircle2, ChevronLeft, Circle, Volume2 } from 'lucide-react';

interface WordCategory { id: string; name: string; name_ko: string; icon: string; sort_order: number; }
interface Word { id: string; category_id: string; korean: string; english: string; romanization: string; example_ko: string; example_en: string; difficulty: number; }
interface Progress { word_id: string; is_bookmarked: boolean; is_completed: boolean; study_count: number; }

export default function VocabularyPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<WordCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [progress, setProgress] = useState<Map<string, Progress>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => { const { data } = await supabase.from('word_categories').select('*').order('sort_order'); if (data) setCategories(data as WordCategory[]); setLoading(false); })(); }, []);

  const loadWords = useCallback(async (categoryId: string) => {
    const { data } = await supabase.from('words').select('*').eq('category_id', categoryId).order('difficulty');
    if (data) setWords(data as Word[]);
    if (user) {
      const { data: p } = await supabase.from('study_progress').select('word_id, is_bookmarked, is_completed, study_count').eq('user_id', user.id);
      setProgress(new Map((p ?? []).map((x) => [x.word_id, x as Progress])));
    }
  }, [user]);

  function selectCategory(cat: WordCategory) { setSelectedCategory(cat); loadWords(cat.id); }

  async function saveProgress(word: Word, patch: Partial<Progress>) {
    if (!user) return;
    const current = progress.get(word.id);
    const next = { word_id: word.id, is_bookmarked: current?.is_bookmarked ?? false, is_completed: current?.is_completed ?? false, study_count: current?.study_count ?? 0, ...patch };
    setProgress((prev) => new Map(prev).set(word.id, next));
    const { error } = await supabase.from('study_progress').upsert({
      user_id: user.id,
      word_id: word.id,
      is_bookmarked: next.is_bookmarked,
      is_completed: next.is_completed,
      study_count: next.study_count,
      last_studied_at: new Date().toISOString(),
    }, { onConflict: 'user_id,word_id' });
    if (error) alert(error.message);
  }

  async function toggleBookmark(word: Word) { const p = progress.get(word.id); await saveProgress(word, { is_bookmarked: !(p?.is_bookmarked ?? false), study_count: Math.max(1, p?.study_count ?? 0) }); }
  async function toggleComplete(word: Word) { const p = progress.get(word.id); await saveProgress(word, { is_completed: !(p?.is_completed ?? false), study_count: (p?.study_count ?? 0) + 1 }); }

  function speak(text: string) { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.rate = 0.8; speechSynthesis.speak(u); } }
  if (loading) return <div className="text-center py-20 text-stone-500">Loading...</div>;

  if (selectedCategory) {
    const completed = words.filter((w) => progress.get(w.id)?.is_completed).length;
    return <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-stone-600 hover:text-stone-900 mb-4"><ChevronLeft className="w-4 h-4" /> 카테고리로</button>
      <div className="flex items-center justify-between gap-3 mb-6"><div className="flex items-center gap-3"><span className="text-3xl">{selectedCategory.icon}</span><div><h1 className="text-2xl font-bold">{selectedCategory.name}</h1><span className="text-stone-500">{selectedCategory.name_ko}</span></div></div><div className="text-sm text-stone-500">완료 {completed}/{words.length}</div></div>
      <div className="space-y-3">{words.map((word, i) => { const p = progress.get(word.id); return <div key={word.id} className={`bg-white rounded-2xl p-5 border transition-all animate-slide-up ${p?.is_completed ? 'border-emerald-200 bg-emerald-50/30' : 'border-stone-200'}`} style={{ animationDelay: `${i*40}ms` }}>
        <div className="flex items-start justify-between gap-4"><div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><span className="text-xl font-bold">{word.korean}</span><button onClick={() => speak(word.korean)} className="text-stone-400 hover:text-sky-500"><Volume2 className="w-4 h-4" /></button></div><div className="text-sm text-sky-600 mb-2">{word.romanization}</div><div className="text-stone-700 font-medium">{word.english}</div><div className="mt-3 pt-3 border-t border-stone-100"><div className="text-sm text-stone-600">{word.example_ko}</div><div className="text-xs text-stone-400 mt-0.5">{word.example_en}</div></div></div>
          <div className="flex flex-col gap-2"><button onClick={() => toggleBookmark(word)} className={`p-2 rounded-lg ${p?.is_bookmarked ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:bg-amber-50'}`} title="북마크"><Bookmark className="w-5 h-5" fill={p?.is_bookmarked ? 'currentColor' : 'none'} /></button><button onClick={() => toggleComplete(word)} className={`p-2 rounded-lg ${p?.is_completed ? 'text-emerald-600 bg-emerald-50' : 'text-stone-300 hover:bg-emerald-50'}`} title="학습 완료">{p?.is_completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}</button></div>
        </div></div>; })}</div>
    </div>;
  }

  return <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in"><div className="mb-6"><h1 className="text-2xl font-bold">Vocabulary <span className="text-lg text-stone-500 ml-2">한글 단어</span></h1><p className="text-stone-600 mt-1">단어를 공부한 뒤 ✓ 버튼을 누르면 학습 진도가 저장됩니다.</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{categories.map((cat,i)=><button key={cat.id} onClick={()=>selectCategory(cat)} className="group bg-white rounded-2xl p-5 border border-stone-200 hover:shadow-md text-left animate-slide-up" style={{animationDelay:`${i*40}ms`}}><div className="flex items-center gap-4"><span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span><div><div className="font-semibold">{cat.name}</div><div className="text-sm text-stone-500">{cat.name_ko}</div></div></div></button>)}</div></div>;
}
