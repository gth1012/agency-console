import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import ShipmentDetailModal from '../components/shipments/ShipmentDetailModal';

interface ShipmentAsset {
  asset_id: string;
  asset?: {
    geocapsule_status?: string;
  };
}

interface Shipment {
  shipment_id: string;
  display_id: string;
  series_id: string;
  asset_count: number;
  status: string;
  zip_sha256: string;
  shipped_at?: string;
  series?: {
    name: string;
  };
  shipmentAssets?: ShipmentAsset[];
}

export default function ShipmentManagementPage() {
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  // 출고 목록 조회 (SHIPPED 상태)
  const { data, isLoading } = useQuery({
    queryKey: ['shipments', 'SHIPPED'],
    queryFn: () =>
      api.get('/shipments?status=SHIPPED').then(res => res.data as Shipment[]),
  });

  const shipments = (data as Shipment[] | undefined);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCapsuleStatus = (shipment: Shipment) => {
    if (!shipment.shipmentAssets || shipment.shipmentAssets.length === 0) return null;
    const statuses = shipment.shipmentAssets.map(sa => sa.asset?.geocapsule_status);
    if (statuses.some(s => s === 'READY')) return 'READY';
    if (statuses.some(s => s === 'PENDING')) return 'PENDING';
    if (statuses.every(s => s === 'FAILED')) return 'FAILED';
    return null;
  };

  const getCapsuleStatusBadge = (status: string | null) => {
    switch (status) {
      case 'READY':
        return <span className="text-xs text-status-green">● READY</span>;
      case 'PENDING':
        return <span className="text-xs text-status-yellow">● 생성중</span>;
      case 'FAILED':
        return <span className="text-xs text-status-red">● 실패</span>;
      default:
        return <span className="text-xs text-txt-muted">-</span>;
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-txt-primary">출고 관리</h2>
        <p className="text-sm text-txt-muted mt-1">
          인증 캡슐 Claim 링크를 발급합니다.
          <span className="ml-2 text-xs text-status-yellow">Phase 1 — 임시 다운로드형</span>
        </p>
      </div>

      {/* 출고 목록 */}
      <div className="bg-geo-card border border-geo-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-txt-muted">로딩 중...</div>
        ) : !shipments || shipments.length === 0 ? (
          <div className="p-8 text-center text-txt-muted">출고 완료된 건이 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-geo-border bg-geo-main">
                <th className="px-5 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">출고번호</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">시리즈</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">자산 수</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">출고일시</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">인증 캡슐</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-txt-muted uppercase tracking-wider">액션</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment: Shipment) => {
                const capsuleStatus = getCapsuleStatus(shipment);
                return (
                  <tr
                    key={shipment.shipment_id}
                    className="border-b border-geo-border/50 last:border-0 hover:bg-geo-main/50 transition-colors"
                  >
                    <td className="px-5 py-3 font-mono text-txt-primary font-semibold">
                      {shipment.display_id}
                    </td>
                    <td className="px-5 py-3 text-txt-secondary">
                      {shipment.series?.name || '-'}
                    </td>
                    <td className="px-5 py-3 text-txt-primary font-mono">
                      {shipment.asset_count}개
                    </td>
                    <td className="px-5 py-3 text-txt-secondary">
                      {formatDate(shipment.shipped_at)}
                    </td>
                    <td className="px-5 py-3">
                      {getCapsuleStatusBadge(capsuleStatus)}
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setSelectedShipmentId(shipment.shipment_id)}
                        className="px-3 py-1.5 text-xs border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all"
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 상세 모달 */}
      {selectedShipmentId && (
        <ShipmentDetailModal
          shipmentId={selectedShipmentId}
          onClose={() => setSelectedShipmentId(null)}
        />
      )}
    </div>
  );
}

