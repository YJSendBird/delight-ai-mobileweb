import { useCallback, useEffect, useRef, useState } from 'react';
import { useMessengerContext, type FixedLauncherProps } from '@sendbird/ai-agent-messenger-react';
import { ConnectionState, ConnectionHandler } from '@sendbird/chat';
import { GroupChannelHandler } from '@sendbird/chat/groupChannel';
import type { AIAgentGroupChannelUnreadMessageCountParams } from '@sendbird/chat/aiAgent';

/**
 * 안 읽은 메시지 "숫자" 카운트 조회 훅
 *
 * SDK 기본 런처는 레드닷(점)만 표시하므로, 숫자 뱃지가 필요하면 이 훅으로 직접 조회합니다.
 * 내부적으로 SDK가 레드닷 계산에 사용하는 것과 동일한 API(`chatSDK.aiAgent.getUnreadMessageCount`)를
 * 사용하되, boolean이 아닌 `total` 숫자를 그대로 반환합니다.
 *
 * @param opened 메신저 열림 여부. 열리면 카운트를 0으로 초기화합니다.
 * @param params 집계 대상 필터 (특정 에이전트만 집계하려면 `aiAgentIds` 지정)
 */
export function useAIAgentUnreadCount(opened: boolean, params?: AIAgentGroupChannelUnreadMessageCountParams) {
  const { chatSDK } = useMessengerContext();
  const [count, setCount] = useState(0);

  // 비동기 응답이 역순으로 도착할 때 오래된 결과가 최신 값을 덮어쓰지 않도록 요청 순번을 관리
  const requestIdRef = useRef(0);

  const refresh = useCallback(() => {
    const requestId = ++requestIdRef.current;
    chatSDK.aiAgent
      .getUnreadMessageCount(params)
      .then((result) => {
        if (requestId === requestIdRef.current) setCount(result.total);
      })
      .catch(() => {
        // 조회 실패 시 기존 카운트 유지 (뱃지가 깜빡이지 않도록)
      });
  }, [chatSDK, params]);

  // 1) 최초 진입 시 1회 조회
  useEffect(() => {
    if (chatSDK.connectionState === ConnectionState.OPEN) refresh();
  }, [chatSDK, refresh]);

  // 2) 연결/재연결 시 재조회 (백그라운드 복귀, 네트워크 복구 등)
  useEffect(() => {
    const handlerId = 'unread-count-connection';
    chatSDK.addConnectionHandler(
      handlerId,
      new ConnectionHandler({
        onConnected: () => refresh(),
        onReconnectSucceeded: () => refresh(),
      }),
    );
    return () => chatSDK.removeConnectionHandler(handlerId);
  }, [chatSDK, refresh]);

  // 3) 실시간 갱신 — 새 메시지 수신 시 즉시 재조회
  //    (SDK 기본 레드닷은 이 단계가 없어 접속 시점 기준으로만 갱신됩니다)
  useEffect(() => {
    const handlerId = 'unread-count-channel';
    chatSDK.groupChannel.addGroupChannelHandler(
      handlerId,
      new GroupChannelHandler({
        onMessageReceived: () => refresh(),
        onChannelChanged: () => refresh(), // 읽음 처리 등으로 카운트가 줄어드는 경우
      }),
    );
    return () => chatSDK.groupChannel.removeGroupChannelHandler(handlerId);
  }, [chatSDK, refresh]);

  // 4) 메신저를 열면 읽은 것으로 보고 뱃지를 즉시 비움
  useEffect(() => {
    if (opened) {
      requestIdRef.current++; // 진행 중인 조회 결과 무시
      setCount(0);
    }
  }, [opened]);

  return count;
}

/**
 * 숫자 뱃지가 달린 커스텀 런처
 *
 * SDK가 `opened`/`setOpened`/`size`/`style`을 주입하므로, 버튼 디자인만 구현하면 됩니다. *
 * [사용 방법] SimpleChatPage.tsx 등에서 아래와 같이 연결합니다.
 *
 *   <FixedMessenger ... state={{ opened, setOpened }}>
 *     <FixedMessenger.Launcher component={UnreadCountLauncher} />
 *     <FixedMessenger.Style position="end-bottom" launcherSize={56} margin={{ end: 24, bottom: 28 }} />
 *   </FixedMessenger>
 *
 * 커스텀 런처를 지정하면 SDK 기본 런처(및 내장 레드닷)는 렌더링되지 않으므로,
 * 미읽음 표시는 이 컴포넌트가 전적으로 책임집니다.
 */
export function UnreadCountLauncher({ opened, setOpened, size = 56, style }: FixedLauncherProps) {
  const unreadCount = useAIAgentUnreadCount(opened);

  return (
    <button
      type="button"
      aria-label={unreadCount > 0 ? `상담 열기, 안 읽은 메시지 ${unreadCount}개` : '상담 열기'}
      onClick={() => setOpened(!opened)}
      style={{
        // SDK가 계산한 배치 스타일(position: fixed, bottom/inset-inline-end, z-index)을 그대로 적용합니다.
        // ⚠️ position을 relative 등으로 덮어쓰면 런처가 화면 좌측 상단으로 밀려나므로 주의하세요.
        //    아래 뱃지는 이 fixed 요소를 기준으로 absolute 배치됩니다.
        ...style,
        width: size,
        height: size,
        padding: 0,
        border: 'none',
        borderRadius: '50%',
        background: '#6210cc',
        cursor: 'pointer',
      }}
    >
      {/* 런처 아이콘 — 자사 이미지(<img src="...">)로 교체하셔도 됩니다 */}
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.4-9 8.4 8.4 0 0 1 8.6 9z" />
      </svg>

      {/* 숫자 뱃지 */}
      {!opened && unreadCount > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            insetInlineEnd: -2,
            minWidth: 20,
            height: 20,
            padding: '0 6px',
            borderRadius: 10,
            background: '#e53935',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            lineHeight: '20px',
            textAlign: 'center',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}
