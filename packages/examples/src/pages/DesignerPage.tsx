// ============================================================================
// DesignerPage — Schema 设计器
// 可视化拖拽设计 + JSON 编辑，实时预览 Schema
// ============================================================================

import { Designer } from '@nexus/form-engine-designer';
import { registerAntdUI } from '@nexus/form-engine-ui';
import { Typography } from 'antd';
import {
  customWidgetCatalog,
  demoSchema,
  externalFields,
  widgetSchemas,
} from '../site/demoSchema';

const { Paragraph } = Typography;

export default function DesignerPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          background: '#fff',
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Schema 设计器
        </Typography.Title>
        <Paragraph type='secondary' style={{ margin: '4px 0 0', fontSize: 12 }}>
          从左侧拖拽 Widget / Layout
          到画布，右侧编辑属性；「Schema」标签页可直接粘贴 / 编辑 JSON。
          支持外部字段列表与自定义 widget catalog 扩展。
        </Paragraph>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Designer
          schema={demoSchema}
          propertySchemaMap={widgetSchemas}
          registerUI={registerAntdUI}
          fields={externalFields}
          widgetCatalog={customWidgetCatalog}
        />
      </div>
    </div>
  );
}
