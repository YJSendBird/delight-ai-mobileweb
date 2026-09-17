import { ConversationHeaderLayout, FixedMessenger, type MessengerSessionRef } from '@sendbird/ai-agent-messenger-react';
import { ConversationStatus } from '@sendbird/chat/aiAgent';
import { createAnonymousSessionInfo, createSessionInfo, parseAppParams } from '../utils/config';
import { bridge } from '../libs/bridge';
import { ActiveChannelObserver } from '../components/ActiveChannelObserver.tsx';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { PushTokenRegister } from '../components/PushTokenRegister.tsx';

// import { customStringSet } from '../libs/strings.ts';

/**
 * SimpleChatPage: FixedMessenger를 사용한 심플한 예제 페이지
 */
function SimpleChatPage() {
  const params = parseAppParams();

  // 메신저의 일부 메소드를 직접 호출하기 위한 Ref
  const messengerRef = useRef<MessengerSessionRef>(null);

  // 각 대화가 최초에 생성될때 전달될 초기 컨텍스트 객체
  const { context, onChangeActiveChannel } = useContextObject(messengerRef, params?.initialContextObject || {});

  // 메신저 열림/닫힘 상태 (초기 진입 시 닫힘 — 런처 버튼 클릭으로 열기)
  const [opened, setOpened] = useState(false);

  // X(닫기) 버튼: 세션 종료 — 네이티브에 웹뷰 종료를 요청 (런처 클릭 시에는 열기만 수행)
  const handleSetOpened = useCallback((next: boolean) => {
    if (next) setOpened(true);
    else bridge.send('quit');
  }, []);

  // 최소화 버튼: 오버레이를 닫고 런처(플로팅 버튼)로 복귀
  const minimize = useCallback(() => setOpened(false), []);

  if (!params) {
    return <div>Missing required parameters: appId or aiAgentId</div>;
  }

  return (
    <FixedMessenger
      ref={messengerRef}
      // 센드버드 앱 아이디
      appId={params.appId}
      // AI 에이전트 아이디
      aiAgentId={params.aiAgentId}
      // 사용자 세션 정보 (userId/authToken 없이 진입하면 비회원(게스트) 세션으로 대화)
      userSessionInfo={
        params.isGuest ? createAnonymousSessionInfo() : createSessionInfo(params.userId!, params.authToken!)
      }
      // 초기 화면을 설정합니다.
      entryPoint={params.hasActiveConversation ? 'ConversationList' : 'Conversation'}
      // ConversationList 의 대화 상태 필터를 설정 (ConversationStatus.OPEN / CLOSED)
      queryParams={{
        conversationListParams: {
          filter: {
            aiAgentConversationStatusFilter: [ConversationStatus.OPEN],
          },
        },
      }}
      // 창이 열려있는지 여부를 설정합니다. (X 버튼 = 세션 종료, 런처 클릭 = 열기)
      state={{ opened, setOpened: handleSetOpened }}
      context={context}
      language={'ko-KR'}
      // stringSet={customStringSet}
    >
      {/* 런처(플로팅 버튼)의 위치/크기/여백 스타일 */}
      <FixedMessenger.Style
        position={'end-bottom'}
        launcherSize={56}
        margin={{ start: 24, end: 24, bottom: 28, top: 24 }}
      />
      {/* 대화 화면 헤더의 우측 영역에 최소화 버튼 추가 (기본 버튼들 앞에 배치) */}
      <FixedMessenger.ConversationChildren>
        <ConversationHeaderLayout.EndArea
          component={() => (
            <>
              <MinimizeButton onClick={minimize} />
              <ConversationHeaderLayout.defaults.components.EndArea />
            </>
          )}
        />
      </FixedMessenger.ConversationChildren>
      <ActiveChannelObserver onChangeActiveChannel={onChangeActiveChannel} />
      <PushTokenRegister />
    </FixedMessenger>
  );
}

/** 헤더용 최소화(런처로 복귀) 버튼 */
const MinimizeButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    aria-label="채팅창 최소화"
    onClick={onClick}
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  </button>
);

const useContextObject = (
  messengerRef: RefObject<MessengerSessionRef | null>,
  initialContextObject: Record<string, string>,
) => {
  // 대화가 최초 생성될때 전달될 컨텍스트 객체를 관리하는 상태
  const [context] = useState<Record<string, string>>(initialContextObject);

  // 서버로부터 활성화된 채널 정보를 수신했는지 여부를 관리하는 상태와 콜백
  const [isActiveConversationFetched, setIsActiveConversationFetched] = useState(false);
  const onChangeActiveChannel = useCallback((activeChannel?: { url: string }) => {
    setIsActiveConversationFetched(!!activeChannel);
  }, []);

  useEffect(() => {
    const destructor = bridge.on('patch_context', (data: Record<string, string>) => {
      if (isActiveConversationFetched) messengerRef.current?.patchContext(data); // 대화가 생성된 이후에, 추가로 컨텍스트를 패치하고 싶은 경우

      // setContext((prev) => ({ ...prev, ...data })); // 대화에 생성될 때 전달할 컨텍스트를 함께 패치하고 싶은 경우
    });

    return () => destructor();
  }, [isActiveConversationFetched, messengerRef]);

  return { context, onChangeActiveChannel };
};

export default SimpleChatPage;
