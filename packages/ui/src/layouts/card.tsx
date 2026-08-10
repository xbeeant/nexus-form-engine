import { Card, type CardProps } from 'antd';
import type { PropsWithChildren } from 'react';
import type { WidgetProps } from '../widgets';

export const cardLayout = ({
  title,
  children,
  node: _node,
  props,
}: PropsWithChildren<WidgetProps<CardProps>>) => {
  return (
    <Card title={title} {...props}>
      {children}
    </Card>
  );
};
