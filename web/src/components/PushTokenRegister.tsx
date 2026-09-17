import { useMessengerContext, useMessengerSessionContext } from '@sendbird/ai-agent-messenger-react';
import { useEffect } from 'react';
import { bridge } from '../libs/bridge.ts';

export const PushTokenRegister = () => {
  const { chatSDK } = useMessengerContext();
  const { sdkUser } = useMessengerSessionContext();

  useEffect(() => {
    return bridge.on('push_token', (data: { token: string }) => {
      const token = data.token;
      const platform = bridge.getPlatform();
      const isConnected = !!sdkUser;

      if (token && isConnected) {
        if (platform === 'ios') {
          chatSDK.registerAPNSPushTokenForCurrentUser(token);
        } else if (platform === 'android') {
          chatSDK.registerFCMPushTokenForCurrentUser(token);
        }
      }
    });
  }, [chatSDK, sdkUser]);

  return null;
};
