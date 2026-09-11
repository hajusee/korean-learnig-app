import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Flame, Check, Calendar } from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [attendanceDates, setAttendanceDates] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const loadAttendance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('attendance')
      .select('check_in_date')
      .eq('user_id', user.id)
      .order('check_in_date', { ascending: false });

    const dates = data?.map((a) => a.check_in_date) ?? [];
    setAttendanceDates(dates);

    const today = new Date().toISOString().slice(0, 10);
    setCheckedInToday(dates.includes(today));

    setStreak(calculateStreak(dates));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  function calculateStreak(dates: string[]): number {
    if (dates.length === 0) return 0;
    const dateSet = new Set(dates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cursor = new Date(today);

    if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!dateSet.has(cursor.toISOString().slice(0, 10))) {
        return 0;
      }
    }

    let s = 0;
    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      s++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return s;
  }

  async function handleCheckIn() {
    if (!user || checkedInToday || checkingIn) return;
    setCheckingIn(true);

    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from('attendance')
      .insert({ user_id: user.id, check_in_date: today });

    if (!error) {
      setCheckedInToday(true);
      await loadAttendance();
    }
    setCheckingIn(false);
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const dateSet = new Set(attendanceDates);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Calendar className="w-6 h-6" /> Attendance
          <span className="font-korean text-lg text-stone-500">출석부</span>
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-20 text-stone-500">Loading...</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center">
                  <Flame className="w-8 h-8 text-orange-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-stone-900">{streak} days</div>
                  <div className="text-sm text-stone-500">Current streak</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-stone-900">{attendanceDates.length}</div>
                <div className="text-sm text-stone-500">Total check-ins</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200 mb-6">
            {checkedInToday ? (
              <div className="flex items-center gap-3 text-emerald-600">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">Checked in today!</div>
                  <div className="text-sm text-stone-500">See you tomorrow — keep it up!</div>
                </div>
              </div>
            ) : (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="w-full py-4 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {checkingIn ? 'Checking in...' : 'Check in for today'}
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-stone-200">
            <h2 className="font-semibold text-stone-900 mb-4">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <div className="grid grid-cols-7 gap-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-xs text-stone-400 font-medium py-1">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isChecked = dateSet.has(dateStr);
                const isToday = day === now.getDate();

                return (
                  <div
                    key={day}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${
                      isChecked
                        ? 'bg-emerald-500 text-white font-semibold'
                        : isToday
                        ? 'border-2 border-emerald-400 text-emerald-600 font-semibold'
                        : 'text-stone-400 hover:bg-stone-100'
                    }`}
                  >
                    {isChecked ? <Check className="w-4 h-4" /> : day}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
