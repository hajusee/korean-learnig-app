import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Brain, Check, X, RotateCcw, Trophy } from 'lucide-react';

interface QuizQuestion {
  id: string;
  word_id: string;
  question: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface ShuffledQuestion extends QuizQuestion {
  options: string[];
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuizPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pastResults, setPastResults] = useState<{ score_percentage: number; created_at: string }[]>([]);

  const loadQuiz = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('quiz_questions')
      .select('*');

    if (data && data.length > 0) {
      const shuffled = shuffleArray(data as QuizQuestion[]).slice(0, 10).map((q) => ({
        ...q,
        options: shuffleArray([q.correct_answer, q.wrong_answer_1, q.wrong_answer_2, q.wrong_answer_3]),
      }));
      setQuestions(shuffled);
    }
    setLoading(false);
  }, []);

  const loadPastResults = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('quiz_results')
      .select('score_percentage, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (data) setPastResults(data);
  }, [user]);

  useEffect(() => {
    loadQuiz();
    loadPastResults();
  }, [loadQuiz, loadPastResults]);

  function handleSelect(answer: string) {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    if (answer === questions[currentIndex].correct_answer) {
      setScore((s) => s + 1);
    }
  }

  async function handleNext() {
    if (currentIndex + 1 >= questions.length) {
      const finalScore = score;
      const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;

      if (user) {
        await supabase.from('quiz_results').insert({
          user_id: user.id,
          total_questions: questions.length,
          correct_answers: finalScore,
          score_percentage: percentage,
        });
        loadPastResults();
      }
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
    }
  }

  function restart() {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setFinished(false);
    loadQuiz();
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-stone-500">Loading quiz...</div>
      </div>
    );
  }

  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-scale-in">
        <div className="bg-white rounded-2xl p-8 border border-stone-200 text-center">
          <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
            percentage >= 80 ? 'bg-emerald-100' : percentage >= 50 ? 'bg-amber-100' : 'bg-rose-100'
          }`}>
            <Trophy className={`w-10 h-10 ${
              percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-rose-500'
            }`} />
          </div>
          <h2 className="text-2xl font-bold text-stone-900">Quiz Complete!</h2>
          <p className="text-stone-600 mt-2">You scored</p>
          <div className="text-5xl font-bold text-stone-900 my-4">{percentage}%</div>
          <p className="text-stone-600">
            {score} out of {questions.length} correct
          </p>

          <button
            onClick={restart}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
        </div>

        {pastResults.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-stone-200 mt-4">
            <h3 className="font-semibold text-stone-900 mb-3">Recent Attempts</h3>
            <div className="space-y-2">
              {pastResults.map((r, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                  <span className="text-sm text-stone-500">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <span className={`font-semibold ${
                    r.score_percentage >= 80 ? 'text-emerald-600' : r.score_percentage >= 50 ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {r.score_percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-stone-500">No quiz questions available.</div>
      </div>
    );
  }

  const current = questions[currentIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Brain className="w-6 h-6" /> Quiz
          <span className="font-korean text-lg text-stone-500">퀴즈</span>
        </h1>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-stone-500">
          Question {currentIndex + 1} of {questions.length}
        </span>
        <span className="text-sm font-medium text-stone-700">Score: {score}</span>
      </div>

      <div className="w-full h-2 bg-stone-200 rounded-full mb-6">
        <div
          className="h-full bg-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-4">
        <h2 className="text-xl font-semibold text-stone-900 text-center mb-6">
          {current.question}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {current.options.map((option, i) => {
            const isCorrect = option === current.correct_answer;
            const isSelected = option === selectedAnswer;
            const showResult = selectedAnswer !== null;

            return (
              <button
                key={i}
                onClick={() => handleSelect(option)}
                disabled={showResult}
                className={`flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all text-left ${
                  showResult
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : isSelected
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-stone-200 opacity-50'
                    : 'border-stone-200 hover:border-amber-400 hover:bg-amber-50'
                }`}
              >
                <span className="font-medium">{option}</span>
                {showResult && isCorrect && <Check className="w-5 h-5 text-emerald-500" />}
                {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {selectedAnswer && (
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors animate-fade-in"
        >
          {currentIndex + 1 >= questions.length ? 'See Results' : 'Next Question'}
        </button>
      )}
    </div>
  );
}
