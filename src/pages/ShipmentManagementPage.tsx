import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

interface ShipmentAsset {
  asset_id: string;
  asset?: {
    dina_id?: string;
    geocapsule_status?: string;
  };
}

interface Shipment {
  shipment_id: string;
  display_id: string;
  asset_count: number;
  status: string;
  shipped_at?: string;
  series?: {
    name: string;
  };
  shipmentAssets?: ShipmentAsset[];
}

// Bundle: one link per shipment
interface BundleClaimLink {
  type: 'BUNDLE';
  token_id: string;
  url: string;
  expiresAt: string;
  assetCount: number;
  issuedAt: string;
  sent: boolean;
}

// Individual: one link per asset
interface IndividualClaimLink {
  type: 'INDIVIDUAL';
  assets: Array<{
    asset_id: string;
    dina_id?: string;
    token_id: string;
    url: string;
    expiresAt: string;
    issuedAt: string;
    sent: boolean;
  }>;
}

type ClaimLinkState = BundleClaimLink | IndividualClaimLink;

export default function ShipmentManagementPage() {
  const toast = useToastStore();
  // key: shipment_id
  const [claimLinks, setClaimLinks] = useState<Record<string, ClaimLinkState>>({});
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [markingSent, setMarkingSent] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['agency-shipments'],
    queryFn: () => api.get('/agency/shipments').then(res => (res.data.items || res.data) as Shipment[]),
  });

  const shipments = data as Shipment[] | undefined;

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

  // Get all READY assets (filter — not find)
  const getCapsuleReadyAssets = (shipment: Shipment) => {
    if (!shipment.shipmentAssets || shipment.shipmentAssets.length === 0) return [];
    return shipment.shipmentAssets.filter(sa => sa.asset?.geocapsule_status === 'READY');
  };

  const getCapsuleStatusBadge = (shipment: Shipment) => {
    if (!shipment.shipmentAssets || shipment.shipmentAssets.length === 0)
      return <span className="text-xs text-txt-muted">-</span>;
    const statuses = shipment.shipmentAssets.map(sa => sa.asset?.geocapsule_status);
    if (statuses.every(s => s === 'READY'))
      return <span className="text-xs text-status-green">● READY</span>;
    if (statuses.some(s => s === 'PENDING'))
      return <span className="text-xs text-status-yellow">● 생성중</span>;
    if (statuses.every(s => s === 'FAILED'))
      return <span className="text-xs text-status-red">● 실패</span>;
    return <span className="text-xs text-txt-muted">-</span>;
  };

  // Bundle issuance with one-time warning
  const handleIssueBundleLink = async (shipment: Shipment) => {
    const confirmed = window.confirm(
      '【묶음 Claim 링크 발급 안내】\n\n' +
      'Claim 링크는 1회만 생성됩니다.\n' +
      '발송 완료 처리 또는 화면 이탈 후에는 다시 확인하거나 재발급할 수 없습니다.\n\n' +
      '계속 진행하시겠습니까?'
    );
    if (!confirmed) return;

    setIssuingId(`bundle-${shipment.shipment_id}`);
    try {
      const res = await api.post('/agency/capsule/claim/bundle/issue', {
        shipment_id: shipment.shipment_id,
      });
      setClaimLinks(prev => ({
        ...prev,
        [shipment.shipment_id]: {
          type: 'BUNDLE',
          token_id: res.data.token_id,
          url: res.data.claim_url,
          expiresAt: res.data.expires_at,
          assetCount: res.data.asset_count,
          issuedAt: new Date().toISOString(),
          sent: false,
        },
      }));
      toast.show('묶음 Claim 링크가 발급되었습니다.', 'success');
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msgMap: Record<string, string> = {
        ALREADY_ISSUED: '이미 발급된 묶음 Claim 링크가 있습니다. 재발급이 불가능합니다.',
        CLAIM_MODE_CONFLICT: '이 출고는 개별 발송 방식으로 이미 발급되었습니다.',
        GEOCAPSULE_NOT_READY: '아직 인증 캡슐이 준비되지 않았습니다.',
        SHIPMENT_NOT_FOUND: '출고를 찾을 수 없습니다.',
        NEO_UNAVAILABLE: '묶음 Claim 링크 발급 서버 연결에 실패했습니다.',
      };
      toast.show(msgMap[code] || '묶음 Claim 링크 발급에 실패했습니다.', 'error');
    } finally {
      setIssuingId(null);
    }
  };

  // Individual issuance — issue link per READY asset
  const handleIssueIndividualLinks = async (shipment: Shipment) => {
    const readyAssets = getCapsuleReadyAssets(shipment);
    if (readyAssets.length === 0) return;

    const confirmed = window.confirm(
      '【개별 Claim 링크 발급 안내】\n\n' +
      `READY 자산 ${readyAssets.length}개에 대해 개별 링크를 발급합니다.\n` +
      '각 링크는 1회만 생성되며, 발송 완료 후에는 재발급이 불가능합니다.\n\n' +
      '계속 진행하시겠습니까?'
    );
    if (!confirmed) return;

    setIssuingId(`individual-${shipment.shipment_id}`);
    const issuedAssets: IndividualClaimLink['assets'] = [];
    const failedAssets: string[] = [];

    for (const sa of readyAssets) {
      try {
        const res = await api.post('/agency/capsule/claim/issue', {
          shipment_id: shipment.shipment_id,
          asset_id: sa.asset_id,
        });
        issuedAssets.push({
          asset_id: sa.asset_id,
          dina_id: sa.asset?.dina_id,
          token_id: res.data.token_id,
          url: res.data.claim_url,
          expiresAt: res.data.expires_at,
          issuedAt: new Date().toISOString(),
          sent: false,
        });
      } catch (err: any) {
        const code = err.response?.data?.code;
        if (code === 'ALREADY_ISSUED') {
          // Already issued — skip silently (expected in partial reissue scenario)
          console.log(`[IndividualIssue] Already issued: asset=${sa.asset_id}`);
        } else {
          failedAssets.push(sa.asset_id);
        }
      }
    }

    if (issuedAssets.length > 0) {
      setClaimLinks(prev => {
        const existing = prev[shipment.shipment_id];
        const existingAssets = existing?.type === 'INDIVIDUAL' ? existing.assets : [];
        return {
          ...prev,
          [shipment.shipment_id]: {
            type: 'INDIVIDUAL',
            assets: [...existingAssets, ...issuedAssets],
          },
        };
      });
      toast.show(`${issuedAssets.length}개 개별 Claim 링크가 발급되었습니다.`, 'success');
    }

    if (failedAssets.length > 0) {
      toast.show(`${failedAssets.length}개 자산 발급에 실패했습니다.`, 'error');
    }

    setIssuingId(null);
  };

  // Copy link to clipboard
  const handleCopy = async (url: string, key: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedKey(key);
    toast.show('Claim 링크가 복사되었습니다.', 'success');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Mark as SENT — claim_url removed from UI after this
  const handleMarkSent = async (
    shipmentId: string,
    tokenId: string,
    sendType: 'BUNDLE' | 'INDIVIDUAL',
    assetId?: string,
  ) => {
    setMarkingSent(tokenId);
    try {
      await api.post('/agency/capsule/claim/sent', {
        token_id: tokenId,
        send_type: sendType,
      });

      setClaimLinks(prev => {
        const current = prev[shipmentId];
        if (!current) return prev;

        if (current.type === 'BUNDLE') {
          return { ...prev, [shipmentId]: { ...current, sent: true } };
        }

        if (current.type === 'INDIVIDUAL') {
          return {
            ...prev,
            [shipmentId]: {
              ...current,
              assets: current.assets.map(a =>
                a.asset_id === assetId ? { ...a, sent: true } : a
              ),
            },
          };
        }
        return prev;
      });

      toast.show('발송 완료 처리되었습니다. 링크는 더 이상 표시되지 않습니다.', 'success');
    } catch (err: any) {
      toast.show('발송 완료 처리에 실패했습니다.', 'error');
    } finally {
      setMarkingSent(null);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-txt-primary">출고 관리</h2>
        <p className="text-sm text-txt-muted mt-1">
          소비자 소유권 Claim 링크를 발급합니다.
          <span className="ml-2 text-xs text-status-green">Phase 2 — Claim형</span>
        </p>
      </div>

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
                const readyAssets = getCapsuleReadyAssets(shipment);
                const hasReady = readyAssets.length > 0;
                const claimLink = claimLinks[shipment.shipment_id];
                const isBundleIssuing = issuingId === `bundle-${shipment.shipment_id}`;
                const isIndividualIssuing = issuingId === `individual-${shipment.shipment_id}`;

                return (
                  <>
                    {/* Main shipment row */}
                    <tr
                      key={shipment.shipment_id}
                      className="border-b border-geo-border/50 hover:bg-geo-main/50 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-txt-primary font-semibold">{shipment.display_id}</td>
                      <td className="px-5 py-3 text-txt-secondary">{shipment.series?.name || '-'}</td>
                      <td className="px-5 py-3 text-txt-primary font-mono">{shipment.asset_count}개</td>
                      <td className="px-5 py-3 text-txt-secondary">{formatDate(shipment.shipped_at)}</td>
                      <td className="px-5 py-3">{getCapsuleStatusBadge(shipment)}</td>
                      <td className="px-5 py-3">
                        {hasReady ? (
                          <div className="flex items-center gap-2">
                            {/* Bundle send button */}
                            <button
                              onClick={() => handleIssueBundleLink(shipment)}
                              disabled={isBundleIssuing || isIndividualIssuing}
                              className="px-3 py-1.5 text-xs bg-status-purple-dim text-status-purple border border-status-purple/30 rounded-lg hover:bg-status-purple/20 disabled:opacity-50 transition-all whitespace-nowrap"
                            >
                              {isBundleIssuing ? '발급 중...' : '묶음 발송'}
                            </button>
                            {/* Individual send button */}
                            <button
                              onClick={() => handleIssueIndividualLinks(shipment)}
                              disabled={isBundleIssuing || isIndividualIssuing}
                              className="px-3 py-1.5 text-xs bg-status-green-dim text-status-green border border-status-green/30 rounded-lg hover:bg-status-green/20 disabled:opacity-50 transition-all whitespace-nowrap"
                            >
                              {isIndividualIssuing ? '발급 중...' : '개별 발송'}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-txt-muted">-</span>
                        )}
                      </td>
                    </tr>

                    {/* Bundle claim link row */}
                    {claimLink?.type === 'BUNDLE' && (
                      <tr key={`${shipment.shipment_id}-bundle`} className="border-b border-geo-border/50 bg-geo-main/30">
                        <td colSpan={6} className="px-5 py-3">
                          {claimLink.sent ? (
                            <p className="text-xs text-txt-muted">
                              ✅ 발송 완료 — Claim 링크는 보안 정책상 다시 표시되지 않습니다.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-status-purple font-semibold whitespace-nowrap">🔗 묶음 Claim URL</span>
                                <code className="text-xs text-txt-primary font-mono bg-geo-border/20 px-2 py-1 rounded flex-1 overflow-x-auto truncate">
                                  {claimLink.url}
                                </code>
                                <button
                                  onClick={() => handleCopy(claimLink.url, `bundle-${shipment.shipment_id}`)}
                                  className={`px-3 py-1 text-xs border rounded transition-all whitespace-nowrap ${
                                    copiedKey === `bundle-${shipment.shipment_id}`
                                      ? 'text-status-green border-status-green bg-status-green/10'
                                      : 'text-txt-secondary border-geo-border hover:border-geo-border-hover'
                                  }`}
                                >
                                  {copiedKey === `bundle-${shipment.shipment_id}` ? '✓ 복사됨' : '복사'}
                                </button>
                                <button
                                  onClick={() => handleMarkSent(shipment.shipment_id, claimLink.token_id, 'BUNDLE')}
                                  disabled={markingSent === claimLink.token_id}
                                  className="px-3 py-1 text-xs text-status-yellow border border-status-yellow/30 rounded hover:bg-status-yellow/10 transition-all whitespace-nowrap disabled:opacity-50"
                                >
                                  {markingSent === claimLink.token_id ? '처리 중...' : '발송 완료'}
                                </button>
                              </div>
                              <div className="flex items-center gap-4 pl-1">
                                <span className="text-xs text-txt-muted">자산 {claimLink.assetCount}개</span>
                                <span className="text-xs text-txt-muted">발급: {formatDate(claimLink.issuedAt)}</span>
                                <span className="text-xs text-txt-muted">만료: {formatDate(claimLink.expiresAt)}</span>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}

                    {/* Individual claim link rows */}
                    {claimLink?.type === 'INDIVIDUAL' && claimLink.assets.map(asset => (
                      <tr key={`${shipment.shipment_id}-individual-${asset.asset_id}`} className="border-b border-geo-border/50 bg-geo-main/30">
                        <td colSpan={6} className="px-5 py-3">
                          {asset.sent ? (
                            <p className="text-xs text-txt-muted">
                              ✅ 발송 완료 ({asset.dina_id || asset.asset_id.slice(0, 8)}) — 보안 정책상 다시 표시되지 않습니다.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-status-green font-semibold whitespace-nowrap">
                                  🔗 {asset.dina_id || asset.asset_id.slice(0, 8)}
                                </span>
                                <code className="text-xs text-txt-primary font-mono bg-geo-border/20 px-2 py-1 rounded flex-1 overflow-x-auto truncate">
                                  {asset.url}
                                </code>
                                <button
                                  onClick={() => handleCopy(asset.url, `individual-${asset.asset_id}`)}
                                  className={`px-3 py-1 text-xs border rounded transition-all whitespace-nowrap ${
                                    copiedKey === `individual-${asset.asset_id}`
                                      ? 'text-status-green border-status-green bg-status-green/10'
                                      : 'text-txt-secondary border-geo-border hover:border-geo-border-hover'
                                  }`}
                                >
                                  {copiedKey === `individual-${asset.asset_id}` ? '✓ 복사됨' : '복사'}
                                </button>
                                <button
                                  onClick={() => handleMarkSent(shipment.shipment_id, asset.token_id, 'INDIVIDUAL', asset.asset_id)}
                                  disabled={markingSent === asset.token_id}
                                  className="px-3 py-1 text-xs text-status-yellow border border-status-yellow/30 rounded hover:bg-status-yellow/10 transition-all whitespace-nowrap disabled:opacity-50"
                                >
                                  {markingSent === asset.token_id ? '처리 중...' : '발송 완료'}
                                </button>
                              </div>
                              <div className="flex items-center gap-4 pl-1">
                                <span className="text-xs text-txt-muted">만료: {formatDate(asset.expiresAt)}</span>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
