import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface Dealer {
  dealer_id: string;
  name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  created_at: string;
}

export default function DealersPage() {
  const queryClient = useQueryClient();
  const { show: showToast } = useToastStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', contact_name: '', contact_email: '', contact_phone: '', address: '' });
  const [deleteTarget, setDeleteTarget] = useState<Dealer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['agency-dealers'],
    queryFn: () => api.get('/agency/dealers').then((res) => res.data),
  });

  const dealers: Dealer[] = data?.items || [];

  const addMutation = useMutation({
    mutationFn: (data: any) => api.post('/agency/dealers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-dealers'] });
      showToast('거래처가 추가되었습니다.', 'success');
      setShowAddModal(false);
      setForm({ name: '', contact_name: '', contact_email: '', contact_phone: '', address: '' });
    },
    onError: () => showToast('거래처 추가에 실패했습니다.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete('/agency/dealers/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agency-dealers'] });
      showToast('거래처가 삭제되었습니다.', 'success');
      setDeleteTarget(null);
    },
    onError: () => showToast('거래처 삭제에 실패했습니다.', 'error'),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { showToast('거래처명을 입력해주세요.', 'error'); return; }
    addMutation.mutate(form);
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">거래처 관리</h2>
          <p className="text-sm text-txt-muted mt-1">사전 등록된 거래처만 자산 전달 가능</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 transition-all">
          + 거래처 추가
        </button>
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-geo-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">거래처명</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">담당자</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">이메일</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">전화번호</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">등록일</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-txt-muted">
                <div className="flex items-center justify-center gap-2 text-txt-secondary">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/><path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                  로딩 중...
                </div>
              </td></tr>
            )}
            {!isLoading && dealers.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-txt-muted">등록된 거래처가 없습니다.</td></tr>
            )}
            {!isLoading && dealers.map((d) => (
              <tr key={d.dealer_id} className="border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-txt-primary">{d.name}</td>
                <td className="px-5 py-3 text-sm text-txt-secondary">{d.contact_name || '-'}</td>
                <td className="px-5 py-3 text-sm text-txt-secondary">{d.contact_email || '-'}</td>
                <td className="px-5 py-3 text-sm text-txt-secondary">{d.contact_phone || '-'}</td>
                <td className="px-5 py-3 text-sm text-txt-muted text-center">{new Date(d.created_at).toLocaleDateString('ko-KR')}</td>
                <td className="px-5 py-3 text-center">
                  <button onClick={() => setDeleteTarget(d)} className="text-xs px-3 py-1.5 rounded-lg text-status-red border border-status-red/30 hover:bg-status-red/10 transition-all">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-geo-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-txt-primary">거래처 추가</h3>
              <button onClick={() => setShowAddModal(false)} className="text-txt-muted hover:text-txt-primary text-xl">&times;</button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-txt-muted mb-1">거래처명 *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none" placeholder="거래처명" />
              </div>
              <div>
                <label className="block text-xs text-txt-muted mb-1">담당자명</label>
                <input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none" placeholder="담당자명" />
              </div>
              <div>
                <label className="block text-xs text-txt-muted mb-1">이메일</label>
                <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none" placeholder="email@example.com" />
              </div>
              <div>
                <label className="block text-xs text-txt-muted mb-1">전화번호</label>
                <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none" placeholder="010-0000-0000" />
              </div>
              <div>
                <label className="block text-xs text-txt-muted mb-1">주소</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none" placeholder="주소" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 px-4 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all">취소</button>
                <button type="submit" disabled={addMutation.isPending} className="flex-1 px-4 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all">
                  {addMutation.isPending ? '추가 중...' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-sm p-6">
            <p className="text-sm text-txt-secondary mb-2">"{deleteTarget.name}" 거래처를 삭제하시겠습니까?</p>
            <p className="text-xs text-status-red mb-4">삭제된 거래처는 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2 text-sm text-txt-secondary border border-geo-border rounded-lg hover:border-geo-border-hover transition-all">취소</button>
              <button onClick={() => deleteMutation.mutate(deleteTarget.dealer_id)} disabled={deleteMutation.isPending} className="flex-1 px-4 py-2 text-sm text-white bg-status-red rounded-lg hover:bg-status-red/80 disabled:opacity-50 transition-all">
                {deleteMutation.isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
