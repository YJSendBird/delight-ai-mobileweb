import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { AgentProviderContainer, Conversation, ConversationList } from '@sendbird/ai-agent-messenger-react';
import { ConversationStatus } from '@sendbird/chat/aiAgent';
import { createSessionInfo, parseAppParams } from '../utils/config';
import { bridge } from '../libs/bridge';
import type { GroupChannel } from '@sendbird/chat/groupChannel';
import { ChannelObserver } from '../components/ChannelObserver.tsx';
import { PushTokenRegister } from '../components/PushTokenRegister.tsx';
// import { customStringSet } from '../libs/strings.ts';

type Screen = 'conversation' | 'conversationList';

/**
 * CustomMessengerPage: AgentProviderContainer와 Conversation/ConversationList을 조합한 커스텀 예제 페이지
 */
function CustomMessengerPage() {
  const params = parseAppParams();

  const { context, onChangeChannel } = useContextObject(params?.aiAgentId || '', params?.initialContextObject || {});

  const [selectedChannelUrl, setSelectedChannelUrl] = useState<string | undefined>(params?.initialChannelUrl);
  const [currentScreen, setCurrentScreen] = useState<Screen>(
    params?.hasActiveConversation ? 'conversationList' : 'conversation',
  );

  // 이 페이지는 회원 상담 전용 (비회원 상담은 /simple 참고)
  if (!params || !params.userId || !params.authToken) {
    return <div>Missing required parameters: appId, aiAgentId, userId, or authToken</div>;
  }

  return (
    <AgentProviderContainer
      // 센드버드 앱 아이디
      appId={params.appId}
      // AI 에이전트 아이디
      aiAgentId={params.aiAgentId}
      // 사용자 세션 정보
      userSessionInfo={createSessionInfo(params.userId, params.authToken)}
      // ConversationList의 대화 상태 필터를 설정 (ConversationStatus.OPEN / CLOSED)
      queryParams={{
        conversationListParams: {
          filter: {
            aiAgentConversationStatusFilter: [ConversationStatus.OPEN],
          },
        },
      }}
      state={{
        opened: true,
        setOpened: () => bridge.send('quit'),
      }}
      context={context}
      language={'ko-KR'}
      // stringSet={customStringSet}
      enableExpandButton={false}
      entryStyle={{ width: '100%', height: '100%', position: 'fixed', top: 0, left: 0 }}
    >
      <Messenger
        selectedChannelUrl={selectedChannelUrl}
        setSelectedChannelUrl={setSelectedChannelUrl}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
      >
        <ChannelObserver onChangeChannel={onChangeChannel} />
      </Messenger>
      <PushTokenRegister />
    </AgentProviderContainer>
  );
}

type Props = {
  currentScreen: 'conversation' | 'conversationList';
  setCurrentScreen: (screen: 'conversation' | 'conversationList') => void;
  selectedChannelUrl?: string;
  setSelectedChannelUrl: (url: string | undefined) => void;
  children?: ReactNode;
};
const Messenger = ({ currentScreen, setCurrentScreen, selectedChannelUrl, setSelectedChannelUrl, children }: Props) => {
  // Access to Chat SDK and user session if needed
  // const { chatSDK } = useMessengerContext();
  // const { sdkUser, deauthenticate } = useMessengerSessionContext();

  return currentScreen === 'conversation' ? (
    <Conversation
      channelUrl={selectedChannelUrl} // 채널 URL 을 별도로 지정하지 않아도 동작합니다. (별도로 지정하지 않은 경우에는, 서버에서 받아온 가장 최근 활성 대화 혹은 새로운 채널이 표시됩니다.)
      onClearChannelUrl={() => setSelectedChannelUrl(undefined)}
      onNavigateToConversationList={() => setCurrentScreen('conversationList')}
      shouldMarkAsRead={currentScreen === 'conversation'}
    >
      {children}
    </Conversation>
  ) : (
    <ConversationList
      onOpenConversationView={(url) => {
        setSelectedChannelUrl(url);
        setCurrentScreen('conversation');
      }}
    />
  );
};

const useContextObject = (aiAgentId: string, initialContextObject: Record<string, string>) => {
  // 대화가 최초 생성될때 전달될 컨텍스트 객체를 관리하는 상태
  const [context] = useState<Record<string, string>>(initialContextObject);

  // 현재 보고있는 채널이 변경되는것을 관리하는 상태와 콜백
  const [channel, setChannel] = useState<GroupChannel>();
  const onChangeChannel = useCallback((channel: GroupChannel | undefined) => {
    setChannel(channel);
  }, []);

  useEffect(() => {
    const destructor = bridge.on('patch_context', (data: Record<string, string>) => {
      channel?.patchContext(aiAgentId, data); // 대화가 생성된 이후에, 추가로 컨텍스트를 패치하고 싶은 경우

      // setContext((prev) => ({ ...prev, ...data })); // 대화에 생성될 때 전달할 컨텍스트를 함께 패치하고 싶은 경우
    });

    return () => destructor();
  }, [channel, aiAgentId]);

  return { context, onChangeChannel };
};

export default CustomMessengerPage;
