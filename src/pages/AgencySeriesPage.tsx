import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AgencySeriesPage() {
  const navigate = useNavigate();

  const { data: series, isLoading } = useQuery({
    queryKey: ['agency-series'],
    queryFn: () => api.get('/agency/series').then((res) => res.data).catch(() => []),
  });

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">시리즈</h2>
          <p className="text-sm text-txt-muted mt-1">입고된 시리즈 목록</p>
        </div>
      </div>
      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-geo-border">
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">시리즈명</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">총 수량</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">등록 수량</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">미등록 수량</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">입고일</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">액션</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-txt-muted">불러오는 중...</td>
              </tr>
            )}
            {!isLoading && (!series || series.length === 0) && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-txt-muted">입고된 시리즈가 없습니다.</td>
              </tr>
            )}
            {!isLoading && series?.map((s: any) => {
              const total = s.total_count ?? 0;
              const registered = s.registered_count ?? 0;
              const unregistered = total - registered;
              return (
                <tr key={s.series_id || s.id} className="border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-txt-primary">{s.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-txt-secondary">{total}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-mono text-status-green">{registered}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={"text-sm font-mono " + (unregistered > 0 ? "text-status-yellow" : "text-txt-muted")}>{unregistered}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-txt-muted font-mono">
                    {s.shipped_at ? new Date(s.shipped_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {unregistered > 0 && (
                      <button
                        onClick={() => navigate('/activation?series=' + (s.series_id || s.id))}
                        className="text-xs px-3 py-1.5 rounded-lg bg-status-blue-dim text-status-blue font-medium hover:bg-status-blue hover:text-white transition-all"
                      >
                        정품등록
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
