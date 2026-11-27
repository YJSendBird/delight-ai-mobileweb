import { ConversationStatus } from '@sendbird/chat/aiAgent';
import {
  useConversationContext,
  useLocalizationContext,
  useMessengerContext,
  useMessengerSessionContext,
} from '@sendbird/ai-agent-messenger-react';
import { useState } from 'react';

/**
 * 종료된 대화일 때만 보이는 "대화 시작" 버튼 (새 대화 생성)
 *
 * SDK 기본 버튼은 `goToActiveConversation()` 을 호출해 **활성 대화로 이동**할 뿐
 * 새 대화를 만들지 않습니다. 이 버튼은 다중 대화 설정을 보고 분기합니다.
 *
 * @see Sendbird_AIAgent_종료된대화_새대화시작_가이드.pdf
 */
export function StartNewConversationButton() {
  const { channelSource, goToActiveConversation } = useConversationContext();
  const { aiAgentInfo, createConversation } = useMessengerSessionContext();
  const { language, countryCode, context } = useMessengerContext();
  const { stringSet } = useLocalizationContext();
  const [pending, setPending] = useState(false);

  const isClosed = channelSource.channel?.conversation?.status === ConversationStatus.CLOSED;
  if (!isClosed) return null;

  const startNewConversation = async () => {
    setPending(true);
    try {
      if (aiAgentInfo.isMultipleActiveConversationsEnabled) {
        await createConversation({
          aiAgentId: aiAgentInfo.userId,
          language,
          country: countryCode,
          context,
        });
      }
      await goToActiveConversation();
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
      <button
        type="button"
        disabled={pending}
        onClick={startNewConversation}
        style={{
          padding: '10px 20px',
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.2)',
          background: 'transparent',
          color: 'inherit',
          cursor: pending ? 'progress' : 'pointer',
          opacity: pending ? 0.5 : 1,
        }}
      >
        {stringSet.TALK_TO_AGENT}
      </button>
    </div>
  );
}
