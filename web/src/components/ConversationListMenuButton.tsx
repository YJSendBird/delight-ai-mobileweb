import {
  ConversationHeaderLayout,
  useConversationContext,
} from '@sendbird/ai-agent-messenger-react';

/**
 * 대화 화면 헤더의 '대화 목록으로 이동'(≡) 버튼 아이콘을 바꾸는 컴포넌트
 *
 * ## 기본 동작
 * SDK 기본 MenuButton 은 햄버거(≡) 아이콘이며,
 * `useConversationContext().onNavigateToConversationList()` 를 호출해 목록 화면으로 이동합니다.
 * 이 함수가 없는 구성(목록 기능 미사용)에서는 버튼 자체를 렌더링하지 않습니다.
 *
 * ## 이 컴포넌트
 * 이동 동작은 그대로 두고 **아이콘만** 목록(리스트) 모양으로 교체합니다.
 *
 * ## 적용
 * ```tsx
 * <FixedMessenger.ConversationChildren>
 *   <ConversationHeaderLayout.MenuButton component={ConversationListMenuButton} />
 * </FixedMessenger.ConversationChildren>
 * ```
 */
export function ConversationListMenuButton() {
  const { onNavigateToConversationList } = useConversationContext();

  // 목록 기능이 꺼진 구성에서는 SDK 기본 동작과 동일하게 아무것도 그리지 않습니다.
  if (!onNavigateToConversationList) return null;

  return (
    <button
      type="button"
      aria-label="대화 목록 열기"
      onClick={() => onNavigateToConversationList()}
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
      {/* 햄버거(≡) 대신 '목록' 의미가 드러나는 아이콘을 씁니다. */}
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
        <line x1="9" y1="6" x2="20" y2="6" />
        <line x1="9" y1="12" x2="20" y2="12" />
        <line x1="9" y1="18" x2="20" y2="18" />
        <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
        <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
      </svg>
    </button>
  );
}

/** SDK 기본 ≡ 버튼을 그대로 쓰고 싶을 때의 참조 지점 */
export const DefaultMenuButton = ConversationHeaderLayout.defaults.components.MenuButton;
