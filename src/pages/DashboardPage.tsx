import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export default function DashboardPage() {
  return <AgencyDashboard />;
}

function AgencyDashboard() {
  const { data: series } = useQuery({
    queryKey: ['agency-series'],
    queryFn: () => api.get('/agency/series').then((res) => res.data).catch(() => []),
  });

  const { data: dashboard } = useQuery({
    queryKey: ['agency-dashboard'],
    queryFn: () => api.get('/agency/dashboard').then((res) => res.data).catch(() => null),
  });

  const totalSeries = dashboard?.totalSeries ?? series?.length ?? 0;
  const unregistered = dashboard?.unregisteredAssets ?? 0;
  const registered = dashboard?.registeredAssets ?? 0;
  const recentCount = dashboard?.recentRegistrations ?? 0;

  return (
    <div className="p-8 animate-fade-in">
      <div className="grid grid-cols-4 gap-4 mb-7">
        <KpiCard color="blue" label="입고 시리즈" value={totalSeries} />
        <KpiCard color="yellow" label="미등록 자산" value={unregistered} />
        <KpiCard color="green" label="등록 완료 자산" value={registered} />
        <KpiCard color="purple" label="최근 등록 건수" value={recentCount} sub="최근 7일" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 입고 시리즈</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-blue-dim text-status-blue">
              {series?.length ?? 0}건
            </span>
          </div>
          {series?.slice(0, 5).map((s: any) => (
            <div key={s.series_id || s.id} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-status-blue-dim text-status-blue flex items-center justify-center text-[15px]">S</div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{s.name}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">
                    {s.total_count ?? 0}개  {s.shipped_at ? new Date(s.shipped_at).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-green-dim text-status-green">
                입고
              </span>
            </div>
          ))}
          {(!series || series.length === 0) && (
            <div className="px-5 py-8 text-center text-txt-muted text-sm">입고된 시리즈가 없습니다</div>
          )}
        </div>

        <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden hover:border-geo-border-hover transition-colors">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border">
            <span className="text-sm font-semibold text-txt-primary">최근 등록 내역</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-purple-dim text-status-purple">
              {recentCount}건
            </span>
          </div>
          {dashboard?.recentActivations?.slice(0, 5).map((a: any, i: number) => (
            <div key={a.id || i} className="px-5 py-3.5 flex items-center justify-between border-b border-geo-border/50 last:border-0 hover:bg-geo-card-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-[34px] h-[34px] rounded-lg bg-status-purple-dim text-status-purple flex items-center justify-center text-[15px]">R</div>
                <div>
                  <div className="text-sm font-medium text-txt-primary">{a.series_name || a.edition}</div>
                  <div className="text-xs text-txt-muted font-mono mt-0.5">
                    {a.count ?? 1}건  {a.activated_at ? new Date(a.activated_at).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-medium font-mono bg-status-green-dim text-status-green">
                등록 완료
              </span>
            </div>
          ))}
          {(!dashboard?.recentActivations || dashboard.recentActivations.length === 0) && (
            <div className="px-5 py-8 text-center text-txt-muted text-sm">등록 내역이 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ color, label, value, sub }: { color: 'blue' | 'yellow' | 'green' | 'purple'; label: string; value: number; sub?: string }) {
  const colorMap = {
    blue: { bar: 'bg-status-blue', text: 'text-status-blue' },
    yellow: { bar: 'bg-status-yellow', text: 'text-status-yellow' },
    green: { bar: 'bg-status-green', text: 'text-status-green' },
    purple: { bar: 'bg-status-purple', text: 'text-status-purple' },
  };
  return (
    <div className="bg-geo-card border border-geo-border rounded-xl px-5 py-[18px] relative overflow-hidden hover:border-geo-border-hover hover:bg-geo-card-hover hover:-translate-y-px transition-all">
      <div className={"absolute top-0 left-0 right-0 h-[2px] " + colorMap[color].bar} />
      <div className="text-[11px] text-txt-secondary font-medium tracking-wide uppercase mb-2">{label}</div>
      <div className={"text-[32px] font-bold tracking-tight font-mono " + colorMap[color].text}>{value}</div>
      {sub && <div className="text-[11px] text-txt-muted font-mono mt-1">{sub}</div>}
    </div>
  );
}

