import { ConversationLayout } from '@sendbird/ai-agent-messenger-react';

import { StartNewConversationButton } from './StartNewConversationButton.tsx';

const { Footer: DefaultFooter } = ConversationLayout.defaults.components;

/**
 * 종료된 대화에서 "대화 시작"을 눌렀을 때 **새 대화를 생성**하는 푸터
 *
 * ## 기본 동작 (SDK)
 * 종료된 대화를 열면 메시지 목록 끝에 "대화 시작" 버튼이 표시되고,
 * 이 버튼은 `goToActiveConversation()` 을 호출합니다.
 *
 * ```js
 * // SDK 내부 — 종료된 대화에 붙는 TalkToAgent 뷰
 * const { goToActiveConversation } = useConversationContext();
 * ... startNewConversationButton({ onActivate: goToActiveConversation })
 * ```
 *
 * 즉 **새 대화를 만드는 것이 아니라 "지금 열려 있는 대화"로 이동**합니다.
 * 이미 진행 중인 대화가 있으면 그 대화로 가므로, 과거 대화에서 눌렀을 때
 * 새 대화가 시작되지 않는 것처럼 보입니다. (의도된 동작)
 *
 * ## 이 컴포넌트
 * 기본 버튼을 끄고(`config.conversation.list.isTalkToAgentViewEnabled: false`),
 * 종료된 대화일 때만 **새 대화를 만드는 버튼**을 푸터에 직접 그립니다.
 *
 * ## 다중 대화 설정에 따라 호출할 함수가 다릅니다
 * - `Multiple active conversations` (기본값) → `createConversation()` 으로 새 대화 생성
 * - `Single active conversation`              → 새 대화를 만들 수 없으므로
 *                                               `goToActiveConversation()` 으로 기존 대화 이동
 *
 * 대시보드 설정값은 `aiAgentInfo.isMultipleActiveConversationsEnabled` 로 읽어
 * 분기하므로, 설정을 바꿔도 코드를 고칠 필요가 없습니다.
 *
 * ## 적용
 * ```tsx
 * <FixedMessenger config={{ conversation: { list: { isTalkToAgentViewEnabled: false } } }} ...>
 *   <FixedMessenger.ConversationChildren>
 *     <ConversationLayout.Footer component={ClosedConversationFooter} />
 *   </FixedMessenger.ConversationChildren>
 * </FixedMessenger>
 * ```
 */
export function ClosedConversationFooter() {
  return (
    <>
      <StartNewConversationButton />
      {/* 입력창 등 기본 푸터는 그대로 유지합니다. */}
      <DefaultFooter />
    </>
  );
}
