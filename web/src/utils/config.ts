import { AnonymousSessionInfo, ManualSessionInfo } from '@sendbird/ai-agent-messenger-react';
import { bridge } from '../libs/bridge';

export interface AppParams {
  appId: string;
  aiAgentId: string;
  /** 회원 상담일 때만 존재. 없으면 비회원(게스트) 모드 */
  userId?: string;
  /** 회원 상담일 때만 존재. 없으면 비회원(게스트) 모드 */
  authToken?: string;
  /** userId/authToken 없이 진입한 비회원(게스트) 상담 여부 */
  isGuest: boolean;
  hasActiveConversation: boolean;
  initialContextObject: Record<string, string>;
  initialChannelUrl?: string;
}

/**
 * URL 파라미터로부터 앱 설정을 파싱합니다.
 */
export function parseAppParams(): AppParams | null {
  const urlParams = new URLSearchParams(window.location.search);

  const appId = urlParams.get('appId');
  const aiAgentId = urlParams.get('aiAgentId');
  const userId = urlParams.get('userId');
  const authToken = urlParams.get('authToken');
  const hasActiveConversation = urlParams.get('hasActiveConversation') === 'true';
  const initialChannelUrl = urlParams.get('initialChannelUrl') ?? undefined;

  // context_ prefix로 시작하는 모든 URL params를 initialContextObject로 변환
  const initialContextObject: Record<string, string> = {};
  for (const [key, value] of urlParams.entries()) {
    if (key.startsWith('context_')) {
      const contextKey = key.replace('context_', '');
      initialContextObject[contextKey] = value;
    }
  }

  if (!appId || !aiAgentId) {
    return null;
  }

  return {
    appId,
    aiAgentId,
    userId: userId ?? undefined,
    authToken: authToken ?? undefined,
    // userId/authToken이 모두 전달된 경우에만 회원 상담, 아니면 비회원(게스트) 상담
    isGuest: !(userId && authToken),
    hasActiveConversation,
    initialContextObject,
    initialChannelUrl,
  };
}

/**
 * 비회원(게스트) 세션 정보를 생성합니다.
 * SDK가 내부적으로 익명 유저를 발급하고 토큰 만료/갱신까지 관리하므로
 * 네이티브 브릿지를 통한 세션 토큰 발급이 필요 없습니다.
 */
export function createAnonymousSessionInfo(): AnonymousSessionInfo {
  return new AnonymousSessionInfo();
}

/**
 * ManualSessionInfo 객체를 생성합니다.
 */
export function createSessionInfo(userId: string, authToken: string): ManualSessionInfo {
  return new ManualSessionInfo({
    userId,
    authToken,
    sessionHandler: {
      async onSessionTokenRequired(resolve, reject) {
        try {
          const token = await bridge.request<string>('session_token');
          resolve(token);
        } catch (error) {
          reject(error as Error);
        }
      },
      onSessionError() {
        // onSessionTokenRequired 에서 reject(error) 시 호출됩니다.
        // 1. 메세지 전송의 경우, 전송한 메세지가 pending 상태에 머물게 되며 (재연결시 자동으로 전송 됨)
        // 2. 대화 목록과 같은 API 동작들의 호출에 실패하게 됩니다. (사용자에게 노출되는 에러 메세지는 없음)
        //
        // 이 경우, ManualSessionInfo 에 전달되는 authToken 을 갱신하고
        // useMessengerSessionContext() 혹은 messengerRef 를 통한 authenticate() 를 호출하여 재인증을 시도할 수 있습니다.
      },
      onSessionClosed() {
        // useMessengerSessionContext() 혹은 messengerRef 를 통한 deauthenticate() 호출시 트리거 됩니다.
      },
    },
  });
}
