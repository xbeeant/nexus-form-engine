// ============================================================================
// P2FeaturesPage — P2 增强特性一览（formily / ProForm / x-render 对齐）
//
// 五个卡片分区块演示：
//   A. 函数式 reactions `run`（复杂计算 / 跨字段联动的逃逸舱）
//   B. display 三态模型（visible / none / hidden）
//   C. 依赖驱动的动态 enum（快速切换 → 城市联动下拉）
//   D. 字段级 hooks（onChange / onBlur / onFocus 一等函数）
//   E. 数组折叠 + 拖拽排序（Collapse 卡片 + HTML5 原生 DnD）
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Card, Divider, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/code-block';
import { MainArea } from '../site/main-area';

const { Paragraph, Title } = Typography;

// ── A. 函数式 reactions `run` ─────────────────────────────────────────────
// 声明式 fulfill 的逃逸舱：run 是命令式函数，可读依赖、formData、
// 调用 getValue / setValue / setState，做任意复杂计算与跨字段联动。
const fnSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    base: { type: 'number', widget: 'input', title: '基础价', default: 100 },
    taxRate: { type: 'number', widget: 'input', title: '税率(%)', default: 10 },
    discount: {
      type: 'number',
      widget: 'input',
      title: '折扣(%)',
      default: 90,
    },
    finalPrice: {
      type: 'number',
      widget: 'input',
      title: '最终价',
      readOnly: true,
      placeholder: '自动计算',
      dependencies: ['base', 'taxRate', 'discount'],
      reactions: [
        {
          dependencies: ['base', 'taxRate', 'discount'],
          run: ({ getValue, setValue }) => {
            const base = Number(getValue('base')) || 0;
            const tax = Number(getValue('taxRate')) || 0;
            const disc = Number(getValue('discount')) || 0;
            const final = Math.round(base * (1 + tax / 100) * (disc / 100));
            setValue('finalPrice', final);
          },
        },
      ],
    },
  },
} satisfies NexusSchema;

// ── B. display 三态模型 ───────────────────────────────────────────────────
// visible / none / hidden 三种状态：
//   none   → 不渲染（无占位符），但值仍在 formData 参与提交
//   hidden → 不渲染且不收集（等同 hidden:true），值进 hidden
// 下面用 Radio 的 display:none 演示「不占位但收集」。
const displaySchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    contact: {
      type: 'string',
      widget: 'radio',
      title: '联系方式',
      default: 'email',
      enum: ['email', 'phone'],
      enumNames: ['邮箱', '电话'],
      // 声明式表达式：选择「电话」时才显示城市框
      reactions: [
        {
          dependencies: ['contact'],
          otherwise: { state: { visible: false } },
          when: '{{ $deps[0] === "phone" }}',
          fulfill: { state: { visible: true } },
        },
      ],
    },
    phone: {
      type: 'string',
      widget: 'input',
      title: '手机号',
      description: '选「电话」时随 visible 联动显示',
      default: '13800000000',
      dependencies: ['contact'],
      reactions: [
        {
          dependencies: ['contact'],
          when: '{{ $deps[0] === "phone" }}',
          fulfill: { state: { visible: true } },
          otherwise: { state: { visible: false } },
        },
      ],
    },
    track: {
      type: 'string',
      widget: 'input',
      title: '埋点值（phone）',
      display: 'none',
      default: 'NA',
      description: 'display:none — 不渲染但值随表单提交',
    },
    secret: {
      type: 'string',
      widget: 'input',
      title: '密钥（发 cards）',
      display: 'hidden',
      default: 'sk-prod-xxx',
      description: 'display:hidden — 不渲染也不收集',
    },
  },
} satisfies NexusSchema;

// ── C. 依赖驱动的动态 enum ────────────────────────────────────────────────
const enumSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    country: {
      type: 'string',
      widget: 'select',
      title: '国家/地区',
      default: 'CN',
      enum: ['CN', 'US', 'JP'],
    },
    city: {
      type: 'string',
      widget: 'select',
      title: '城市',
      default: '北京',
      dependencies: ['country'],
      enum: "{{ $deps[0] === 'CN' ? ['北京','上海','广州'] : $deps[0] === 'US' ? ['New York','LA','Chicago'] : ['东京','大阪'] }}",
      description: 'enum 为 {{ }} 表达式，随 switch 国家动态重算',
    },
  },
} satisfies NexusSchema;

// ── D. 字段级 hooks ───────────────────────────────────────────────────────
const hooksSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    promoCode: {
      type: 'string',
      widget: 'input',
      title: '优惠码',
      description: '输入 EXPRESS / VIP 时联动「备注」',
    },
    note: {
      type: 'string',
      widget: 'input',
      title: '备注（自动）',
      readOnly: true,
      placeholder: '由 promoCode 的 hooks.onChange 写入',
    },
  },
} satisfies NexusSchema;

// ── E. 数组折叠 + 拖拽排序 ────────────────────────────────────────────────
// list widget 升级：collapsible 默认开启（Collapse 折叠面板）；dragSort:true
// opt-in HTML5 原生拖拽。下面同时演示两者。
const listSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      widget: 'list',
      title: '套餐明细',
      props: { dragSort: true, addText: '添加套餐项' },
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            widget: 'input',
            title: '名称',
            placeholder: '如「基础版」',
          },
          price: {
            type: 'number',
            widget: 'input',
            title: '价格',
            placeholder: '如 99',
          },
        },
      },
    },
  },
} satisfies NexusSchema;

const listInitial = {
  items: [
    { name: '基础版', price: 99 },
    { name: '专业版', price: 299 },
    { name: '旗舰版', price: 699 },
  ],
};

// ── 代码片段（用于 CodeBlock）─────────────────────────────────────────────
const codeFragments: Record<string, { title: string; code: string }> = {
  run: {
    title: '函数式 reactions run',
    code: `// 声明式 fulfill 的逃逸舱：命令式函数做复杂计算/跨字段联动
finalPrice: {
  type: 'number', widget: 'input', readOnly: true,
  dependencies: ['base', 'taxRate', 'discount'],
  reactions: [{
    dependencies: ['base', 'taxRate', 'discount'],
    run: ({ getValue, setValue }) => {
      const base = Number(getValue('base')) || 0;
      const tax  = Number(getValue('taxRate')) || 0;
      const disc = Number(getValue('discount')) || 0;
      setValue('finalPrice', Math.round(base * (1 + tax / 100) * (disc / 100)));
    },
  }],
}`,
  },
  display: {
    title: 'display 三态模型',
    code: `// visible / none / hidden
track:  { type: 'string', widget: 'input', display: 'none',   default: 'NA' },
//   none   → 不渲染(无占位符)，但值仍在 formData 参与提交
secret: { type: 'string', widget: 'input', display: 'hidden', default: 'x' },
//   hidden → 不渲染且不收集(等同 hidden:true)，值进 hidden`,
  },
  enum: {
    title: '依赖驱动的动态 enum',
    code: `city: {
  type: 'string', widget: 'select', default: '北京',
  dependencies: ['country'],
  enum: "{{ $deps[0] === 'CN' ? ['北京','上海','广州'] : $deps[0] === 'US' ? ['New York','LA','Chicago'] : ['东京','大阪'] }}",
}`,
  },
  hooks: {
    title: '字段级 hooks',
    code: `promoCode: {
  type: 'string', widget: 'input',
  hooks: {
    onChange({ value, setValue }) {
      if (['EXPRESS', 'VIP'].includes(String(value ?? '').toUpperCase())) {
        setValue('note', '已享受 ' + value + ' 优惠');
      } else {
        setValue('note', '');
      }
    },
    onBlur: () => console.log('promoCode 失焦'),
  },
}`,
  },
  list: {
    title: '数组折叠 + 拖拽排序',
    code: `items: {
  type: 'array', widget: 'list',
  props: { dragSort: true, collapsible: true },
  items: {
    type: 'object',
    properties: {
      name:  { type: 'string', widget: 'input', title: '名称' },
      price: { type: 'number', widget: 'input', title: '价格' },
    },
  },
}`,
  },
};

// 简易「提交结果」卡片复用
function ResultCard({ data }: { data: unknown }) {
  return (
    <Card title='提交结果（formData）' size='small' style={{ marginTop: 16 }}>
      <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </Card>
  );
}

export function P2FeaturesPage() {
  // 五个独立表单（互不干扰）
  const [fnForm] = useForm();
  const [displayForm] = useForm();
  const [enumForm] = useForm();
  const [hooksForm] = useForm();
  const [listForm] = useForm();

  // 各表单提交结果
  const [fnData, setFnData] = useState<unknown>(null);
  const [displayData, setDisplayData] = useState<unknown>(null);
  const [enumData, setEnumData] = useState<unknown>(null);
  const [hooksData, setHooksData] = useState<unknown>(null);
  const [listData, setListData] = useState<unknown>(null);

  useEffect(() => {
    // 一次性注册 antd UI（NexusForm 会复用同一引擎）
    for (const f of [fnForm, displayForm, enumForm, hooksForm, listForm]) {
      registerAntdUI(f._getEngine());
    }
  }, [fnForm, displayForm, enumForm, hooksForm, listForm]);

  // 渲染「提交 / 重置」按钮（提交经 htmlType='submit' 触发，结果在 onFinish 收集）
  const renderFooter = (onReset: () => void): React.ReactNode => (
    <Space style={{ marginTop: 16 }}>
      <Button type='primary' htmlType='submit'>
        提交
      </Button>
      <Button onClick={onReset}>重置</Button>
    </Space>
  );

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          P2 增强特性
        </Title>
        <Paragraph type='secondary'>
          对齐 formily / ProForm / x-render 的五项进阶能力：函数式{' '}
          <code>run</code>、<code>display</code> 三态、动态 <code>enum</code>
          、字段级 <code>hooks</code>、数组折叠 + 拖拽。每项一个独立表单，
          提交查看 <code>formData</code> 的收集差异。
        </Paragraph>
        <Space wrap style={{ marginBottom: 16 }}>
          <Tag color='geekblue'>P2-A run</Tag>
          <Tag color='blue'>P2-B display</Tag>
          <Tag color='green'>P2-C enum</Tag>
          <Tag color='orange'>P2-D hooks</Tag>
          <Tag color='purple'>P2-E list</Tag>
        </Space>

        {/* ── A. 函数式 reactions run ── */}
        <Divider titlePlacement='left'>
          A. 函数式 reactions <code>run</code>
        </Divider>
        <Card size='small' style={{ marginBottom: 16 }}>
          <Paragraph type='secondary'>
            <code>dependencies</code> 触发 <code>run</code>，命令式计算最终价。
          </Paragraph>
          <NexusForm
            form={fnForm}
            schema={fnSchema}
            onFinish={async (data) => setFnData(data)}
            footer={renderFooter(() => {
              fnForm.resetFields();
              setFnData(null);
            })}
          />
          {fnData !== null && <ResultCard data={fnData} />}
          <CodeBlock {...codeFragments.run} />
        </Card>

        {/* ── B. display 三态 ── */}
        <Divider titlePlacement='left'>B. display 三态模型</Divider>
        <Card size='small' style={{ marginBottom: 16 }}>
          <Paragraph type='secondary'>
            <code>track</code>（<code>display:'none'</code>）无占位符但在{' '}
            <code>formData</code> 中；<code>secret</code>（{' '}
            <code>display:'hidden'</code>）不渲染也不收集。
          </Paragraph>
          <NexusForm
            form={displayForm}
            schema={displaySchema}
            onFinish={async (data) => {
              const all = displayForm.getAllValues();
              setDisplayData({ visible: data, all });
            }}
            footer={renderFooter(() => {
              displayForm.resetFields();
              setDisplayData(null);
            })}
          />
          {displayData !== null && <ResultCard data={displayData} />}
          <CodeBlock {...codeFragments.display} />
        </Card>

        {/* ── C. 动态 enum ── */}
        <Divider titlePlacement='left'>C. 依赖驱动的动态 enum</Divider>
        <Card size='small' style={{ marginBottom: 16 }}>
          <Paragraph type='secondary'>
            切换“国家/地区”→ <code>enum</code> 表达式随 <code>$deps</code>{' '}
            重算城市下拉。
          </Paragraph>
          <NexusForm
            form={enumForm}
            schema={enumSchema}
            onFinish={async (data) => setEnumData(data)}
            footer={renderFooter(() => {
              enumForm.resetFields();
              setEnumData(null);
            })}
          />
          {enumData !== null && <ResultCard data={enumData} />}
          <CodeBlock {...codeFragments.enum} />
        </Card>

        {/* ── D. 字段级 hooks ── */}
        <Divider titlePlacement='left'>D. 字段级 hooks</Divider>
        <Card size='small' style={{ marginBottom: 16 }}>
          <Paragraph type='secondary'>
            <code>promoCode</code> 的 <code>hooks.onChange</code> 经{' '}
            <code>setValue</code> 联动“备注”（v2: 全大写匹配 EXPRESS / VIP）。
          </Paragraph>
          <NexusForm
            form={hooksForm}
            schema={hooksSchema}
            onFinish={async (data) => setHooksData(data)}
            footer={renderFooter(() => {
              hooksForm.resetFields();
              setHooksData(null);
            })}
          />
          {hooksData !== null && <ResultCard data={hooksData} />}
          <CodeBlock {...codeFragments.hooks} />
        </Card>

        {/* ── E. 数组折叠 + 拖拽 ── */}
        <Divider titlePlacement='left'>E. 数组折叠 + 拖拽排序</Divider>
        <Card size='small' style={{ marginBottom: 16 }}>
          <Paragraph type='secondary'>
            list 数组项折叠面板（可拖拽 <code>⇅</code> 手柄换序，也可用
            上移/下移按钮）。
          </Paragraph>
          <NexusForm
            form={listForm}
            schema={listSchema}
            initialValues={listInitial}
            onFinish={async (data) => setListData(data)}
            footer={renderFooter(() => {
              listForm.resetFields();
              setListData(null);
            })}
          />
          {listData !== null && <ResultCard data={listData} />}
          <CodeBlock {...codeFragments.list} />
        </Card>
      </div>
    </MainArea>
  );
}
