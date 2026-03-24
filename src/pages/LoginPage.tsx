import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import api from '../services/api';

type PageMode = 'login' | 'onboard';

export default function LoginPage() {
  const [mode, setMode] = useState<PageMode>('login');

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Onboard state
  const [accessCode, setAccessCode] = useState('');
  const [obEmail, setObEmail] = useState('');
  const [obPassword, setObPassword] = useState('');
  const [obPasswordConfirm, setObPasswordConfirm] = useState('');
  const [obName, setObName] = useState('');
  const [obStep, setObStep] = useState<'code' | 'register'>('code');
  const [obDealerName, setObDealerName] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();

  // ── 로그인 ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/agency/auth/login', { email, password });
      const data = res.data.data;
      login(data.access_token, {
        id: data.user_id,
        email: data.email,
        name: data.email,
        role: data.role,
        tenantId: data.dealer_id,
        tenantCode: '',
        tenantName: data.dealer_name,
        dealer_id: data.dealer_id,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  // ── 온보딩 Step 1: 전송코드 확인 ──
  const handleCodeCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/agency/auth/onboard/verify', { access_code: accessCode.trim() });
      setObDealerName(res.data.data.dealer_name);
      setObStep('register');
    } catch (err: any) {
      setError(err.response?.data?.message || '유효하지 않은 전송코드입니다');
    } finally {
      setLoading(false);
    }
  };

  // ── 온보딩 Step 2: 계정 생성 ──
  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (obPassword !== obPasswordConfirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    setLoading(true);
    try {
      await api.post('/agency/auth/onboard', {
        access_code: accessCode.trim(),
        email: obEmail,
        password: obPassword,
        name: obName,
      });
      setMode('login');
      setEmail(obEmail);
      setError('');
      // 성공 메시지를 error 필드 대신 별도 표시
      setObStep('code');
      setAccessCode('');
      setObEmail('');
      setObPassword('');
      setObPasswordConfirm('');
      setObName('');
      alert('계정이 생성되었습니다. 로그인해주세요.');
    } catch (err: any) {
      setError(err.response?.data?.message || '계정 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-geo-deep">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-status-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-status-blue/5 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-geo-card border border-geo-border rounded-2xl p-8 w-full max-w-md animate-fade-in">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-status-purple to-status-blue rounded-t-2xl" />

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-status-purple to-status-blue rounded-xl flex items-center justify-center text-lg font-bold text-white">
            A
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center text-txt-primary mb-1">Agency Console</h1>
        <p className="text-txt-secondary text-center text-sm mb-6">기획사 콘솔</p>

        {/* Tab */}
        <div className="flex rounded-lg border border-geo-border overflow-hidden mb-6">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 text-sm font-medium transition-all ${mode === 'login' ? 'bg-status-purple text-white' : 'text-txt-secondary hover:text-txt-primary'}`}
          >
            로그인
          </button>
          <button
            onClick={() => { setMode('onboard'); setError(''); setObStep('code'); }}
            className={`flex-1 py-2 text-sm font-medium transition-all ${mode === 'onboard' ? 'bg-status-purple text-white' : 'text-txt-secondary hover:text-txt-primary'}`}
          >
            최초 등록
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-status-red-dim text-status-red p-3 rounded-lg mb-4 text-sm border border-status-red/20">
            {error}
          </div>
        )}

        {/* ── 로그인 폼 ── */}
        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-txt-secondary mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                placeholder="agency@example.com"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-txt-secondary mb-1.5">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-status-purple text-white py-2.5 rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        {/* ── 온보딩: Step 1 전송코드 입력 ── */}
        {mode === 'onboard' && obStep === 'code' && (
          <form onSubmit={handleCodeCheck}>
            <div className="mb-2">
              <p className="text-xs text-txt-muted mb-4">GeoStudio에서 발급받은 전송코드를 입력하세요.</p>
              <label className="block text-sm font-medium text-txt-secondary mb-1.5">전송코드</label>
              <input
                type="text"
                value={accessCode}
                onChange={e => setAccessCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted font-mono focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                placeholder="전송코드 입력"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !accessCode}
              className="w-full mt-4 bg-status-purple text-white py-2.5 rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
            >
              {loading ? '확인 중...' : '코드 확인'}
            </button>
          </form>
        )}

        {/* ── 온보딩: Step 2 계정 생성 ── */}
        {mode === 'onboard' && obStep === 'register' && (
          <form onSubmit={handleOnboard}>
            <div className="px-3 py-2 rounded-lg bg-status-green/10 border border-status-green/30 mb-4">
              <p className="text-xs text-status-green font-medium">전송코드 확인 완료</p>
              <p className="text-xs text-txt-secondary mt-0.5">{obDealerName}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-txt-secondary mb-1.5">담당자 이름</label>
                <input
                  type="text"
                  value={obName}
                  onChange={e => setObName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                  placeholder="홍길동"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-txt-secondary mb-1.5">이메일 *</label>
                <input
                  type="email"
                  value={obEmail}
                  onChange={e => setObEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                  placeholder="agency@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-txt-secondary mb-1.5">비밀번호 *</label>
                <input
                  type="password"
                  value={obPassword}
                  onChange={e => setObPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-txt-secondary mb-1.5">비밀번호 확인 *</label>
                <input
                  type="password"
                  value={obPasswordConfirm}
                  onChange={e => setObPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary placeholder-txt-muted focus:ring-2 focus:ring-status-purple/40 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => { setObStep('code'); setError(''); }}
                className="flex-1 py-2.5 border border-geo-border rounded-lg text-txt-secondary text-sm hover:text-txt-primary transition-all"
              >
                이전
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-status-purple text-white py-2.5 rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
              >
                {loading ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}