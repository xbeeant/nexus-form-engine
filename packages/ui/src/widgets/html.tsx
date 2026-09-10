import { pureHtmlString } from '@xbeeant/form-engine-react';
import { Typography } from 'antd';
import type { WidgetProps } from './_shared';

export const htmlWidget = ({ value }: WidgetProps) => {
  // 无内容时默认显示占位符 "-"（只读模式空值对齐 ReadOnlyDisplay 空态）
  if (value === undefined || value === null || value === '') {
    return <span style={{ color: '#bfbfbf' }}>-</span>;
  }
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
