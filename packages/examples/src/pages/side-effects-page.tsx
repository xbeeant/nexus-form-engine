// ============================================================================
// SideEffectsPage — 附带编辑器 / 点击动作（x-render `sideEffects` 对齐）
//
// 演示：字段声明 `sideEffects` 后，字段旁渲染「编辑」入口，
// 点击弹出 Modal / Drawer 内嵌编辑器组件编辑字段值。
// - 内置 `textarea` 编辑器（registerAntdUI 自动注册）
// - 自定义 `json` 编辑器（engine.registerEditors 扩展），校验合法性后写回
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Card, Divider, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/code-block';
import { MainArea } from '../site/main-area';

const { Paragraph, Text, Title } = Typography;

// ── 演示 Schema：三类 sideEffects 用法 ────────────────────────────────────
const demoSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    // 1. 字符串简写 → 默认 textarea 编辑器（modal 打开）
    bio: {
      type: 'string',
      widget: 'input',
      title: '个人简介',
      placeholder: '优先用主输入框，复杂内容点「编辑」',
      sideEffects: 'textarea',
      description: 'sideEffects: "textarea"（简写，modal 打开内置 textarea）',
    },
    // 2. 对象形态 → 显式声明编辑器 / 标题 / 打开方式
    content: {
      type: 'string',
      widget: 'input',
      title: '富内容',
      placeholder: '适合长文本 / 富文本的场景',
      sideEffects: {
        editor: 'textarea',
        title: '编辑富文本',
        mode: 'drawer',
        props: { rows: 12 },
      },
      description: 'sideEffects: { editor, title, mode: "drawer", props }',
    },
    // 3. 自定义 JSON 编辑器（registerEditors 注册，落库前校验）
    config: {
      type: 'string',
      widget: 'input',
      title: 'JSON 配置',
      placeholder: '如 {"theme":"dark","debug":true}',
      sideEffects: { editor: 'json', title: '编辑 JSON 配置' },
      default: '{"theme":"dark","debug":true}',
      description: 'sideEffects: { editor: "json" }（自定义扩展编辑器）',
      rules: [],
    },
  },
} satisfies NexusSchema;

// ── 自定义 JSON 编辑器：作为一等组件（value / onChange）注册 ──────────────
function JsonEditor({
  value,
  onChange,
  name,
}: {
  value?: unknown;
  onChange?: (v: unknown) => void;
  name?: string;
}) {
  const [text, setText] = useState(() => stringifyPretty(value));
  const [error, setError] = useState<string | null>(null);

  const draft = text;
  function handleChange(next: string) {
    setText(next);
    // 实时反馈合法性（不写回）
    try {
      JSON.parse(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function handleSave() {
    if (error) {
      return;
    }
    onChange?.(text.trim());
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        编辑字段 <code>{name}</code>（JSON 校验合法后「保存」写回）
      </Typography.Text>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        style={{
          width: '100%',
          minHeight: 220,
          padding: 12,
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 1.6,
          border: error ? '1px solid #ff4d4f' : '1px solid rgba(0,0,0,.15)',
          borderRadius: 6,
          resize: 'vertical',
          outline: 'none',
        }}
      />
      {error ? (
        <Text type='danger'>JSON 语法错误：{error}</Text>
      ) : (
        <Text type='secondary' style={{ fontSize: 12 }}>
          合法 JSON，保存后将格式化写回字段。
        </Text>
      )}
      <Button
        size='small'
        type='primary'
        disabled={!!error || draft.trim() === ''}
        onClick={handleSave}
        style={{ alignSelf: 'flex-end' }}
      >
        写入字段
      </Button>
    </div>
  );
}

function stringifyPretty(v: unknown): string {
  if (typeof v === 'string' && v.trim()) {
    try {
      return JSON.stringify(JSON.parse(v), null, 2);
    } catch {
      return v;
    }
  }
  return JSON.stringify(v ?? '', null, 2);
}

// 关键代码片段（用于 CodeBlock 展示）
const registerSnippet = `// 1. 声明 sideEffects（schema 字段）
const schema = {
  type: 'object',
  properties: {
    bio:    { type: 'string', widget: 'input', title: '简介',  sideEffects: 'textarea' },
    config: { type: 'string', widget: 'input', title: '配置',  sideEffects: { editor: 'json', title: '编辑 JSON' } },
  },
};

// 2. 自定义编辑器：一等组件（value / onChange）
function JsonEditor({ value, onChange, name }) {
  const [text, setText] = useState(pretty(value));
  const save = () => onChange?.(text);   // 返回去规范化文本
  return <textarea value={text} onChange={(e) => setText(e.target.value)} />;
}

// 3. 注册到引擎（任意时机调用，可与 widget 一起注册）
engine.registerEditors({ json: JsonEditor });

// 内置 textarea 编辑器由 registerAntdUI 自动注册：
// registerAntdUI  = engines.registerWidgets + registerLayouts + FieldWrapper
//                 + registerEditors({ textarea: textAreaWidget })`;

export default function SideEffectsPage() {
  const [form] = useForm();
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );

  useEffect(() => {
    registerAntdUI(form._getEngine());
    // 扩展自定义 JSON 编辑器
    form._getEngine().registerEditors({ json: JsonEditor });
  }, [form]);

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          附带编辑器（sideEffects）
        </Title>
        <Paragraph type='secondary'>
          字段声明 <code>sideEffects</code> 后，控件下方渲染「编辑」
          入口，点击弹出 <code>Modal</code> / <code>Drawer</code>{' '}
          内嵌编辑器编辑字段值，保存后以字符串写回。适合长文本、富文本、JSON
          等主控件不便直接编辑的场景（x-render <code>onClickAction</code>{' '}
          对齐）。
        </Paragraph>

        <Paragraph type='secondary' style={{ fontSize: 13 }}>
          用法：<Tag color='blue'>sideEffects: 'textarea'</Tag>
          <Tag color='blue'>
            sideEffects: {'{ editor, title, mode, props }'}
          </Tag>
          <Tag color='geekblue'>engine.registerEditors({'[自定义]'})</Tag>
        </Paragraph>

        <Card size='small' style={{ marginBottom: 24 }} title='交互演示'>
          <NexusForm
            form={form}
            schema={demoSchema}
            initialValues={{
              bio: 'Nexus 表单引擎，面向复杂可配置业务的 Schema 方案。',
              config: '{"theme":"dark","debug":true}',
            }}
            onFinish={async (data) => setSubmitted(data)}
            footer={
              <Space style={{ marginTop: 16 }}>
                <Button type='primary' htmlType='submit'>
                  提交
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setSubmitted(null);
                  }}
                >
                  重置
                </Button>
              </Space>
            }
          />
        </Card>

        {submitted && (
          <Card
            title='提交结果（formData）'
            size='small'
            style={{ marginBottom: 16 }}
            extra={<Text type='secondary'>sideEffects 不进入数据路径</Text>}
          >
            <pre style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              {JSON.stringify(submitted, null, 2)}
            </pre>
          </Card>
        )}

        <Divider style={{ margin: '8px 0 24px' }} />

        <Title level={3}>实现要点</Title>
        <Paragraph>
          编辑器是接收 <code>value</code> / <code>onChange</code>{' '}
          的一等组件，通过 <code>engine.registerEditors</code> 注册（与 widget /
          布局同一套注册机制）。字段的 <code>sideEffects</code> 仅作为
          独立的渲染槽位，不影响字段值或校验规则。
        </Paragraph>
        <CodeBlock
          lang='tsx'
          title='注册自定义编辑器 + schema 声明'
          code={registerSnippet}
        />
      </div>
    </MainArea>
  );
}
