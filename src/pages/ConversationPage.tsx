import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageCircle, ChevronLeft, Volume2 } from 'lucide-react';

interface Scenario {
  id: string;
  title: string;
  title_ko: string;
  description: string;
  icon: string;
  sort_order: number;
}

interface Line {
  id: string;
  scenario_id: string;
  speaker: string;
  speaker_en: string;
  korean: string;
  english: string;
  romanization: string;
  sort_order: number;
}

export default function ConversationPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('conversation_scenarios')
        .select('*')
        .order('sort_order');

      if (data) setScenarios(data as Scenario[]);
      setLoading(false);
    })();
  }, []);

  async function selectScenario(s: Scenario) {
    setSelectedScenario(s);
    const { data } = await supabase
      .from('conversation_lines')
      .select('*')
      .eq('scenario_id', s.id)
      .order('sort_order');

    if (data) setLines(data as Line[]);
  }

  function speak(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }

  if (loading) {
    return <div className="text-center py-20 text-stone-500">Loading...</div>;
  }

  if (selectedScenario) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
        <button
          onClick={() => setSelectedScenario(null)}
          className="flex items-center gap-1 text-stone-600 hover:text-stone-900 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to scenarios
        </button>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{selectedScenario.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{selectedScenario.title}</h1>
            <span className="font-korean text-stone-500">{selectedScenario.title_ko}</span>
          </div>
        </div>

        <p className="text-stone-600 text-sm mb-6">{selectedScenario.description}</p>

        <div className="space-y-3">
          {lines.map((line, i) => {
            const isYou = line.speaker === 'A';

            return (
              <div
                key={line.id}
                className={`flex ${isYou ? 'justify-end' : 'justify-start'} animate-slide-up`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className={`max-w-[85%] rounded-2xl p-4 ${
                  isYou
                    ? 'bg-rose-500 text-white rounded-tr-sm'
                    : 'bg-white border border-stone-200 text-stone-900 rounded-tl-sm'
                }`}>
                  <div className={`text-xs font-medium mb-1 ${
                    isYou ? 'text-rose-100' : 'text-stone-400'
                  }`}>
                    {line.speaker_en}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-korean text-lg font-bold">{line.korean}</span>
                    <button
                      onClick={() => speak(line.korean)}
                      className={isYou ? 'text-rose-200 hover:text-white' : 'text-stone-400 hover:text-rose-500'}
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className={`text-sm ${isYou ? 'text-rose-100' : 'text-sky-600'}`}>
                    {line.romanization}
                  </div>
                  <div className={`text-sm mt-1 ${isYou ? 'text-rose-50' : 'text-stone-600'}`}>
                    {line.english}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-sm text-amber-800">
            Tip: Listen to each line with the speaker icon, then try repeating it out loud. Focus on matching the rhythm and intonation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" /> Conversation
          <span className="font-korean text-lg text-stone-500">회화</span>
        </h1>
        <p className="text-stone-600 mt-1">Practice Korean with real-life dialogues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((s, i) => (
          <button
            key={s.id}
            onClick={() => selectScenario(s)}
            className="group bg-white rounded-2xl p-5 border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all text-left animate-slide-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl group-hover:scale-110 transition-transform">{s.icon}</span>
              <div>
                <div className="font-semibold text-stone-900">{s.title}</div>
                <div className="font-korean text-sm text-stone-500">{s.title_ko}</div>
                <div className="text-xs text-stone-500 mt-1">{s.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
