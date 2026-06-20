import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useToastStore } from '../../stores/toast.store';

interface ShipmentAsset {
  asset_id: string;
  file_name: string;
  file_sha256: string;
  asset?: {
    dina_id: string;
    edition: number;
    geocapsule_status?: string; // READY / PENDING / FAILED
  };
}

interface Shipment {
  shipment_id: string;
  display_id: string;
  series_id: string;
  asset_count: number;
  status: string;
  zip_sha256: string;
  zip_size: number;
  created_at: string;
  shipped_at?: string;
  voided_at?: string;
  void_reason?: string;
  series?: {
    name: string;
    code: string;
  };
  shipmentAssets?: ShipmentAsset[];
}

interface CapsuleLink {
  url: string;
  expiresAt: string;
  dinaId: string;
}

interface ShipmentDetailModalProps {
  shipmentId: string;
  onClose: () => void;
}

export default function ShipmentDetailModal({ shipmentId, onClose }: ShipmentDetailModalProps) {
  const queryClient = useQueryClient();
  const toast = useToastStore();

  const [showVoidInput, setShowVoidInput] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // 인증 캡슐 발송 state
  const [capsuleLink, setCapsuleLink] = useState<CapsuleLink | null>(null);
  const [issuingCapsule, setIssuingCapsule] = useState(false);

  // 모달 드래그
  const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // 출고 상세
  const { data: shipment, isLoading } = useQuery({
    queryKey: ['shipment', shipmentId],
    queryFn: () => api.get(`/shipments/${shipmentId}`).then(res => res.data as Shipment),
  });

  // 출고 확정 + 이메일 발송
  const confirmMutation = useMutation({
    mutationFn: (email: string) => api.patch(`/shipments/${shipmentId}/confirm`, { recipientEmail: email }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
      const emailSent = res.data?.emailSent;
      if (emailSent) {
        toast.show('출고 확정 완료. 이메일이 발송되었습니다.', 'success');
      } else {
        toast.show('출고 확정 완료. (이메일 발송 실패)', 'info');
      }
      setShowConfirmModal(false);
      setRecipientEmail('');
    },
    onError: (err: any) => {
      toast.show(err.response?.data?.message || '출고 확정 실패', 'error');
    },
  });

  // 이메일 유효성 검사
  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleConfirmSubmit = () => {
    if (!recipientEmail.trim()) {
      setEmailError('수신자 이메일을 입력하세요');
      return;
    }
    if (!validateEmail(recipientEmail)) {
      setEmailError('유효한 이메일 주소를 입력하세요');
      return;
    }
    setEmailError('');
    confirmMutation.mutate(recipientEmail);
  };

  // 출고 무효화
  const voidMutation = useMutation({
    mutationFn: (reason: string) => api.patch(`/shipments/${shipmentId}/void`, { voidReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
      toast.show('출고가 무효화되었습니다', 'success');
      setShowVoidInput(false);
    },
    onError: (err: any) => {
      toast.show(err.response?.data?.message || '무효화 실패', 'error');
    },
  });

  // 다운로드
  const handleDownload = async () => {
    try {
      const res = await api.get(`/shipments/${shipmentId}/download`);
      const link = document.createElement('a');
      link.href = res.data.downloadUrl;
      link.download = `${shipment?.display_id || 'shipment'}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      toast.show(err.response?.data?.message || '다운로드 URL 생성 실패', 'error');
    }
  };

  // 증빙 텍스트 복사
  const handleCopyEvidence = () => {
    if (!shipment) return;
    const text = `${shipment.display_id} | SHA256: ${shipment.zip_sha256} | ${formatDate(shipment.created_at)} | ${shipment.series?.name}`;
    navigator.clipboard.writeText(text);
    toast.show('복사 완료', 'success');
  };

  // SHA256 복사
  const handleCopySha = () => {
    if (!shipment) return;
    navigator.clipboard.writeText(shipment.zip_sha256);
    toast.show('SHA256 복사됨', 'success');
  };

  // 인증 캡슐 발송 (Agency Backend 경유 — INTERNAL_API_KEY 미노출)
  const handleIssueCapsuleLink = async (assetId: string) => {
    setIssuingCapsule(true);
    try {
      const res = await api.post('/agency/capsule/issue', {
        shipment_id: shipmentId,
        asset_id: assetId,
      });
      setCapsuleLink({
        url: res.data.secure_download_url,
        expiresAt: res.data.expires_at,
        dinaId: res.data.dina_id,
      });
      toast.show('인증 캡슐 링크가 발급되었습니다.', 'success');
    } catch (err: any) {
      const code = err.response?.data?.code;
      const msgMap: Record<string, string> = {
        GEOCAPSULE_NOT_READY: '아직 인증 캡슐이 준비되지 않았습니다.',
        ASSET_NOT_IN_SHIPMENT: '해당 출고에 포함된 자산이 아닙니다.',
        FORBIDDEN: '해당 출고에 대한 권한이 없습니다.',
        NEO_UNAVAILABLE: '보안 링크 발급 서버 연결에 실패했습니다.',
      };
      toast.show(msgMap[code] || '링크 발급에 실패했습니다. 다시 시도해주세요.', 'error');
    } finally {
      setIssuingCapsule(false);
    }
  };

  // 링크 복사
  const handleCopyCapsuleLink = () => {
    if (!capsuleLink) return;
    navigator.clipboard.writeText(capsuleLink.url);
    toast.show('링크가 복사되었습니다.', 'success');
  };

  // 첫 번째 READY asset 찾기 (Phase 1: 대표 1건)
  const getCapsuleReadyAsset = () => {
    if (!shipment?.shipmentAssets) return null;
    return shipment.shipmentAssets.find(
      sa => sa.asset?.geocapsule_status === 'READY'
    ) || null;
  };

  // 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(tag)) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - modalPos.x, y: e.clientY - modalPos.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setModalPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      READY: 'bg-status-yellow-dim text-status-yellow',
      SHIPPED: 'bg-status-green-dim text-status-green',
      VOID: 'bg-status-red-dim text-status-red',
    };
    return map[status] || 'bg-status-gray-dim text-status-gray';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      READY: '준비완료',
      SHIPPED: '출고완료',
      VOID: '무효',
    };
    return map[status] || status;
  };

  if (isLoading) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-geo-card border border-geo-border rounded-xl p-6">
          <p className="text-txt-secondary">로딩 중...</p>
        </div>
      </div>,
      document.body
    );
  }

  if (!shipment) return null;

  const capsuleReadyAsset = getCapsuleReadyAsset();

  // 출고 확정 모달
  if (showConfirmModal) {
    return createPortal(
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4">
        <div className="bg-geo-card border border-geo-border rounded-xl w-full max-w-md">
          {/* Header */}
          <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex items-center justify-between">
            <h2 className="text-lg font-semibold text-txt-primary">출고 확정</h2>
            <button
              onClick={() => { setShowConfirmModal(false); setRecipientEmail(''); setEmailError(''); }}
              className="text-txt-muted hover:text-txt-primary text-xl"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            <div className="bg-geo-main border border-geo-border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-txt-muted">출고 번호</span>
                <span className="text-sm text-txt-primary font-mono font-semibold">{shipment.display_id}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-txt-muted">시리즈</span>
                <span className="text-sm text-txt-primary">{shipment.series?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-txt-muted">자산 수량</span>
                <span className="text-sm text-txt-primary font-mono">{shipment.asset_count}개</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-txt-secondary mb-2">
                수신자 이메일 <span className="text-status-red">*</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={e => { setRecipientEmail(e.target.value); setEmailError(''); }}
                placeholder="example@company.com"
                className={`w-full px-4 py-3 bg-geo-main border rounded-lg text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-status-purple ${
                  emailError ? 'border-status-red' : 'border-geo-border'
                }`}
              />
              {emailError && (
                <p className="text-xs text-status-red mt-1">{emailError}</p>
              )}
              <p className="text-xs text-txt-muted mt-2">
                출고 확정 시 위 이메일로 다운로드 링크가 발송됩니다.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-geo-border flex gap-2">
            <button
              onClick={() => { setShowConfirmModal(false); setRecipientEmail(''); setEmailError(''); }}
              className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
            >
              취소
            </button>
            <button
              onClick={handleConfirmSubmit}
              disabled={confirmMutation.isPending}
              className="flex-1 px-4 py-2 bg-status-green text-white rounded-lg font-medium hover:bg-status-green/80 disabled:opacity-50 transition-all"
            >
              {confirmMutation.isPending ? '처리 중...' : '확정 발송'}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="bg-geo-card border border-geo-border rounded-xl w-full max-w-2xl flex flex-col cursor-move select-none"
        style={{ maxHeight: '90vh', transform: `translate(${modalPos.x}px, ${modalPos.y}px)` }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div className="bg-geo-main px-6 py-4 border-b border-geo-border rounded-t-xl flex-shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-txt-primary">{shipment.display_id}</h2>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(shipment.status)}`}>
                {getStatusLabel(shipment.status)}
              </span>
            </div>
            <p className="text-xs text-txt-muted mt-1 font-mono">{shipment.shipment_id}</p>
          </div>
          <button onClick={onClose} className="text-txt-muted hover:text-txt-primary text-xl">×</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">시리즈</p>
              <p className="text-sm text-txt-primary">{shipment.series?.name}</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">자산 수</p>
              <p className="text-sm text-txt-primary font-mono">{shipment.asset_count}개</p>
            </div>
            <div>
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">생성일시</p>
              <p className="text-sm text-txt-primary">{formatDate(shipment.created_at)}</p>
            </div>
            {shipment.shipped_at && (
              <div>
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">출고 확정일시</p>
                <p className="text-sm text-txt-primary">{formatDate(shipment.shipped_at)}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">ZIP SHA256</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-txt-primary font-mono bg-geo-main px-2 py-1 rounded flex-1 overflow-x-auto">
                  {shipment.zip_sha256}
                </code>
                <button
                  onClick={handleCopySha}
                  className="px-2 py-1 text-xs text-status-purple border border-status-purple/30 rounded hover:bg-status-purple/10 transition-all"
                >
                  복사
                </button>
              </div>
            </div>
            {shipment.void_reason && (
              <div className="col-span-2">
                <p className="text-xs text-txt-muted uppercase tracking-wider mb-1">무효화 사유</p>
                <p className="text-sm text-status-red">{shipment.void_reason}</p>
              </div>
            )}
          </div>

          {/* 증빙 텍스트 복사 */}
          <div className="mb-6">
            <p className="text-xs text-txt-muted mb-2">출고 증빙 정보(출고번호, SHA256, 자산목록)를 텍스트로 복사합니다.</p>
            <button
              onClick={handleCopyEvidence}
              className="w-full px-4 py-2 text-sm border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all"
            >
              증빙 텍스트 복사
            </button>
          </div>

          {/* 인증 캡슐 링크 표시 영역 */}
          {capsuleLink && (
            <div className="mb-6 bg-geo-main border border-status-purple/30 rounded-lg px-4 py-3 space-y-2">
              <p className="text-xs text-status-purple font-semibold">인증 캡슐 다운로드 링크</p>
              <p className="text-xs text-txt-muted">
                DINA ID: <span className="font-mono text-txt-primary">{capsuleLink.dinaId}</span>
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-txt-primary font-mono bg-geo-border/20 px-2 py-1 rounded flex-1 overflow-x-auto truncate">
                  {capsuleLink.url}
                </code>
                <button
                  onClick={handleCopyCapsuleLink}
                  className="px-3 py-1 text-xs text-status-purple border border-status-purple/30 rounded hover:bg-status-purple/10 transition-all whitespace-nowrap"
                >
                  복사
                </button>
              </div>
              <p className="text-xs text-txt-muted">
                만료: {new Date(capsuleLink.expiresAt).toLocaleString('ko-KR')} (72시간)
              </p>
              <p className="text-xs text-status-yellow">
                재발급 시 기존 링크는 무효화됩니다.
              </p>
              {capsuleReadyAsset && (
                <button
                  onClick={() => handleIssueCapsuleLink(capsuleReadyAsset.asset_id)}
                  disabled={issuingCapsule}
                  className="text-xs text-txt-muted hover:text-txt-primary transition-all disabled:opacity-50"
                >
                  {issuingCapsule ? '발급 중...' : '재발급'}
                </button>
              )}
            </div>
          )}

          {/* 포함 자산 목록 */}
          {shipment.shipmentAssets && shipment.shipmentAssets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-txt-primary mb-3">포함 자산 ({shipment.shipmentAssets.length}개)</h3>
              <div className="bg-geo-main border border-geo-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-geo-border">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-txt-muted uppercase">DINA ID</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-txt-muted uppercase">파일명</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-txt-muted uppercase">SHA256</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-txt-muted uppercase">에디션</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-txt-muted uppercase">캡슐</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipment.shipmentAssets.map(sa => (
                      <tr key={sa.asset_id} className="border-b border-geo-border/50 last:border-0">
                        <td className="px-4 py-2 text-txt-primary font-mono">{sa.asset?.dina_id || '-'}</td>
                        <td className="px-4 py-2 text-txt-secondary text-xs">{sa.file_name}</td>
                        <td className="px-4 py-2 text-txt-muted font-mono text-xs">{sa.file_sha256?.substring(0, 12)}...</td>
                        <td className="px-4 py-2 text-txt-primary">{sa.asset?.edition || '-'}</td>
                        <td className="px-4 py-2">
                          {sa.asset?.geocapsule_status === 'READY' && (
                            <span className="text-xs text-status-green">● READY</span>
                          )}
                          {sa.asset?.geocapsule_status === 'PENDING' && (
                            <span className="text-xs text-status-yellow">● 생성중</span>
                          )}
                          {sa.asset?.geocapsule_status === 'FAILED' && (
                            <span className="text-xs text-status-red">● 실패</span>
                          )}
                          {!sa.asset?.geocapsule_status && (
                            <span className="text-xs text-txt-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-geo-border flex-shrink-0">
          {showVoidInput ? (
            <div className="space-y-3">
              <input
                type="text"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder="무효화 사유를 입력하세요"
                className="w-full px-4 py-2 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder:text-txt-muted focus:outline-none focus:border-status-purple"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVoidInput(false)}
                  className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
                >
                  취소
                </button>
                <button
                  onClick={() => voidMutation.mutate(voidReason)}
                  disabled={!voidReason.trim() || voidMutation.isPending}
                  className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary disabled:opacity-50 transition-all"
                >
                  {voidMutation.isPending ? '처리 중...' : '무효화 확인'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleDownload}
                className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
              >
                다운로드
              </button>
              {/* 인증 캡슐 발송 버튼 - SHIPPED + READY 상태에서만 표시 */}
              {shipment.status === 'SHIPPED' && capsuleReadyAsset && (
                <button
                  onClick={() => handleIssueCapsuleLink(capsuleReadyAsset.asset_id)}
                  disabled={issuingCapsule}
                  className="flex-1 px-4 py-2 bg-status-purple-dim text-status-purple rounded-lg font-medium hover:bg-status-purple/20 disabled:opacity-50 transition-all"
                >
                  {issuingCapsule ? '발급 중...' : '인증 캡슐 발송 (대표 1건)'}
                </button>
              )}
              {shipment.status === 'READY' && (
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 px-4 py-2 bg-status-green text-white rounded-lg font-medium hover:bg-status-green/80 transition-all"
                >
                  ✓ 출고 확정
                </button>
              )}
              {shipment.status === 'SHIPPED' && (
                <button
                  onClick={() => setShowVoidInput(true)}
                  className="flex-1 px-4 py-2 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary transition-all"
                >
                  무효화
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
