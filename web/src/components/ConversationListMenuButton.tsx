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

/**
 * 대화 목록으로 가는 ≡ 버튼을 **숨기는** 컴포넌트
 *
 * `FixedMessenger` 는 목록 네비게이션 함수를 항상 주입하므로,
 * 설정값으로 이 버튼을 끄는 방법은 없습니다. 슬롯을 비워서 제거합니다.
 *
 * ```tsx
 * <ConversationHeaderLayout.MenuButton component={HiddenMenuButton} />
 * ```
 */
export function HiddenMenuButton() {
  return null;
}

/**
 * ≡ 버튼을 **보이되 누를 수 없게** 만드는 컴포넌트
 *
 * 목록 기능을 일시적으로 막아야 하는데 헤더 레이아웃은 그대로 유지하고 싶을 때 씁니다.
 * 평소에는 숨김(`HiddenMenuButton`)이 더 낫습니다 —
 * 눌리지 않는 버튼은 사용자에게 고장으로 읽히기 때문입니다.
 */
export function DisabledMenuButton() {
  return (
    <button
      type="button"
      disabled
      aria-label="대화 목록 열기 (사용할 수 없음)"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        padding: 0,
        border: 'none',
        background: 'transparent',
        color: 'inherit',
        opacity: 0.35,
        cursor: 'not-allowed',
      }}
    >
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
        <line x1="4" y1="6" x2="20" y2="6" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="18" x2="20" y2="18" />
      </svg>
    </button>
  );
}
