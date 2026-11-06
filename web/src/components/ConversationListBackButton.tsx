import {
  ConversationListHeaderLayout,
  useConversationListContext,
  useMessengerSessionContext,
} from '@sendbird/ai-agent-messenger-react';

/**
 * 대화 목록 헤더의 X 버튼을 "대화 화면으로 돌아가기"로 바꾸는 버튼
 *
 * ## 기본 동작
 * SDK의 대화 목록 헤더 닫기 버튼은 아래와 같이 **위젯 자체를 닫습니다.**
 *
 * ```js
 * const CloseButton = () => {
 *   const { state } = useMessengerContext();
 *   return <IconButton type="close" onClick={() => state.setOpened(false)} />;
 * };
 * ```
 *
 * ## 이 컴포넌트
 * 같은 자리에 들어가되, 위젯을 닫는 대신
 * `onOpenConversationView(url, status)` 를 호출해 **대화 화면으로 이동**합니다.
 *
 * 돌아갈 대화는 다음 순서로 고릅니다.
 * 1. 현재 활성 대화(`activeChannel`)
 * 2. 없으면 목록의 첫 번째 대화
 * 3. 그것도 없으면(대화가 하나도 없는 경우) **SDK 기본 닫기 버튼을 그대로** 보여줍니다.
 *    돌아갈 곳이 없는데 화살표만 띄우면 눌러도 아무 일이 없어 혼란스럽기 때문입니다.
 *
 * ## 적용
 * ```tsx
 * <FixedMessenger ...>
 *   <FixedMessenger.ConversationListChildren>
 *     <ConversationListHeaderLayout.EndArea component={ConversationListBackButton} />
 *   </FixedMessenger.ConversationListChildren>
 * </FixedMessenger>
 * ```
 */
export function ConversationListBackButton() {
  const { onOpenConversationView, listSource } = useConversationListContext();
  const { activeChannel } = useMessengerSessionContext();

  // 돌아갈 대화 결정 — 활성 대화 우선, 없으면 목록의 첫 번째
  const first = listSource.channels[0];
  const target = activeChannel
    ? { url: activeChannel.url, status: activeChannel.status }
    : first
      ? { url: first.url, status: (first.conversation?.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed' }
      : null;

  // 돌아갈 대화가 없으면 SDK 기본 동작(위젯 닫기)을 그대로 둡니다.
  if (!target) {
    return <ConversationListHeaderLayout.defaults.components.CloseButton />;
  }

  return (
    <button
      type="button"
      aria-label="대화 화면으로 돌아가기"
      onClick={() => onOpenConversationView(target.url, target.status)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        color: 'inherit',
      }}
    >
      {/* 닫기(X) 대신 '뒤로' 의미가 드러나도록 화살표를 씁니다. */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
