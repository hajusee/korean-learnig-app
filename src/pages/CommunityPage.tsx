import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Bell, MessageSquare, Plus, Trash2, X } from 'lucide-react';

interface Notice { id: string; title: string; content: string; is_pinned: boolean; created_at: string; }
interface Post { id: string; user_id: string; title: string; content: string; created_at: string; author_name: string; }

export default function CommunityPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'notice' | 'board'>('notice');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selected, setSelected] = useState<Notice | Post | null>(null);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  async function load() {
    const [{ data: noticeData }, { data: postData }] = await Promise.all([
      supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('board_posts').select('*').order('created_at', { ascending: false }),
    ]);
    setNotices((noticeData ?? []) as Notice[]);
    setPosts((postData ?? []) as Post[]);
  }

  useEffect(() => { load(); }, []);

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !content.trim()) return;
    const { error } = await supabase.from('board_posts').insert({ user_id: user.id, title: title.trim(), content: content.trim() });
    if (!error) {
      setTitle(''); setContent(''); setWriting(false); await load();
    } else alert(error.message);
  }

  async function deletePost(id: string) {
    if (!confirm('이 게시글을 삭제할까요?')) return;
    const { error } = await supabase.from('board_posts').delete().eq('id', id);
    if (!error) { setSelected(null); await load(); } else alert(error.message);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-stone-900">커뮤니티</h1><p className="text-stone-600 mt-1">공지사항과 회원 게시판을 확인하세요.</p></div>
        {tab === 'board' && <button onClick={() => setWriting(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium"><Plus className="w-4 h-4" /> 글쓰기</button>}
      </div>

      <div className="flex gap-2 bg-stone-100 p-1 rounded-xl mt-6">
        <button onClick={() => setTab('notice')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${tab === 'notice' ? 'bg-white shadow-sm' : 'text-stone-500'}`}><Bell className="w-4 h-4 inline mr-1" />공지사항</button>
        <button onClick={() => setTab('board')} className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${tab === 'board' ? 'bg-white shadow-sm' : 'text-stone-500'}`}><MessageSquare className="w-4 h-4 inline mr-1" />회원 게시판</button>
      </div>

      <div className="bg-white border border-stone-200 rounded-2xl mt-4 overflow-hidden">
        {(tab === 'notice' ? notices : posts).length === 0 && <div className="p-10 text-center text-stone-400">등록된 글이 없습니다.</div>}
        {tab === 'notice' ? notices.map((n) => (
          <button key={n.id} onClick={() => setSelected(n)} className="w-full text-left p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50">
            <div className="flex gap-2 items-center"><span className="font-semibold text-stone-900">{n.title}</span>{n.is_pinned && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">중요</span>}</div>
            <div className="text-xs text-stone-400 mt-1">{new Date(n.created_at).toLocaleDateString('ko-KR')}</div>
          </button>
        )) : posts.map((p) => (
          <button key={p.id} onClick={() => setSelected(p)} className="w-full text-left p-4 border-b border-stone-100 last:border-0 hover:bg-stone-50">
            <div className="font-semibold text-stone-900">{p.title}</div>
            <div className="text-xs text-stone-400 mt-1">{p.author_name || '회원'} · {new Date(p.created_at).toLocaleDateString('ko-KR')}</div>
          </button>
        ))}
      </div>

      {writing && <Modal onClose={() => setWriting(false)}><form onSubmit={createPost} className="space-y-4"><h2 className="text-xl font-bold">게시글 작성</h2><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="제목" className="w-full px-4 py-3 border rounded-xl" /><textarea value={content} onChange={(e)=>setContent(e.target.value)} placeholder="내용" rows={8} className="w-full px-4 py-3 border rounded-xl resize-none" /><button className="w-full py-3 rounded-xl bg-stone-900 text-white font-medium">등록</button></form></Modal>}

      {selected && <Modal onClose={() => setSelected(null)}>
        <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{selected.title}</h2><div className="text-xs text-stone-400 mt-1">{new Date(selected.created_at).toLocaleString('ko-KR')}</div></div>
          {'user_id' in selected && (selected.user_id === user?.id || profile?.role === 'admin') && <button onClick={() => deletePost(selected.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>}
        </div>
        <div className="mt-5 whitespace-pre-wrap leading-7 text-stone-700">{selected.content}</div>
      </Modal>}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center"><div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 relative"><button onClick={onClose} className="absolute right-4 top-4 p-1 text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>{children}</div></div>;
}
