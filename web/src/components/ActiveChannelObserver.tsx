import { useLayoutEffect } from 'react';
import { useMessengerSessionContext } from '@sendbird/ai-agent-messenger-react';

type Destructor = () => void;
type Props = {
  onChangeActiveChannel: (activeChannel?: { url: string }) => void | Destructor;
};

export const ActiveChannelObserver = ({ onChangeActiveChannel }: Props) => {
  const { activeChannel } = useMessengerSessionContext();

  useLayoutEffect(() => {
    return onChangeActiveChannel(activeChannel);
  }, [onChangeActiveChannel, activeChannel]);

  return null;
};
