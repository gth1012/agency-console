import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import { useToastStore } from '../stores/toast.store';

export default function EmailPage() {
  const { show: showToast } = useToastStore();
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const sendMutation = useMutation({
    mutationFn: (payload: { to: string; subject: string; message: string }) =>
      api.post('/api/agency/email/send', payload),
    onSuccess: () => {
      showToast('이메일이 전송되었습니다.', 'success');
      setTo('');
      setSubject('');
      setMessage('');
    },
    onError: () => {
      showToast('이메일 전송에 실패했습니다.', 'error');
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim() || !subject.trim() || !message.trim()) {
      showToast('모든 항목을 입력해주세요.', 'error');
      return;
    }
    sendMutation.mutate({ to: to.trim(), subject: subject.trim(), message: message.trim() });
  };

  const handleDriveUpload = () => {
    showToast('Google Drive 업로드 기능은 준비 중입니다. (Coming Soon)', 'info');
  };

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-txt-primary">이메일 전송</h2>
        <p className="text-sm text-txt-muted mt-1">거래처에 이메일을 전송합니다.</p>
      </div>

      {/* Form Card */}
      <div className="bg-geo-card border border-geo-border rounded-xl max-w-2xl">
        <form onSubmit={handleSend} className="p-6 space-y-5">
          {/* 수신자 */}
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-1.5">
              수신자 이메일
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none transition-colors"
            />
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-1.5">
              제목
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="이메일 제목을 입력하세요"
              className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none transition-colors"
            />
          </div>

          {/* 메시지 */}
          <div>
            <label className="block text-sm font-medium text-txt-secondary mb-1.5">
              메시지
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="이메일 내용을 입력하세요"
              rows={8}
              className="w-full px-3 py-2.5 bg-geo-main border border-geo-border rounded-lg text-txt-primary text-sm focus:border-status-purple focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={sendMutation.isPending}
              className="px-5 py-2.5 bg-status-purple text-white rounded-lg font-medium hover:bg-status-purple/80 disabled:opacity-50 transition-all"
            >
              {sendMutation.isPending ? '전송 중...' : '이메일 전송'}
            </button>
            <button
              type="button"
              onClick={handleDriveUpload}
              className="px-5 py-2.5 border border-geo-border rounded-lg text-txt-secondary hover:text-txt-primary hover:border-geo-border-hover transition-all"
            >
              Google Drive 업로드
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
