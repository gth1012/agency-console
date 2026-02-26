import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface Asset {
  asset_id: string;
  edition: string;
  status: string;
}

export default function ActivationPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { show: addToast } = useToastStore();
  const [selectedSeries, setSelectedSeries] = useState<string>(searchParams.get('series') || '');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const { data: seriesList } = useQuery({
    queryKey: ['agency-series'],
    queryFn: () => api.get('/agency/series').then((res) => res.data).catch(() => []),
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['agency-series-assets', selectedSeries],
    queryFn: () => api.get('/agency/series/' + selectedSeries + '/assets').then((res) => res.data).catch(() => []),
    enabled: !!selectedSeries,
  });

  useEffect(() => {
    setSelectedAssets([]);
  }, [selectedSeries]);

  const unregisteredAssets = assets?.filter((a: Asset) => a.status === 'UNREGISTERED') || [];
  const registeredAssets = assets?.filter((a: Asset) => a.status !== 'UNREGISTERED') || [];

  const activateMutation = useMutation({
    mutationFn: (assetIds: string[]) => api.post('/agency/activate', { asset_ids: assetIds }),
    onSuccess: () => {
      addToast('정품등록이 완료되었습니다.', 'success');
      setSelectedAssets([]);
      queryClient.invalidateQueries({ queryKey: ['agency-series-assets', selectedSeries] });
      queryClient.invalidateQueries({ queryKey: ['agency-series'] });
      queryClient.invalidateQueries({ queryKey: ['agency-dashboard'] });
    },
    onError: () => {
      addToast('정품등록에 실패했습니다.', 'error');
    },
  });

  const toggleAsset = (id: string) => {
    setSelectedAssets((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedAssets.length === unregisteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(unregisteredAssets.map((a: Asset) => a.asset_id));
    }
  };

  const handleActivate = () => {
    if (selectedAssets.length === 0) return;
    if (!window.confirm(selectedAssets.length + '개 자산을 정품등록 하시겠습니까?')) return;
    activateMutation.mutate(selectedAssets);
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-txt-primary">정품등록</h2>
          <p className="text-sm text-txt-muted mt-1">판매된 수량을 선택하여 등록합니다</p>
        </div>
        {selectedAssets.length > 0 && (
          <button
            onClick={handleActivate}
            disabled={activateMutation.isPending}
            className="px-5 py-2.5 rounded-lg bg-status-blue text-white text-sm font-medium hover:bg-status-blue/90 disabled:opacity-50 transition-all"
          >
            {activateMutation.isPending ? '처리중...' : '선택 정품등록 실행 (' + selectedAssets.length + '개)'}
          </button>
        )}
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-txt-secondary uppercase tracking-wider mb-2">시리즈 선택</label>
        <select
          value={selectedSeries}
          onChange={(e) => setSelectedSeries(e.target.value)}
          className="bg-geo-card border border-geo-border rounded-lg px-4 py-2.5 text-sm text-txt-primary focus:outline-none focus:border-status-blue min-w-[300px]"
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
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-txt-primary">자산 목록</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-yellow-dim text-status-yellow">
                {'미등록 ' + unregisteredAssets.length}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-green-dim text-status-green">
                {'등록 ' + registeredAssets.length}
              </span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-geo-border">
                <th className="px-6 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={unregisteredAssets.length > 0 && selectedAssets.length === unregisteredAssets.length}
                    onChange={toggleAll}
                    className="rounded border-geo-border"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">에디션</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-txt-secondary uppercase tracking-wider">상태</th>
              </tr>
            </thead>
            <tbody>
              {assetsLoading && (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-txt-muted">불러오는 중...</td></tr>
              )}
              {!assetsLoading && assets?.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-12 text-center text-txt-muted">자산이 없습니다.</td></tr>
              )}
              {!assetsLoading && assets?.map((a: Asset) => {
                const isUnregistered = a.status === 'UNREGISTERED';
                return (
                  <tr key={a.asset_id} className="border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
                    <td className="px-6 py-3">
                      {isUnregistered ? (
                        <input
                          type="checkbox"
                          checked={selectedAssets.includes(a.asset_id)}
                          onChange={() => toggleAsset(a.asset_id)}
                          className="rounded border-geo-border"
                        />
                      ) : (
                        <span className="text-txt-muted">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-mono text-txt-primary">{a.edition}</td>
                    <td className="px-6 py-3">
                      <span className={"text-[11px] px-2 py-0.5 rounded-md font-medium font-mono " + (isUnregistered ? "bg-status-yellow-dim text-status-yellow" : "bg-status-green-dim text-status-green")}>
                        {isUnregistered ? '미등록' : '등록'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

