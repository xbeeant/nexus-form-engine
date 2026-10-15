import { Card } from 'antd-mobile';
import type { PropsWithChildren } from 'react';
import type { WidgetProps } from '../widgets';

export const cardMobileLayout = ({
  title,
  children,
  node: _node,
  props,
}: PropsWithChildren<WidgetProps>) => {
  return (
    <Card title={title} {...(props as Record<string, unknown>)}>
      {children}
    </Card>
  );
};
