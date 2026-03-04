import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface DownloadLog {
  log_id: string;
  shipment_id: string;
  user_email: string;
  user_role: string;
  ip_address: string;
  downloaded_at: string;
}

export default function DownloadLogsPage() {
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['agency-download-logs', page],
    queryFn: () => api.get('/agency/download-logs', { params: { limit, offset: page * limit } }).then((res) => res.data),
  });

  const logs: DownloadLog[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">다운로드 이력</h2>
          <p className="text-sm text-txt-muted mt-1">자산 파일 다운로드 기록 (총 {total}건)</p>
        </div>
      </div>

      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-geo-border">
              <th className="px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">출고 ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">사용자</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">권한</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">IP</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">다운로드 일시</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-6 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-txt-secondary">
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2"/><path d="M12 2a10 10 0 019.95 9" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
                  로딩 중...
                </div>
              </td></tr>
            )}
            {!isLoading && logs.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-txt-muted">다운로드 이력이 없습니다.</td></tr>
            )}
            {!isLoading && logs.map((log) => (
              <tr key={log.log_id} className="border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
                <td className="px-5 py-3 text-sm font-mono text-txt-primary">{log.shipment_id?.substring(0, 12)}...</td>
                <td className="px-5 py-3 text-sm text-txt-secondary">{log.user_email || '-'}</td>
                <td className="px-5 py-3 text-center">
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-status-blue-dim text-status-blue">
                    {log.user_role === 'agency_admin' ? '기획사' : log.user_role || '-'}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm font-mono text-txt-muted text-center">{log.ip_address || '-'}</td>
                <td className="px-5 py-3 text-sm text-txt-muted text-center">
                  {log.downloaded_at ? new Date(log.downloaded_at).toLocaleString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-3 py-1.5 text-sm border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary disabled:opacity-30 transition-all">
            이전
          </button>
          <span className="text-sm text-txt-muted">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-3 py-1.5 text-sm border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary disabled:opacity-30 transition-all">
            다음
          </button>
        </div>
      )}
    </div>
  );
}
