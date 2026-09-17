type Platform = 'ios' | 'android' | 'web';
type EventCallback = (data: any) => void;

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: ReturnType<typeof setTimeout>;
}

class WebViewBridge {
  private platform: Platform;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestId = 0;

  constructor() {
    this.platform = this.detectPlatform();
    this.setupGlobalListener();
  }

  /**
   * 플랫폼 감지
   */
  private detectPlatform(): Platform {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua) && (window as any).webkit?.messageHandlers?.native) {
      return 'ios';
    }
    if (/Android/i.test(ua) && (window as any).Android) {
      return 'android';
    }
    return 'web';
  }

  /**
   * 네이티브에서 웹으로 메시지 수신을 위한 글로벌 리스너 설정
   */
  private setupGlobalListener() {
    (window as any).__bridgeReceive = (event: string, data: any) => {
      // 일반 이벤트 처리
      const callbacks = this.eventListeners.get(event);
      if (callbacks) {
        callbacks.forEach((callback) => callback(data));
      }

      // 요청 응답 처리
      if (event.startsWith('__response_')) {
        const requestId = event.replace('__response_', '');
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          pending.resolve(data);
          this.pendingRequests.delete(requestId);
        }
      }
    };
  }

  /**
   * 단방향: 네이티브로 이벤트 전송
   */
  send(event: string, data?: any): void {
    const message = { event, data };

    switch (this.platform) {
      case 'ios':
        (window as any).webkit?.messageHandlers?.native?.postMessage(message);
        break;
      case 'android':
        (window as any).Android?.postMessage(JSON.stringify(message));
        break;
      case 'web':
        console.log('[Bridge] send (web mode):', event, data);
        break;
    }
  }

  /**
   * 양방향: 네이티브로 요청 후 응답 대기
   */
  request<T = any>(event: string, data?: any, timeout = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `${event}_${++this.requestId}_${Date.now()}`;
      const message = { event, data, requestId };

      // 타임아웃 설정
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${event}`));
      }, timeout);

      // 요청 등록
      this.pendingRequests.set(requestId, { resolve, reject, timeout: timer });

      // 메시지 전송
      switch (this.platform) {
        case 'ios':
          (window as any).webkit?.messageHandlers?.native?.postMessage(message);
          break;
        case 'android':
          (window as any).Android?.postMessage(JSON.stringify(message));
          break;
        case 'web':
          console.log('[Bridge] request (web mode):', event, data);
          // 웹 모드에서는 즉시 더미 응답
          clearTimeout(timer);
          this.pendingRequests.delete(requestId);
          resolve({} as T);
          break;
      }
    });
  }

  /**
   * 네이티브에서 웹으로 이벤트 수신 리스너 등록
   */
  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);

    // 리스너 제거 함수 반환
    return () => {
      const callbacks = this.eventListeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 리스너 제거
   */
  off(event: string, callback?: EventCallback): void {
    if (!callback) {
      this.eventListeners.delete(event);
      return;
    }

    const callbacks = this.eventListeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 현재 플랫폼 반환
   */
  getPlatform(): Platform {
    return this.platform;
  }

  /**
   * 네이티브 환경 여부
   */
  isNative(): boolean {
    return this.platform !== 'web';
  }
}

export const bridge = new WebViewBridge();
