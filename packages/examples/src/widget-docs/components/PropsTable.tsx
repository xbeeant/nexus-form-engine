// ============================================================================
// PropsTable — 属性介绍表
// 从 @nexus/form-engine-ui 的 widgetSchemas 描述符自动生成（antd API 表格风格）：
// 属性名 | 说明 | 类型 | 默认值
// ============================================================================

import { widgetSchemas } from '@nexus/form-engine-ui';
import { Alert, Table, Typography } from 'antd';
import type { WidgetDoc } from '../types';

interface PropsTableProps {
  doc: WidgetDoc;
}

/** 描述符字段 → 展示类型（含枚举选项提示） */
function formatType(def: Record<string, any>): string {
  const typeStr = def.type ?? 'any';
  const enumValues = Array.isArray(def.enum)
    ? def.enum
    : def.props?.options
      ? (def.props.options as Array<{ value: unknown }>).map((o) => o.value)
      : undefined;
  return enumValues?.length
    ? `${typeStr} | ${enumValues.join(' | ')}`
    : typeStr;
}

export function PropsTable({ doc }: PropsTableProps) {
  const schema = widgetSchemas[doc.id];
  if (!schema && !doc.fallbackProps) {
    return (
      <Alert
        type='warning'
        showIcon
        message={`未找到 ${doc.id} 的属性描述符（widgetSchemas），且无 fallbackProps`}
      />
    );
  }

  const rows = doc.fallbackProps
    ? doc.fallbackProps.map((p) => ({
        key: p.name,
        name: p.name,
        desc: p.description,
        type: p.type,
        default: p.defaultValue ?? '-',
      }))
    : Object.entries(schema)
        .filter(([key]) => !doc.excludeProps?.includes(key))
        .map(([name, def]) => {
          const d = def as Record<string, any>;
          const descParts: string[] = [];
          if (d.title) {
            descParts.push(d.title);
          }
          if (d.placeholder) {
            descParts.push(`提示：${d.placeholder}`);
          }
          return {
            key: name,
            name,
            desc: descParts.join('；'),
            type: formatType(d),
            default: d.default !== undefined ? String(d.default) : '-',
          };
        });

  return (
    <section style={{ marginTop: 32 }}>
      <Typography.Title level={3}>属性介绍（Props）</Typography.Title>
      <Typography.Paragraph type='secondary'>
        {doc.fallbackProps
          ? `${doc.id} 为布局节点，以下属性写在布局节点本身（非 props），布局 Key 不进入 formData 数据路径。`
          : `${doc.id} 支持 ${rows.length} 个属性，均可写入字段节点的{' '}
          <code>props</code> 中；设计器中通过 PropertyPanel「组件属性」分区编辑。`}
      </Typography.Paragraph>
      <Table
        size='small'
        pagination={false}
        dataSource={rows}
        columns={[
          {
            title: '属性名',
            dataIndex: 'name',
            key: 'name',
            width: 200,
            render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
          },
          { title: '说明', dataIndex: 'desc', key: 'desc' },
          {
            title: '类型',
            dataIndex: 'type',
            key: 'type',
            width: 200,
            render: (v: string) => <Typography.Text code>{v}</Typography.Text>,
          },
          {
            title: '默认值',
            dataIndex: 'default',
            key: 'default',
            width: 120,
          },
        ]}
      />
    </section>
  );
}
