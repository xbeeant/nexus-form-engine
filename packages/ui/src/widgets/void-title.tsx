import { Typography } from 'antd';
import { useContext } from 'react';
import { FieldMetaContext, type WidgetProps } from './_shared';

export const voidTitleWidget = (props: WidgetProps) => {
  // NexusForm 渲染时 title/description 由 FieldWrapper 通过 Context 透传，
  // 组件内优先使用自身 props（供脱离 NexusForm 独立渲染的场景）
  const meta = useContext(FieldMetaContext);
  const title = props.title ?? meta?.title;
  const description = props.description ?? meta?.description;

  return (
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
};
