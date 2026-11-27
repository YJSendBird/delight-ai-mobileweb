import { AppAwareMessageInput } from './AppAwareMessageInput.tsx';
import { StartNewConversationButton } from './StartNewConversationButton.tsx';

/**
 * 커스텀 입력창을 쓰는 푸터
 *
 * `ConversationLayout.Footer` 슬롯에 넣으면 SDK 기본 입력 영역을 대체합니다.
 * 종료된 대화의 "대화 시작" 버튼도 함께 유지합니다.
 *
 * ```tsx
 * <FixedMessenger.ConversationChildren>
 *   <ConversationLayout.Footer
 *     component={() => <AppAwareFooter supportsAttachment={params.appCapabilities.supportsAttachment} />}
 *   />
 * </FixedMessenger.ConversationChildren>
 * ```
 */
export function AppAwareFooter({ supportsAttachment }: { supportsAttachment: boolean }) {
  return (
    <>
      <StartNewConversationButton />
      <AppAwareMessageInput supportsAttachment={supportsAttachment} />
    </>
  );
}
