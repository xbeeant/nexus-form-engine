import { Typography } from 'antd';
import { type WidgetProps, withFormItem } from './_shared';

export const htmlWidget = withFormItem(({ value }: WidgetProps) => {
  return (
    <Typography>
      <div
        style={{ padding: '4px 0', minHeight: 24 }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: html渲染
        dangerouslySetInnerHTML={{ __html: (value as string) ?? '' }}
      />
    </Typography>
  );
});
