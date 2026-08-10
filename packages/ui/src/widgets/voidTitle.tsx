import { Typography } from 'antd';
import type { WidgetProps } from './_shared';

export const voidTitleWidget = ({ title, description }: WidgetProps) => (
  <div data-nexus-void-title style={{ margin: '8px 0' }}>
    {title && (
      <Typography.Text strong style={{ fontSize: 14 }}>
        {title}
      </Typography.Text>
    )}
    {description && (
      <Typography.Text
        type='secondary'
        style={{ display: 'block', marginTop: 4 }}
      >
        {description}
      </Typography.Text>
    )}
  </div>
);
