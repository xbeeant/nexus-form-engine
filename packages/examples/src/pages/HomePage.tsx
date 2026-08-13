// ============================================================================
// HomePage — 核心机制
// 项目介绍 + 设计原则 + 架构总览 + 核心机制详解
// ============================================================================

import { Card, Col, Row, Space, Table, Tag, Typography } from 'antd';
import { CodeBlock } from '../site/CodeBlock';

const { Title, Text, Paragraph } = Typography;

// ── 设计原则 ────────────────────────────────────────────────────────────────
const principles = [
  {
    icon: '🧩',
    title: 'UI 无关性',
    desc: 'core 层为纯 TypeScript，严禁包含任何 DOM / React / Vue 代码，可在 Node.js、浏览器、Worker 中运行。',
  },
  {
    icon: '📋',
    title: '协议融合',
    desc: '数据定义与布局定义共存于同一份 JSON Schema，用户无需维护两份 Schema，天然一致。',
  },
  {
    icon: '🪟',
    title: '布局透明',
    desc: '布局节点（Card / Tabs / Grid）的 Key 不进入 formData 数据路径，调整布局不会破坏数据与联动规则。',
  },
  {
    icon: '⚡',
    title: '显式依赖',
    desc: '基于 DependencyGraph 静态构建依赖边，杜绝 Proxy / MobX 隐式收集，保证 O(k) 联动更新复杂度。',
  },
];

// ── Monorepo 包结构 ─────────────────────────────────────────────────────────
const packages = [
  {
    name: '@nexus/form-engine',
    dir: 'core',
    desc: '引擎核心：Schema 解析、依赖图、表达式沙箱、状态管理、插件系统',
    ui: '纯 TS，零依赖',
  },
  {
    name: '@nexus/form-engine-react',
    dir: 'react',
    desc: 'React 渲染层：NexusForm / NexusField / FormController / useWatch',
    ui: 'React ≥ 18',
  },
  {
    name: '@nexus/form-engine-ui',
    dir: 'ui',
    desc: '基于 antd 的 28 个 Widget 与 11 个 Layout 组件库',
    ui: 'antd ≥ 6',
  },
  {
    name: '@nexus/form-engine-designer',
    dir: 'designer',
    desc: '可视化 Schema 设计器：Canvas / Palette / PropertyPanel',
    ui: 'antd ≥ 6',
  },
];

// ── 节点类型判定表 ──────────────────────────────────────────────────────────
const nodeTypeColumns = [
  { title: '节点特征', dataIndex: 'feature', key: 'feature' },
  { title: '类型', dataIndex: 'type', key: 'type' },
  { title: '数据路径影响', dataIndex: 'path', key: 'path' },
];
const nodeTypeRows = [
  {
    key: '1',
    feature: '包含 widget 字段',
    type: '数据字段',
    path: '✅ Key 进入路径',
  },
  {
    key: '2',
    feature: 'type: "object" 且无 widget',
    type: '数据对象',
    path: '✅ Key 进入路径',
  },
  {
    key: '3',
    feature: 'type: "array"',
    type: '数据数组',
    path: '✅ Key 进入路径',
  },
  {
    key: '4',
    feature: 'type 为布局类型（card/tabs/grid…）',
    type: '布局容器',
    path: '❌ Key 不进入路径',
  },
  {
    key: '5',
    feature: 'type 为面板类型（tabPane/step/…）',
    type: '布局面板',
    path: '❌ Key 不进入路径',
  },
];

export default function HomePage() {
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
      {/* ── Hero ── */}
      <div style={{ textAlign: 'center', padding: '56px 0 40px' }}>
        <Title level={1} style={{ marginBottom: 8 }}>
          @nexus/form-engine
        </Title>
        <Paragraph type='secondary' style={{ fontSize: 16, marginBottom: 16 }}>
          一份 Schema，同时描述数据结构与布局 —— UI 无关的 Schema 驱动表单引擎
        </Paragraph>
        <Space size={[8, 8]} wrap style={{ justifyContent: 'center' }}>
          <Tag color='blue'>Schema 驱动</Tag>
          <Tag color='green'>UI 无关核心</Tag>
          <Tag color='purple'>显式依赖图</Tag>
          <Tag color='orange'>Reactions 联动</Tag>
          <Tag color='cyan'>插件系统</Tag>
          <Tag color='magenta'>Schema 设计器</Tag>
        </Space>
      </div>

      {/* ── 设计原则 ── */}
      <Title level={2}>设计原则</Title>
      <Row gutter={[16, 16]}>
        {principles.map((p) => (
          <Col xs={24} sm={12} key={p.title}>
            <Card size='small' style={{ height: '100%' }}>
              <Space>
                <span style={{ fontSize: 24 }}>{p.icon}</span>
                <Title level={5} style={{ margin: 0 }}>
                  {p.title}
                </Title>
              </Space>
              <Paragraph
                type='secondary'
                style={{ marginTop: 8, marginBottom: 0 }}
              >
                {p.desc}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── 架构总览 ── */}
      <Title level={2} style={{ marginTop: 40 }}>
        架构总览
      </Title>
      <Paragraph type='secondary'>
        采用 Monorepo（Lerna + npm workspaces）组织，核心与 UI 严格分层：Core
        负责状态与逻辑， React 负责订阅渲染，UI
        包通过注册机制注入组件，设计器则消费 Schema 协议。
      </Paragraph>
      <Row gutter={[16, 16]}>
        {packages.map((p) => (
          <Col xs={24} sm={12} key={p.name}>
            <Card size='small'>
              <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                <code style={{ fontWeight: 600 }}>{p.name}</code>
                <Tag>{p.ui}</Tag>
              </Space>
              <div style={{ marginTop: 6 }}>
                <code style={{ fontSize: 12, color: '#8c8c8c' }}>
                  packages/{p.dir}
                </code>
              </div>
              <Paragraph
                type='secondary'
                style={{ marginTop: 6, marginBottom: 0 }}
              >
                {p.desc}
              </Paragraph>
            </Card>
          </Col>
        ))}
      </Row>

      <Card size='small' style={{ marginTop: 16 }}>
        <Text strong>数据流：</Text>
        <code>
          NexusSchema → SchemaParser → (fieldStates + renderTree +
          DependencyGraph) → Engine → Renderer
        </code>
        <br />
        <Text type='secondary' style={{ fontSize: 12 }}>
          Schema 解析仅在 init / setSchema 时执行一次；React 渲染层通过
          useSyncExternalStore 按字段路径精准订阅，字段变更只重渲染受影响组件。
        </Text>
      </Card>

      {/* ── 核心机制 ── */}
      <Title level={2} style={{ marginTop: 40 }}>
        核心机制
      </Title>

      <Card
        size='small'
        style={{ marginBottom: 16 }}
        title='① 统一 Schema 与布局透明'
      >
        <Paragraph>
          Schema 中每个节点依据「是否携带 widget /
          type」被判定为数据节点或布局节点。 布局节点的 Key
          在路径计算时被丢弃、直接透传父路径，因此
          <code> card.properties </code> 下的字段路径是{' '}
          <code>formData.fieldName</code>， 而不是{' '}
          <code>formData.card.fieldName</code>。
        </Paragraph>
        <Table
          size='small'
          columns={nodeTypeColumns}
          dataSource={nodeTypeRows}
          pagination={false}
          style={{ margin: '8px 0 16px' }}
        />
        <CodeBlock
          lang='json'
          title='布局透明：布局 Key 不进入数据路径'
          code={`{
  "type": "object",
  "properties": {
    "basicCard": {            // ← 布局节点，Key 被丢弃
      "type": "card",
      "title": "基本信息",
      "properties": {
        "username": {         // ← 数据字段
          "type": "string",
          "widget": "input",
          "title": "用户名"
        }
      }
    }
  }
}
// 最终数据路径：formData.username
// 无论布局如何调整（card → tabs → grid），数据路径保持稳定`}
        />
      </Card>

      <Card
        size='small'
        style={{ marginBottom: 16 }}
        title='② 显式依赖图 DependencyGraph'
      >
        <Paragraph>
          Schema 初始化时，Parser 从 reactions 与 validate
          表达式中静态提取依赖边， 构建 source → Set&lt;target&gt; 的反向索引。
          <code>setFieldValue</code> 只查询
          该索引（O(1)）触发受影响字段的联动，不做全量
          Diff，也无运行时动态扫描。
        </Paragraph>
        <CodeBlock
          lang='ts'
          title='DependencyGraph'
          code={`graph.addDependency(target, source);   // target 依赖 source
graph.addDependencies(target, sources);  // 批量添加依赖边

// source 变化时，需要联动哪些字段？
const dependents = graph.getDependents('contactMethod');
// → Set { 'contactPhone', 'contactEmail' }  （O(1) 查询）`}
        />
      </Card>

      <Card
        size='small'
        style={{ marginBottom: 16 }}
        title='③ Reactions 联动协议'
      >
        <Paragraph>
          复杂联动使用结构化 <code>reactions</code> 数组声明「依赖 → 条件 →
          补丁」： 条件满足执行 <code>fulfill</code>，否则执行{' '}
          <code>otherwise</code>。 表达式仅在受控上下文（
          <code>$deps / $self / $form / $index / formData / rootValue</code>
          ）中求值。
        </Paragraph>
        <CodeBlock
          lang='json'
          title='reactions 联动示例'
          code={`"contactPhone": {
  "type": "string",
  "widget": "input",
  "title": "手机号",
  "reactions": [
    {
      "dependencies": ["contactMethod"],
      "when": "{{ $deps[0] === 'phone' }}",
      "fulfill":   { "state": { "visible": true,  "required": true  } },
      "otherwise": { "state": { "visible": false, "required": false } }
    }
  ]
}`}
        />
      </Card>

      <Card
        size='small'
        style={{ marginBottom: 16 }}
        title='④ 状态管理与精准订阅'
      >
        <Paragraph>
          每个字段维护独立状态{' '}
          <code>
            {'{ value, visible, disabled, required, loading, errors, props }'}
          </code>
          ， 状态变更通过 <code>engine.setFieldState(path, patch)</code>{' '}
          触发并自动通知依赖图。 React 渲染层使用{' '}
          <code>useSyncExternalStore</code> 按字段路径精准订阅版本号，
          一个字段变化不会导致整个表单重渲染。
        </Paragraph>
        <CodeBlock
          lang='tsx'
          title='按路径精准订阅'
          code={`export function useFieldState(path: string): FieldState | undefined {
  const { engine } = useNexusContext();
  // 只在该字段版本变化时重渲染
  useSyncExternalStore(
    (onStoreChange) => engine.subscribeField(path, onStoreChange),
    () => engine.getFieldVersion(path),
  );
  return engine.getFieldState(path);
}`}
        />
      </Card>

      <Card size='small' title='⑤ 插件系统'>
        <Paragraph>
          Core 主类不硬编码任何业务逻辑，统一通过{' '}
          <code>engine.use(plugin)</code> 注入。
          插件可注册校验器、组件、布局，并拦截{' '}
          <code>init / setFieldValue / validate / arrayOperation</code>{' '}
          等生命周期。
        </Paragraph>
        <CodeBlock
          lang='ts'
          title='内置插件'
          code={`import {
  AsyncValidatorPlugin,    // 异步校验：防抖 / 超时 / 并行调度
  ArrayOperationsPlugin,   // 数组字段：push / pop / remove / update / insert / move
} from '@nexus/form-engine';

engine.use(new AsyncValidatorPlugin(engine));
engine.use(new ArrayOperationsPlugin(engine));

// UI 包已封装一键注册：
import { registerAntdUI } from '@nexus/form-engine-ui';
registerAntdUI(engine); // widgets + layouts + AsyncValidatorPlugin`}
        />
      </Card>

      {/* ── 快速开始 ── */}
      <Title level={2} style={{ marginTop: 40 }}>
        快速开始
      </Title>
      <CodeBlock
        lang='tsx'
        title='一分钟接入'
        code={`import type { NexusSchema } from '@nexus/form-engine';
import { NexusForm, useForm } from '@nexus/form-engine-react';
import { registerAntdUI } from '@nexus/form-engine-ui';
import { useEffect } from 'react';

const schema: NexusSchema = {
  type: 'object',
  displayType: 'row',
  labelWidth: 120,
  properties: {
    username: {
      type: 'string',
      widget: 'input',
      title: '用户名',
      required: true,
    },
  },
};

function App() {
  const [form] = useForm();
  useEffect(() => registerAntdUI(form._getEngine()), [form]);

  return (
    <NexusForm
      form={form}
      schema={schema}
      onFinish={(data) => console.log('提交数据', data)}
    />
  );
}`}
      />
    </div>
  );
}
