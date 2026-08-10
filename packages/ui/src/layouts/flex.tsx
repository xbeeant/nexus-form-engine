import { Flex, type FlexProps } from 'antd';
import type { CSSProperties, PropsWithChildren } from 'react';
import type { WidgetProps } from '../widgets';

export const flexLayout = ({
  children,
  direction,
  props,
}: PropsWithChildren<WidgetProps<FlexProps>>) => {
  const style: CSSProperties = {
    marginBottom: 16,
  };

  return (
    <Flex vertical={direction === 'column'} style={style} {...props}>
      {children}
    </Flex>
  );
};
