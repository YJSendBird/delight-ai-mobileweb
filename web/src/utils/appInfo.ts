/**
 * User-Agent 에 실린 앱 정보 파싱
 *
 * 네이티브 앱이 웹뷰 User-Agent 에 자기 정보를 덧붙이는 경우가 많습니다.
 * 이 값이 있으면 **앱이 따로 값을 넘겨주지 않아도** 웹에서 버전을 판단할 수 있습니다.
 *
 * 예시 UA 조각:
 *   ... appver='1.00.11' appos='a' appname='myapp' ...
 *
 * 포맷은 앱마다 다르므로 실제 UA 를 확인한 뒤 정규식을 맞춰 주세요.
 */
export interface AppInfo {
  /** 앱 이름 (예: 'myapp') */
  name?: string;
  /** 앱 OS ('a' = Android, 'i' = iOS 등 앱이 정한 값) */
  os?: string;
  /** 앱 버전 (예: '1.00.11') */
  version?: string;
}

/**
 * UA 에서 `key='value'` / `key=value` 형태의 값을 꺼냅니다.
 * 따옴표는 작은따옴표·큰따옴표 모두 허용하고, 없어도 동작합니다.
 */
function readUAField(ua: string, key: string): string | undefined {
  const matched = ua.match(new RegExp(`${key}\\s*=\\s*['"]?([^'";,\\s)]+)`, 'i'));
  return matched?.[1];
}

export function parseAppInfo(ua: string = navigator.userAgent): AppInfo {
  return {
    name: readUAField(ua, 'appname'),
    os: readUAField(ua, 'appos'),
    version: readUAField(ua, 'appver'),
  };
}

/**
 * 버전 문자열 비교. `a >= b` 이면 true.
 *
 * ⚠️ 문자열 비교를 쓰면 안 됩니다 — `'1.00.9' > '1.00.12'` 가 참이 됩니다.
 * 숫자 단위로 쪼개서 비교합니다. (`'1.00.9'` → [1, 0, 9])
 */
export function isVersionAtLeast(version: string | undefined, minimum: string): boolean {
  if (!version) return false;

  const toParts = (v: string) => v.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const current = toParts(version);
  const target = toParts(minimum);
  const length = Math.max(current.length, target.length);

  for (let i = 0; i < length; i += 1) {
    const left = current[i] ?? 0;
    const right = target[i] ?? 0;
    if (left !== right) return left > right;
  }
  return true; // 완전히 같은 버전
}
