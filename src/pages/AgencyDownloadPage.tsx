import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface Asset {
  asset_id: string;
  dina_id?: string;
  edition: string;
  status: string;
}

export default function AgencyDownloadPage() {
  const { show: showToast } = useToastStore();
  const [selectedSeries, setSelectedSeries] = useState<string>('');
  const [downloading, setDownloading] = useState<string | null>(null);

  const { data: seriesList } = useQuery({
    queryKey: ['agency-series'],
    queryFn: () => api.get('/agency/series').then((res) => res.data).catch(() => []),
  });

  const { data: assets, isLoading } = useQuery({
    queryKey: ['agency-download-assets', selectedSeries],
    queryFn: () => api.get('/agency/series/' + selectedSeries + '/assets').then((res) => res.data).catch(() => []),
    enabled: !!selectedSeries,
  });

  const registeredAssets = assets?.filter((a: Asset) => a.status !== 'UNREGISTERED') || [];

  const handleDownload = async (assetId: string) => {
    try {
      setDownloading(assetId);
      const res = await api.get('/agency/download/' + assetId, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', assetId + '.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('다운로드가 완료되었습니다.', 'success');
    } catch {
      showToast('다운로드에 실패했습니다.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloading('all');
      const res = await api.get('/agency/download/series/' + selectedSeries, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'series-' + selectedSeries + '.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('시리즈 ZIP 다운로드가 완료되었습니다.', 'success');
    } catch {
      showToast('다운로드에 실패했습니다.', 'error');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">다운로드</h2>
          <p className="text-sm text-txt-muted mt-1">등록 완료된 자산 파일 다운로드</p>
        </div>
        {selectedSeries && registeredAssets.length > 0 && (
          <button
            onClick={handleDownloadAll}
            disabled={downloading === 'all'}
            className="px-5 py-2.5 rounded-lg bg-status-purple text-white text-sm font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
          >
            {downloading === 'all' ? '준비중...' : '시리즈 ZIP 다운로드 (' + registeredAssets.length + '개)'}
          </button>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-2">시리즈 선택</label>
        {/* [AC-017 수정] 셀렉트 스타일 통일 */}
        <select
          value={selectedSeries}
          onChange={(e) => setSelectedSeries(e.target.value)}
          className="bg-geo-card border border-geo-border rounded-lg px-4 py-2.5 text-sm text-txt-primary focus:outline-none focus:border-status-purple min-w-[300px]"
        >
          <option value="">시리즈를 선택하세요</option>
          {seriesList?.map((s: any) => (
            <option key={s.series_id || s.id} value={s.series_id || s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedSeries && (
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">등록 완료 자산</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-green-dim text-status-green">
              {registeredAssets.length + '개'}
            </span>
          </div>
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="w-[20%] px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">에디션</th>
                <th className="w-[35%] px-5 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">DINA ID</th>
                <th className="w-[20%] px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
                <th className="w-[25%] px-5 py-3 text-center text-xs font-semibold text-txt-secondary uppercase tracking-wider">다운로드</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-txt-muted">불러오는 중...</td></tr>
              )}
              {!isLoading && registeredAssets.length === 0 && (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-txt-muted">등록 완료된 자산이 없습니다. 정품등록을 먼저 진행하세요.</td></tr>
              )}
              {!isLoading && registeredAssets.map((a: Asset) => (
                <tr key={a.asset_id} className="border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
                  <td className="px-5 py-3 text-sm font-mono text-txt-primary">#{String(a.edition).replace(/^#/, '').padStart(5, '0')}</td>
                  <td className="px-5 py-3 text-sm font-mono text-status-blue truncate">{a.dina_id || '-'}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-status-green-dim text-status-green">등록완료</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <button
                      onClick={() => handleDownload(a.asset_id)}
                      disabled={downloading === a.asset_id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-status-purple/15 text-status-purple font-medium hover:bg-status-purple hover:text-white disabled:opacity-50 transition-all"
                    >
                      {downloading === a.asset_id ? '준비중...' : '다운로드'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
