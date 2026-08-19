// ============================================================================
// ExtensionsPage — 扩展介绍
// Widget 组件库 + 布局组件库 + 插件系统 + 自定义 Widget 指南
// ============================================================================

import { layoutCatalog, widgetCatalog } from '@xbeeant/form-engine-designer';
import { Card, Col, Collapse, Row, Space, Tag, Typography } from 'antd';
import { CodeBlock } from '../site/CodeBlock';
import { MainArea } from '../site/MainArea';

const { Title, Text, Paragraph } = Typography;

// 内置插件说明
const plugins = [
  {
    name: 'AsyncValidatorPlugin',
    file: 'core/src/async-validator.ts',
    desc: '字段级异步校验的防抖（默认 300ms）、超时（默认 5s）、并行调度，结果通过 setFieldState 写回。',
    example: `engine.use(new AsyncValidatorPlugin(engine));

// 注册异步校验器（模拟后端唯一性检查）
form.registerValidator('username', async (value) => {
  await new Promise((r) => setTimeout(r, 300));
  const taken = ['root', 'admin', 'system'].includes(String(value ?? '').toLowerCase());
  return taken ? ['用户名已被占用'] : [];
});`,
  },
  {
    name: 'ArrayOperationsPlugin',
    file: 'core/src/array-list.ts',
    desc: '数组字段的 push / pop / remove / update / insert / move 操作，不可变更新并通过 setFieldValue 写回，自动触发校验与联动。',
    example: `engine.use(new ArrayOperationsPlugin(engine));

plugin.push('items', { name: '新条目' });
plugin.remove('items', 0);
plugin.move('items', 0, 2);
plugin.batch('items', [
  { operation: 'push', value: { name: 'A' } },
  { operation: 'push', value: { name: 'B' } },
]);`,
  },
];

// 自定义 Widget 步骤
const customWidgetSteps = [
  {
    title: '创建文件',
    desc: '在 packages/ui/src/widgets/ 下新建 xxx.tsx',
  },
  {
    title: '裸组件导出',
    desc: 'Form.Item 包裹（label/错误/布局）由 NexusForm 渲染层默认完成，无需手动包裹',
  },
  {
    title: '注册映射',
    desc: '加入 antdWidgets，即可通过 schema.widget 使用',
  },
  {
    title: '类型扩充',
    desc: '通过 declare module 扩充 WidgetPropsMap 获得 props 类型提示',
  },
];

export default function ExtensionsPage() {
  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2}>扩展介绍</Title>
        <Paragraph type='secondary'>
          引擎不内置任何 UI 组件，全部通过 <code>registerWidgets</code> /{' '}
          <code>registerLayouts</code> 注入。下方是{' '}
          <code>@xbeeant/form-engine-ui</code> 基于 Ant Design
          提供的开箱即用组件库。
        </Paragraph>

        {/* ── Widget 组件库 ── */}
        <Title level={3} style={{ marginTop: 24 }}>
          Widget 组件库（{widgetCatalog.length} 个）
        </Title>
        <Row gutter={[12, 12]}>
          {widgetCatalog.map((w) => (
            <Col xs={12} sm={8} md={6} key={w.widget}>
              <Card size='small' hoverable style={{ height: '100%' }}>
                <Space>
                  <span style={{ fontSize: 20 }}>{w.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{w.label}</div>
                    <code style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {w.widget}
                    </code>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── 布局组件库 ── */}
        <Title level={3} style={{ marginTop: 32 }}>
          布局组件库（{layoutCatalog.length} 个）
        </Title>
        <Row gutter={[12, 12]}>
          {layoutCatalog.map((l) => (
            <Col xs={12} sm={8} md={6} key={l.layoutType}>
              <Card size='small' hoverable style={{ height: '100%' }}>
                <Space>
                  <span style={{ fontSize: 20 }}>{l.icon}</span>
                  <div>
                    <div style={{ fontWeight: 500 }}>{l.label}</div>
                    <code style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {l.layoutType}
                    </code>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        {/* ── 插件系统 ── */}
        <Title level={3} style={{ marginTop: 32 }}>
          插件系统
        </Title>
        <Paragraph>
          Core 通过 <code>engine.use(plugin)</code> 扩展能力，插件可拦截{' '}
          <code>init / setFieldValue / validate / arrayOperation</code>{' '}
          等生命周期钩子。
        </Paragraph>
        {plugins.map((p) => (
          <Card
            key={p.name}
            size='small'
            style={{ marginBottom: 16 }}
            title={
              <Space>
                <code>{p.name}</code>
                <Tag color='blue'>核心内置</Tag>
              </Space>
            }
            extra={<code style={{ fontSize: 11 }}>{p.file}</code>}
          >
            <Paragraph style={{ marginBottom: 12 }}>{p.desc}</Paragraph>
            <CodeBlock lang='ts' title={p.name} code={p.example} />
          </Card>
        ))}

        {/* ── 自定义 Widget ── */}
        <Title level={3} style={{ marginTop: 32 }}>
          自定义 Widget
        </Title>
        <Paragraph>
          自定义 widget 只需导出裸组件——Form.Item 包裹（label、错误、必填、
          布局）由 NexusForm 渲染层通过 <code>FieldWrapper</code> 默认完成，
          <code>label: false</code> 时跳过包裹。 详细规范见
          <Text type='secondary'> packages/ui/docs/custom-widget-guide.md</Text>
          。
        </Paragraph>
        <Collapse
          style={{ marginBottom: 16 }}
          items={[
            {
              key: 'steps',
              label: '实现步骤',
              children: (
                <Space direction='vertical'>
                  {customWidgetSteps.map((s, i) => (
                    <Text key={s.title}>
                      <Tag color='geekblue'>{i + 1}</Tag> {s.title} —{' '}
                      <Text type='secondary'>{s.desc}</Text>
                    </Text>
                  ))}
                </Space>
              ),
            },
            {
              key: 'example',
              label: '示例代码',
              children: (
                <CodeBlock
                  lang='tsx'
                  title='自定义 MyInput Widget'
                  code={`import { Input } from 'antd';
import type { WidgetProps } from '@xbeeant/form-engine-ui';

type MyInputProps = WidgetProps & {
  maxLength?: number;
  [key: string]: any;
};

// 裸组件：Form.Item 包裹由 NexusForm 渲染层默认完成（label: false 时跳过）
export const myInput = ({ value, onChange, disabled, loading, placeholder, maxLength, ...rest }: MyInputProps) => (
  <Input
    value={value as string}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled || loading}
    placeholder={placeholder}
    maxLength={maxLength}
    {...rest}
  />
);

// 注册
import { myInput } from './myInput';
export const antdWidgets = {
  // ... 其他 widget
  myInput,
};
// schema 中直接使用：{ "type": "string", "widget": "myInput", "title": "自定义输入" }`}
                />
              ),
            },
          ]}
        />

        {/* ── 注册一览 ── */}
        <Title level={3} style={{ marginTop: 32 }}>
          一键注册
        </Title>
        <CodeBlock
          lang='ts'
          title='registerAntdUI'
          code={`// ui 包提供一键注册函数：widgets + layouts + FieldWrapper
export function registerAntdUI(engine: NexusEngine): void {
  engine.registerFieldWrapper(FieldWrapper); // 渲染层默认包裹所有 widget
  engine.registerWidgets(antdWidgets);
  engine.registerLayouts(antdLayouts);
}

// 也可按需注册
engine.registerWidgets({ input: MyInput, select: MySelect });
engine.registerLayouts({ card: MyCard, grid: MyGrid });`}
        />
      </div>
    </MainArea>
  );
}
