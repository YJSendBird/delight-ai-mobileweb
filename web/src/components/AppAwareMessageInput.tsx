import {
  useConversationContext,
  useMessengerContext,
  useMessengerSessionContext,
} from '@sendbird/ai-agent-messenger-react';
import { useRef, useState } from 'react';

/**
 * 첨부 버튼 노출을 **앱이 결정**하는 커스텀 입력창
 *
 * ## 왜 필요한가
 * 첨부 기능은 `attachment_mode` (서버/에이전트 설정)으로만 켜고 끌 수 있습니다.
 * 이 값은 앱 전체에 일괄 적용되므로 **앱 버전별 분기가 불가능**합니다.
 * "특정 버전 이상에서만 첨부 UI를 노출" 같은 요구는 SDK 설정으로 해결되지 않습니다.
 *
 * 또한 `config.conversation.input.*` 로 메뉴 항목을 전부 꺼도
 * **+ 버튼 자체는 남고 빈 시트가 뜹니다.** (SDK 는 `attachment_mode` 기준으로만 버튼을 숨김)
 *
 * ## 해결
 * `ConversationLayout.Footer` 로 입력 영역을 통째로 교체하고,
 * 첨부 버튼 노출을 아래 **두 조건의 AND** 로 직접 판단합니다.
 *
 * 1. `supportsAttachment` — 앱이 웹뷰로 넘겨준 값 (버전별 분기는 네이티브가 담당)
 * 2. `createAttachmentRules(...).isEnabled()` — 기존 SDK 첨부 정책 (attachment_mode 등)
 *
 * 앱 조건만 보고 열면 서버에서 첨부를 꺼도 버튼이 남으므로, 둘 다 확인해야 합니다.
 */
export function AppAwareMessageInput({ supportsAttachment }: { supportsAttachment: boolean }) {
  const { channelSource, messageSource, state } = useConversationContext();
  const { chatSDK } = useMessengerContext();
  const { createAttachmentRules } = useMessengerSessionContext();

  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const channel = channelSource.channel;
  const inputDisabled = state.input.disabled;

  // SDK 첨부 정책 — attachment_mode / 허용 MIME / 용량 / 개수
  const rules = createAttachmentRules({
    channel,
    uploadSizeLimit: chatSDK.appInfo?.uploadSizeLimit,
  });
  const allowedByPolicy = !!channel && rules.isEnabled();

  // 앱 조건 AND 서버 정책 — 둘 다 만족할 때만 첨부 버튼 노출
  const showAttachment = supportsAttachment && allowedByPolicy;

  const pickFiles = (selected: FileList | null) => {
    if (!selected) return;
    const picked = Array.from(selected);

    const oversized = picked.find((f) => f.size > rules.getUploadSizeLimit(f.type));
    if (oversized) {
      setAlert(`파일 용량은 ${rules.getUploadSizeLimitInMB(oversized.type)}MB 까지 가능합니다.`);
      return;
    }
    const unsupported = picked.find((f) => !rules.isSupportedMimeType(f.type));
    if (unsupported) {
      setAlert('지원하지 않는 형식입니다.');
      return;
    }
    if (picked.length > rules.maxAttachmentCount) {
      setAlert(`파일은 ${rules.maxAttachmentCount}개까지 첨부할 수 있습니다.`);
      return;
    }
    setAlert(null);
    setFiles(picked);
  };

  const send = async () => {
    if (!channel || sending) return;
    const body = text.trim();
    if (!body && files.length === 0) return;

    setSending(true);
    try {
      if (files.length > 0) {
        // 파일 + (선택) 텍스트를 함께 전송
        await messageSource.sendFileMessage({ file: files[0], message: body || undefined });
      } else {
        await messageSource.sendUserMessage({ message: body });
      }
      setText('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      {alert && (
        <div style={{ fontSize: 12, color: '#b00020', marginBottom: 6 }} role="alert">
          {alert}
        </div>
      )}

      {files.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>{files[0].name}</span>
          <button type="button" aria-label="첨부 취소" onClick={() => setFiles([])}>
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {showAttachment && (
          <>
            <button
              type="button"
              aria-label="파일 첨부"
              disabled={inputDisabled || sending}
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 32, height: 32, flexShrink: 0 }}
            >
              +
            </button>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              accept={rules.supportedMimeTypes.join(',')}
              multiple={rules.maxAttachmentCount > 1}
              onChange={(e) => pickFiles(e.currentTarget.files)}
            />
          </>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          disabled={inputDisabled || sending}
          placeholder="질문하기"
          rows={1}
          style={{ flex: 1, resize: 'none', padding: '8px 12px', borderRadius: 18 }}
        />

        <button
          type="button"
          aria-label="메시지 보내기"
          disabled={inputDisabled || sending || (!text.trim() && files.length === 0)}
          onClick={() => void send()}
          style={{ flexShrink: 0 }}
        >
          전송
        </button>
      </div>
    </div>
  );
}
