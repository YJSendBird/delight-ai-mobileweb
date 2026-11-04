import { bridge } from './bridge';

/**
 * 메신저 안의 링크 · 첨부파일 클릭 처리
 *
 * ## 배경
 * SDK는 **이미지·동영상만 내부 뷰어**로 표시하고, 그 밖의 모든 링크
 * (마크다운 링크, 관리자 메시지 URL, 인용, CTA 버튼, PDF 등 비이미지 첨부파일)는
 * `window.open(url, '_blank')` 으로 **새 창 열기를 요청**합니다.
 *
 * `_blank` 는 "새 컨텍스트에서 열어라"는 뜻이고, **새 컨텍스트에는 히스토리가 없습니다.**
 * 그래서 웹뷰 환경에서 두 가지 문제가 생깁니다.
 *
 * 1. **PDF 등 외부 파일** — 닫기 UI 없는 화면이 열려 돌아갈 방법이 없음
 * 2. **자사 서비스 링크** — 히스토리 없이 이동하여, 뒤로가기 시 메인홈으로 떨어짐
 *
 * ## 해결
 * `handlers.onClickLink` 로 **`window.open` 이 호출되기 전에 가로채서**
 * URL 종류에 따라 네이티브로 분기합니다.
 *
 * - **자사 서비스 링크** → `navigate_internal` → 앱 내비게이션 스택에 push (히스토리 유지)
 * - **그 외(외부 링크·PDF)** → `open_external` → OS 기본 외부 뷰어 (닫기 버튼 기본 제공)
 *
 * 전용 브릿지 이벤트로만 도착하므로 **호출 출처가 챗봇임이 보장**됩니다.
 * 네이티브에서 `window.open` 을 가로채 판별할 때 필요한 별도 식별값이 필요 없습니다.
 *
 * @see https://github.com/sendbird/ai-agent-js/blob/main/.discussions/conversation/handle-link-taps/react.md
 */

/**
 * 자사 서비스로 간주할 호스트 목록
 *
 * 실제 서비스 도메인으로 교체하세요. 서브도메인을 쓴다면 모두 나열합니다.
 */
const INTERNAL_HOSTS = [
  'm.example.com',
  'www.example.com',
  'example.com',
];

/**
 * 자사 서비스 링크인지 판별합니다.
 *
 * ⚠️ **반드시 호스트 정확 일치로 검사하세요.**
 * `url.includes('example.com')` 같은 부분 문자열 비교는
 * `https://example.com.attacker.net/...` 을 자사 링크로 오인합니다.
 */
function isInternalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return INTERNAL_HOSTS.includes(host);
  } catch {
    return false;
  }
}

/**
 * 메신저에 전달할 링크 클릭 핸들러
 *
 * ```tsx
 * <FixedMessenger handlers={{ onClickLink: handleLinkClick }}>
 * ```
 */
export function handleLinkClick({ url }: { url: string }): void {
  if (!url) return;

  // SDK 기본 동작과 맞춥니다 — 프로토콜이 없으면 https 를 붙입니다.
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;

  if (!bridge.isNative()) {
    // 일반 브라우저에서는 SDK 기본 동작을 그대로 유지
    window.open(normalized, '_blank', 'noopener,noreferrer');
    return;
  }

  if (isInternalUrl(normalized)) {
    // 자사 서비스 → 앱 내비게이션으로 이동 (뒤로가기로 대화 복귀 가능)
    bridge.send('navigate_internal', { url: normalized });
    return;
  }

  // 외부 링크·PDF → OS 기본 뷰어
  bridge.send('open_external', { url: normalized });
}
