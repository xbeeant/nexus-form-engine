import { pureHtmlString } from '@xbeeant/form-engine-react';
import { Typography } from 'antd';
import type { WidgetProps } from './_shared';

export const htmlWidget = ({ value }: WidgetProps) => {
  const sanitized = pureHtmlString(value as string);

  return (
    <Typography>
      <div
        style={{ padding: '4px 0', minHeight: 24 }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: html渲染
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </Typography>
  );
};
