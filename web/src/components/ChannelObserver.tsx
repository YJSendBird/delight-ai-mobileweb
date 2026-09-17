import { useLayoutEffect } from 'react';
import { useConversationContext } from '@sendbird/ai-agent-messenger-react';
import { GroupChannel } from '@sendbird/chat/groupChannel';

type Destructor = () => void;
type Props = {
  onChangeChannel: (channel?: GroupChannel) => void | Destructor;
};

export const ChannelObserver = ({ onChangeChannel }: Props) => {
  const { channelSource } = useConversationContext();

  useLayoutEffect(() => {
    return onChangeChannel(channelSource.channel);
  }, [channelSource.channel, onChangeChannel]);

  return null;
};
