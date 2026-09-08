// ============================================================================
// LayoutDemoPage — 表单布局演示：column / width / colSpan（统一 24 栅格语义）
//
// 设计语义（与运行时实现一致）：
// - 表单顶层始终是统一的 24 栅格容器（gridTemplateColumns: repeat(24, 1fr)）
// - 表单级 column：未显式设置 width/colSpan 的字段默认占 round(24/column) 格，
//   即「一行显示 column 个等宽字段」，放满自动换行
// - 字段级 width（百分比 '50%'，或 0~1 数值比例）：字段占整个表单宽度的比例，
//   换算为 gridColumn: span round(24 × 比例)
// - 显式 colSpan（24 栅格单位）优先级最高，直接作为跨度
// - 布局节点（card/grid/tabs/...）：同样可设 width 占整个表单宽度比例；
//   进入非栅格容器（card/flex 等）后子字段 width 回退为字面生效
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Card, Segmented, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/code-block';
import { MainArea } from '../site/main-area';

const { Paragraph, Text, Title } = Typography;

// ── 演示 1：表单级 column 控制默认等分 ────────────────────────────────────
// 未显式设置 width 的字段默认占 round(24/column) 格；
// 单独设置 width: '100%' 的字段始终占满整行。
const columnSchem = {
  type: 'object',
  properties: {
    fieldA: { type: 'string', widget: 'input', title: '字段 A（默认宽度）' },
    fieldB: {
      type: 'string',
      widget: 'input',
      title: '字段 B（默认宽度）',
    },
    fieldC: {
      type: 'string',
      widget: 'input',
      title: '字段 C（默认宽度）',
    },
    fieldD: {
      type: 'string',
      widget: 'input',
      title: '字段 D（默认宽度）',
    },
    fieldFull: {
      type: 'string',
      widget: 'input',
      title: '字段 E（width "100%"）',
      width: '100%',
    },
  },
} satisfies NexusSchema;

// ── 演示 2：width 占比混合 ─────────────────────────────────────────────────
// width 表示字段占「整个表单」宽度的比例，自动换算为 24 栅格跨度。
const widthSchema = {
  type: 'object',
  properties: {
    halfA: {
      type: 'string',
      widget: 'input',
      title: '50%',
      width: '50%',
    },
    halfB: {
      type: 'string',
      widget: 'input',
      title: '50%',
      width: '50%',
    },
    quarterA: {
      type: 'string',
      widget: 'input',
      title: '25%',
      width: '25%',
    },
    quarterB: {
      type: 'string',
      widget: 'input',
      title: '25%',
      width: '25%',
    },
    halfC: {
      type: 'string',
      widget: 'input',
      title: '50%',
      width: '50%',
    },
    thirdA: {
      type: 'string',
      widget: 'input',
      title: '33.33%',
      width: 1 / 3,
    },
    thirdB: {
      type: 'string',
      widget: 'input',
      title: '33.33%',
      width: 1 / 3,
    },
    thirdC: {
      type: 'string',
      widget: 'input',
      title: '33.34%',
      width: 1 / 3,
    },
    full: {
      type: 'string',
      widget: 'input',
      title: '100%',
      width: '100%',
    },
  },
} satisfies NexusSchema;

// ── 演示 3：布局节点 width + 容器 column + 非栅格容器字面 width ──
const layoutSchema = {
  type: 'object',
  properties: {
    // grid 布局节点：内部默认按 column=4 等分（每子项 span 6）
    infoGrid: {
      type: 'grid',
      title: 'grid 布局节点（column: 4）',
      column: 4,
      properties: {
        name: {
          type: 'string',
          widget: 'input',
          title: '姓名（默认宽度）',
        },
        age: {
          type: 'number',
          widget: 'number',
          title: '年龄（默认宽度）',
        },
        city: {
          type: 'string',
          widget: 'input',
          title: '城市（width "50%"）',
          width: '50%',
        },
        phone: {
          type: 'string',
          widget: 'input',
          title: '电话（colSpan 6）',
          colSpan: 6,
        },
        remark: {
          type: 'string',
          widget: 'textarea',
          title: '备注（colSpan 24 整行）',
          colSpan: 24,
        },
      },
    },
    // 两个 card 各占整个表单宽度的一半（width: '50%'）
    leftCard: {
      type: 'card',
      title: 'card 布局节点（width "50%"）',
      width: '50%',
      properties: {
        // 非栅格容器内 width 字面生效：两个 50% 字段在卡片内并排
        subHalfA: {
          type: 'string',
          widget: 'input',
          title: '卡片内 50%',
          width: '50%',
        },
        subHalfB: {
          type: 'string',
          widget: 'input',
          title: '卡片内 50%',
          width: '50%',
        },
        subFull: {
          type: 'string',
          widget: 'input',
          title: '卡片内默认满宽',
        },
      },
    },
    rightCard: {
      type: 'card',
      title: 'card 布局节点（width "50%"）',
      width: '50%',
      properties: {
        r1: {
          type: 'string',
          widget: 'input',
          title: '右侧字段',
        },
        r2: {
          type: 'string',
          widget: 'input',
          title: '右侧字段',
        },
      },
    },
  },
} satisfies NexusSchema;

const snippet = `// 表单级 column：未设 width 的字段默认一行显示 column 个等宽字段
const schema = {
  type: 'object',
  column: 2, // 一行 2 列，默认占位 round(24/2) = span 12
  properties: {
    a: { type: 'string', widget: 'input', title: 'A' },
    b: { type: 'string', widget: 'input', title: 'B' },
    // field-level width：占整个表单宽度比例 → span round(24 × 50%) = 12
    c: { type: 'string', widget: 'input', title: 'C', width: '50%' },
    // 显式 colSpan（24 栅格单位）优先级最高
    d: { type: 'string', widget: 'input', title: 'D', colSpan: 8 },
  },
};

// 布局节点同样可用 width 占表单宽度，内部再按 column/width 组织
properties: {
  cardA: {
    type: 'card', title: '半宽卡片', width: '50%',
    properties: {
      // 非栅格容器内 width 字面生效（inline-block 并排）
      inA: { type: 'string', widget: 'input', title: '卡片内 50%', width: '50%' },
    },
  },
  gridA: {
    type: 'grid', column: 4,
    properties: {
      g1: { type: 'string', widget: 'input', title: 'g1' },
      g2: { type: 'string', widget: 'input', title: 'g2' },
    },
  },
}`;

// 自包含演示组件：独立引擎宿主 + antd UI 注册
function DemoSection({
  title,
  extra,
  schema,
  column,
  renderInline = false,
}: {
  title: string;
  extra?: React.ReactNode;
  schema: NexusSchema;
  column?: number;
  renderInline?: boolean;
}) {
  const [form] = useForm();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    registerAntdUI(form.getEngine());
  }, [form]);

  return (
    <Card title={title} size='small' style={{ marginBottom: 24 }} extra={extra}>
      <NexusForm
        form={form}
        schema={schema}
        column={column}
        displayType={renderInline ? 'inline' : 'row'}
        onFinish={async (data) => setResult(data)}
        footer={
          <Space style={{ marginTop: 16 }}>
            <Button type='primary' htmlType='submit'>
              提交
            </Button>
            <Button onClick={() => form.resetFields()}>重置</Button>
          </Space>
        }
      />
      {result && (
        <pre style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
          onFinish: {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </Card>
  );
}

export default function LayoutDemoPage() {
  const [column, setColumn] = useState(2);
  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          表单布局：column / width / colSpan
        </Title>
        <Paragraph type='secondary'>
          表单整体是统一的 24 栅格容器。 表单级
          <Text code>column</Text>
          决定未显式设宽字段的默认等分；字段级 <Text code>width</Text>（如
          <Text code>'50%'</Text>）表示占整个表单宽度的比例；显式{' '}
          <Text code>colSpan</Text>（24 栅格单位）优先级最高。
        </Paragraph>

        <DemoSection
          title='演示 1：表单级 column 控制默认等分'
          schema={columnSchem}
          column={column}
          extra={
            <Segmented
              size='small'
              value={column}
              onChange={(v) => setColumn(v as number)}
              options={[
                { label: 'column: 1', value: 1 },
                { label: 'column: 2', value: 2 },
                { label: 'column: 3', value: 3 },
              ]}
            />
          }
        />
        <Paragraph
          type='secondary'
          style={{ fontSize: 12, marginTop: -12, marginBottom: 24 }}
        >
          切换 column 观察默认宽度字段（A~D）的等分变化；字段 E
          （width&nbsp;100%）始终占满整行。
        </Paragraph>

        <DemoSection title='演示 2：字段 width 占比混合' schema={widthSchema} />
        <Paragraph
          type='secondary'
          style={{ fontSize: 12, marginTop: -12, marginBottom: 24 }}
        >
          50% + 50% 放满一行；25% + 25% + 50% 放满一行；33.33% × 3
          放满一行；100% 独立一行。占比字段自动换算为 24 栅格跨度。
        </Paragraph>

        <DemoSection
          title='演示 3：布局节点 width + 容器 column'
          schema={layoutSchema}
        />
        <Paragraph
          type='secondary'
          style={{ fontSize: 12, marginTop: -12, marginBottom: 24 }}
        >
          grid 布局节点内部按 column=4 均分，子项可再设 width/colSpan 调跨；两个
          card 各占表单宽度一半，卡片内子字段 width 回退字面生效（50% + 50%
          在卡片内并排）。
        </Paragraph>

        <DemoSection
          title='演示 4：inline 布局（非栅格，width 字面生效）'
          schema={{
            type: 'object',
            properties: {
              halfA: {
                type: 'string',
                widget: 'input',
                title: 'inline 50%',
                width: '50%',
              },
              halfB: {
                type: 'string',
                widget: 'input',
                title: 'inline 50%',
                width: '50%',
              },
              full: {
                type: 'string',
                widget: 'input',
                title: 'inline 默认',
              },
            },
          }}
          renderInline
        />

        <CodeBlock lang='tsx' title='布局语义核心用法' code={snippet} />
      </div>
    </MainArea>
  );
}
