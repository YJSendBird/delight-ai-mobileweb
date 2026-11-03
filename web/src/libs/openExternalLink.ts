import { bridge } from './bridge';

/**
 * 메신저 안의 링크 클릭을 네이티브 외부 뷰어로 연결
 *
 * ## 배경
 * SDK는 **이미지·동영상만 내부 뷰어**로 표시합니다.
 * PDF를 비롯한 그 밖의 첨부파일과 마크다운 링크·인용·CTA 버튼은
 * `window.open(url, '_blank')`으로 **새 창 열기를 요청**합니다.
 *
 * 웹뷰 안에서 이 요청이 그대로 실행되면 다음 문제가 생깁니다.
 * - iOS: 앱이 `WKUIDelegate`로 처리해 주지 않으면 무시되거나,
 *   닫기 UI가 없는 새 WebView로 열려 **돌아갈 방법이 없습니다.**
 * - Android: 같은 WebView에서 열리면 챗봇 화면을 덮어버립니다.
 *
 * ## 해결
 * `handlers.onClickLink`로 **`window.open`이 호출되기 전에 가로채서**
 * 브릿지로 네이티브에 넘깁니다. 네이티브는 OS 기본 뷰어
 * (iOS `SFSafariViewController`, Android `ACTION_VIEW`)로 열면 되고,
 * 이들 뷰어에는 **닫기/완료 버튼이 기본 제공**됩니다.
 *
 * ## "챗봇이 호출한 새 창인지" 구분하는 방법
 * 네이티브에서 `window.open`을 가로채 판별하려 하면
 * 페이지의 다른 스크립트가 띄운 새 창과 구분할 수 없습니다.
 * 반면 이 방식은 **전용 브릿지 이벤트(`open_external`)로 도착**하므로
 * 출처가 챗봇임이 보장됩니다. 별도의 구분값을 설계할 필요가 없습니다.
 *
 * @see https://github.com/sendbird/ai-agent-js/blob/main/.discussions/conversation/handle-link-taps/react.md
 */
export function openExternalLink({ url }: { url: string }): void {
  if (!url) return;

  // SDK 기본 동작과 맞춥니다 — 프로토콜이 없으면 https 를 붙입니다.
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  if (bridge.isNative()) {
    // 네이티브 앱 안에서 실행 중 → 외부 뷰어로 위임
    bridge.send('open_external', { url: normalized });
    return;
  }

  // 일반 브라우저에서는 SDK 기본 동작을 그대로 유지
  window.open(normalized, '_blank', 'noopener,noreferrer');
}
