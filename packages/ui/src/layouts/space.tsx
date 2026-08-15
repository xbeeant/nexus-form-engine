import { Space, type SpaceProps } from 'antd';
import type { PropsWithChildren } from 'react';
import type { WidgetProps } from '../widgets';

export const spaceLayout = ({
  children,
  props,
}: PropsWithChildren<WidgetProps<SpaceProps>>) => (
  <Space
    direction={props?.direction ?? 'horizontal'}
    size={props?.size ?? 'small'}
    align={props?.align}
    wrap={props?.wrap}
    style={{ marginBottom: 16, ...props?.style }}
    {...props}
  >
    {children}
  </Space>
);
