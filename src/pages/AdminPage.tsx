import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Bell, Plus, Shield, Trash2, Users } from 'lucide-react';

interface Notice { id: string; title: string; content: string; is_pinned: boolean; created_at: string; }
interface Member { id: string; display_name: string; target_level: string; role: 'member' | 'admin'; created_at: string; }
interface Post { id: string; title: string; user_id: string; created_at: string; author_name: string; }

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'notice' | 'members' | 'posts'>('notice');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);

  async function load() {
    const [{ data: n }, { data: m }, { data: p }] = await Promise.all([
      supabase.from('notices').select('*').order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, display_name, target_level, role, created_at').order('created_at', { ascending: false }),
      supabase.from('board_posts').select('id, title, user_id, author_name, created_at').order('created_at', { ascending: false }),
    ]);
    setNotices((n ?? []) as Notice[]); setMembers((m ?? []) as Member[]); setPosts((p ?? []) as Post[]);
  }

  useEffect(() => { if (profile?.role === 'admin') load(); }, [profile?.role]);
  if (profile?.role !== 'admin') return <div className="text-center py-20 text-stone-500">관리자만 접근할 수 있습니다.</div>;

  async function addNotice(e: React.FormEvent) {
    e.preventDefault(); if (!user || !title.trim() || !content.trim()) return;
    const { error } = await supabase.from('notices').insert({ title: title.trim(), content: content.trim(), is_pinned: pinned, author_id: user.id });
    if (!error) { setTitle(''); setContent(''); setPinned(false); await load(); } else alert(error.message);
  }
  async function remove(table: 'notices' | 'board_posts', id: string) {
    if (!confirm('삭제할까요?')) return;
    const { error } = await supabase.from(table).delete().eq('id', id); if (!error) load(); else alert(error.message);
  }
  async function setRole(id: string, role: 'member' | 'admin') {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id); if (!error) load(); else alert(error.message);
  }

  return <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
    <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center"><Shield className="w-5 h-5" /></div><div><h1 className="text-2xl font-bold">관리자 페이지</h1><p className="text-stone-500 text-sm">공지, 회원, 게시판을 관리합니다.</p></div></div>
    <div className="grid grid-cols-3 gap-2 mt-6 bg-stone-100 p-1 rounded-xl">
      <button onClick={()=>setTab('notice')} className={`py-2.5 rounded-lg text-sm ${tab==='notice'?'bg-white shadow-sm':''}`}><Bell className="w-4 h-4 inline mr-1" />공지</button>
      <button onClick={()=>setTab('members')} className={`py-2.5 rounded-lg text-sm ${tab==='members'?'bg-white shadow-sm':''}`}><Users className="w-4 h-4 inline mr-1" />회원</button>
      <button onClick={()=>setTab('posts')} className={`py-2.5 rounded-lg text-sm ${tab==='posts'?'bg-white shadow-sm':''}`}>게시글</button>
    </div>

    {tab === 'notice' && <div className="grid md:grid-cols-2 gap-4 mt-4">
      <form onSubmit={addNotice} className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" />공지 작성</h2><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="공지 제목" className="w-full px-4 py-3 border rounded-xl" /><textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="공지 내용" rows={8} className="w-full px-4 py-3 border rounded-xl resize-none" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)} /> 중요 공지로 고정</label><button className="w-full py-3 bg-stone-900 text-white rounded-xl">공지 등록</button></form>
      <div className="bg-white border rounded-2xl overflow-hidden">{notices.map(n=><div key={n.id} className="p-4 border-b last:border-0 flex justify-between gap-3"><div><div className="font-medium">{n.title} {n.is_pinned && <span className="text-xs text-amber-600">[고정]</span>}</div><div className="text-xs text-stone-400 mt-1">{new Date(n.created_at).toLocaleDateString('ko-KR')}</div></div><button onClick={()=>remove('notices', n.id)} className="text-rose-500"><Trash2 className="w-4 h-4" /></button></div>)}</div>
    </div>}

    {tab === 'members' && <div className="bg-white border rounded-2xl overflow-x-auto mt-4"><table className="w-full text-sm"><thead className="bg-stone-50 text-stone-500"><tr><th className="text-left p-3">이름</th><th className="text-left p-3">레벨</th><th className="text-left p-3">가입일</th><th className="text-left p-3">권한</th></tr></thead><tbody>{members.map(m=><tr key={m.id} className="border-t"><td className="p-3 font-medium">{m.display_name || '회원'}</td><td className="p-3">{m.target_level}</td><td className="p-3">{new Date(m.created_at).toLocaleDateString('ko-KR')}</td><td className="p-3"><select value={m.role} onChange={e=>setRole(m.id, e.target.value as 'member'|'admin')} disabled={m.id===user?.id} className="border rounded-lg px-2 py-1"><option value="member">회원</option><option value="admin">관리자</option></select></td></tr>)}</tbody></table></div>}

    {tab === 'posts' && <div className="bg-white border rounded-2xl overflow-hidden mt-4">{posts.map(p=><div key={p.id} className="p-4 border-b last:border-0 flex justify-between gap-3"><div><div className="font-medium">{p.title}</div><div className="text-xs text-stone-400 mt-1">{p.author_name || '회원'} · {new Date(p.created_at).toLocaleDateString('ko-KR')}</div></div><button onClick={()=>remove('board_posts', p.id)} className="text-rose-500"><Trash2 className="w-4 h-4" /></button></div>)}</div>}
  </div>;
}
