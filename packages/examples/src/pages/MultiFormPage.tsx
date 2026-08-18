// ============================================================================
// MultiFormPage — 多表单实例与跨表单联动
// 演示 1：同页两个独立表单（多实例隔离，互不影响）
// 演示 2：两个表单联动（schema 声明式 crossForm + 编程式 linkForm）
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Card, Divider, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/CodeBlock';
import { MainArea } from '../site/MainArea';

const { Paragraph, Text, Title } = Typography;

// ── 演示 1：两个独立表单的 Schema ──────────────────────────────────────────
const profileSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    username: {
      type: 'string',
      widget: 'input',
      title: '用户名',
      required: true,
    },
    email: {
      type: 'string',
      widget: 'input',
      title: '邮箱',
      required: true,
      rules: [{ type: 'email', message: '邮箱格式不正确' }],
    },
    gender: {
      type: 'string',
      widget: 'radio',
      title: '性别',
      enum: ['male', 'female'],
      enumNames: ['男', '女'],
    },
  },
} satisfies NexusSchema;

const orderSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    product: {
      type: 'string',
      widget: 'select',
      title: '商品',
      required: true,
      props: {
        options: [
          { label: '机械键盘', value: 'keyboard' },
          { label: '显示器', value: 'monitor' },
        ],
      },
    },
    quantity: {
      type: 'number',
      widget: 'number',
      title: '数量',
      required: true,
      min: 1,
      default: 1,
    },
  },
} satisfies NexusSchema;

// ── 演示 2：联动表单（A 为数据源，B 订阅 A）────────────────────────────────
// A 表单：订单（formId: 'order-form'）→ 价格、数量、备注
const linkSourceSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    price: {
      type: 'number',
      widget: 'number',
      title: '单价',
      required: true,
      default: 199,
      min: 0,
    },
    count: {
      type: 'number',
      widget: 'number',
      title: '数量',
      required: true,
      default: 2,
      min: 1,
    },
    remark: {
      type: 'string',
      widget: 'input',
      title: '备注',
      placeholder: '输入后同步到汇总表单',
    },
  },
} satisfies NexusSchema;

// B 表单：汇总（formId: 'summary-form'）
// - total：crossForm 计算字段，订阅 A 的 price/count，实时重算总额
// - promoCode：crossForm 条件联动，A 单价 > 100 时显示并必填
// - note：由 linkForm 编程式同步（transform 加前缀）
const linkTargetSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    total: {
      type: 'number',
      widget: 'number',
      title: '总额（自动计算）',
      readOnly: true,
      description: '来源：order-form.price × order-form.count',
      reactions: [
        {
          crossForm: 'order-form',
          dependencies: ['price', 'count'],
          fulfill: { state: { value: '{{ $deps[0] * $deps[1] }}' } },
        },
      ],
    },
    promoCode: {
      type: 'string',
      widget: 'input',
      title: '优惠码',
      placeholder: '单价 > 100 时出现',
      description: '来源：order-form.price，条件联动 visible + required',
      reactions: [
        {
          crossForm: 'order-form',
          dependencies: ['price'],
          when: '{{ $deps[0] > 100 }}',
          fulfill: { state: { visible: true, required: true } },
          otherwise: { state: { visible: false, required: false } },
        },
      ],
    },
    note: {
      type: 'string',
      widget: 'input',
      title: '备注（同步自订单）',
      readOnly: true,
      description: '来源：linkForm 编程式联动（transform 加前缀）',
    },
  },
} satisfies NexusSchema;

// 关键代码片段（用于 CodeBlock 展示）
const linkSchemaSnippet = `// B 表单 Schema：跨表单联动声明
const targetSchema = {
  type: 'object',
  properties: {
    total: {
      type: 'number',
      widget: 'number',
      readOnly: true,
      reactions: [{
        crossForm: 'order-form',           // 源表单 formId
        dependencies: ['price', 'count'],  // 源表单字段
        fulfill: { state: { value: '{{ $deps[0] * $deps[1] }}' } },
      }],
    },
    promoCode: {
      type: 'string',
      reactions: [{
        crossForm: 'order-form',
        dependencies: ['price'],
        when: '{{ $deps[0] > 100 }}',
        fulfill:   { state: { visible: true,  required: true } },
        otherwise: { state: { visible: false, required: false } },
      }],
    },
  },
};

// 编程式联动（任意时机调用，返回取消函数）
const unlink = formB.getEngine().linkForm(
  formA.getEngine(),          // 或源表单 formId 字符串：'order-form'
  'remark',                   // 源字段
  'note',                     // 目标字段
  { transform: (v) => \`备注：\${v ?? ''}\` },
);`;

export default function MultiFormPage() {
  // 演示 1：两个独立实例（不配置 formId → 不注册、不参与联动）
  const [profileForm] = useForm();
  const [orderForm] = useForm();
  const [profileResult, setProfileResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [orderResult, setOrderResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  // 演示 2：两个可联动实例（配置 formId → 自动注册到默认注册表）
  const [sourceForm] = useForm('order-form');
  const [targetForm] = useForm('summary-form');
  const [summaryResult, setSummaryResult] = useState<Record<
    string,
    unknown
  > | null>(null);

  // 注册 antd UI（每个引擎独立注册）
  useEffect(() => {
    registerAntdUI(profileForm._getEngine());
    registerAntdUI(orderForm._getEngine());
  }, [profileForm, orderForm]);
  useEffect(() => {
    registerAntdUI(sourceForm._getEngine());
    registerAntdUI(targetForm._getEngine());
  }, [sourceForm, targetForm]);

  // 演示 2：编程式跨表单联动（remark → note，带前缀转换）
  useEffect(() => {
    const unlink = targetForm
      .getEngine()
      .linkForm(sourceForm.getEngine(), 'remark', 'note', {
        transform: (v) => `备注：${String(v ?? '')}`,
      });
    return unlink;
  }, [sourceForm, targetForm]);

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
      <Title level={2} style={{ marginBottom: 4 }}>
        多表单实例与跨表单联动
      </Title>
      <Paragraph type='secondary'>
        一个页面挂载多个表单实例；表单之间可通过 formId 建立声明式（crossForm
        reaction）或编程式（linkForm）联动
      </Paragraph>

      {/* ── 演示 1：同页两个独立表单 ── */}
      <Card
        title='演示 1：同页两个独立表单（互不影响）'
        size='small'
        style={{ marginBottom: 24 }}
        extra={
          <Text type='secondary' style={{ fontSize: 12 }}>
            未配置 formId，两个实例完全隔离
          </Text>
        }
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Card
            title='个人信息'
            size='small'
            style={{ flex: 1, minWidth: 320 }}
          >
            <NexusForm
              form={profileForm}
              schema={profileSchema}
              onFinish={async (data) => setProfileResult(data)}
              footer={
                <Space style={{ marginTop: 16 }}>
                  <Button type='primary' htmlType='submit'>
                    提交个人信息
                  </Button>
                  <Button onClick={() => profileForm.resetFields()}>
                    重置
                  </Button>
                </Space>
              }
            />
            {profileResult && (
              <pre style={{ fontSize: 12, marginTop: 8 }}>
                {JSON.stringify(profileResult, null, 2)}
              </pre>
            )}
          </Card>
          <Card
            title='订单信息'
            size='small'
            style={{ flex: 1, minWidth: 320 }}
          >
            <NexusForm
              form={orderForm}
              schema={orderSchema}
              onFinish={async (data) => setOrderResult(data)}
              footer={
                <Space style={{ marginTop: 16 }}>
                  <Button type='primary' htmlType='submit'>
                    提交订单
                  </Button>
                  <Button onClick={() => orderForm.resetFields()}>重置</Button>
                </Space>
              }
            />
            {orderResult && (
              <pre style={{ fontSize: 12, marginTop: 8 }}>
                {JSON.stringify(orderResult, null, 2)}
              </pre>
            )}
          </Card>
        </div>
        <Paragraph
          type='secondary'
          style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
        >
          两个表单各自持有独立的数据与校验状态：提交“个人信息”不影响“订单信息”，
          任一表单的重置/校验/联动都只作用于自身实例。
        </Paragraph>
      </Card>

      {/* ── 演示 2：两个表单联动 ── */}
      <Card
        title='演示 2：两个表单联动（formId + crossForm + linkForm）'
        size='small'
        style={{ marginBottom: 24 }}
        extra={
          <Text type='secondary' style={{ fontSize: 12 }}>
            useForm(&apos;order-form&apos;) / useForm(&apos;summary-form&apos;)
          </Text>
        }
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Card
            title='订单（数据源）'
            size='small'
            style={{ flex: 1, minWidth: 320 }}
          >
            <NexusForm
              form={sourceForm}
              schema={linkSourceSchema}
              footer={false}
            />
            <Paragraph
              type='secondary'
              style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}
            >
              修改「单价 / 数量 / 备注」，右侧汇总表单实时联动。
            </Paragraph>
          </Card>
          <Card
            title='订单汇总（联动目标）'
            size='small'
            style={{ flex: 1, minWidth: 320 }}
          >
            <NexusForm
              form={targetForm}
              schema={linkTargetSchema}
              onFinish={async (data) => setSummaryResult(data)}
              footer={
                <Space style={{ marginTop: 16 }}>
                  <Button type='primary' htmlType='submit'>
                    提交汇总
                  </Button>
                  <Button onClick={() => targetForm.resetFields()}>重置</Button>
                </Space>
              }
            />
            {summaryResult && (
              <pre style={{ fontSize: 12, marginTop: 8 }}>
                {JSON.stringify(summaryResult, null, 2)}
              </pre>
            )}
          </Card>
        </div>
        <Divider style={{ margin: '16px 0' }} />
        <CodeBlock
          lang='ts'
          title='联动声明（Schema + linkForm）'
          code={linkSchemaSnippet}
        />
        <Paragraph
          type='secondary'
          style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
        >
          <Text strong>总额</Text>：crossForm 计算字段，实时 = 单价 × 数量；
          <Text strong>优惠码</Text>： 单价 &gt; 100 时显示并必填；
          <Text strong>备注</Text>：linkForm 编程式同步（transform
          添加前缀）。跨表单联动为单向，反向联动可在源表单同样声明。
        </Paragraph>
      </Card>
      </div>
    </MainArea>
  );
}
