// ============================================================================
// MultiInstancePage — 同一 form 多 schema（聚合 API）演示
//
// 一个 useForm() 的 form 可挂载多个不同 schema 的 NexusForm：
// - 每个 NexusForm 挂载自动获得独立实例：schema/值/校验/订阅互不影响
// - 同一 form 引用 = 同一引擎宿主：组件/插件注册等引擎级能力共享
// - form 的 API（getValues/setValues/submit/resetFields...）聚合作用于全部实例
// - 实例标识由内部自动分配（React useId），用户不感知任何 instanceId
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm, useFormData } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Card, Divider, Space, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/CodeBlock';
import { MainArea } from '../site/MainArea';

const { Paragraph, Text, Title } = Typography;

// ── 两个不同 schema 挂到同一个 form ────────────────────────────────────────
const accountSchema = {
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
  },
} satisfies NexusSchema;

const addressSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    city: {
      type: 'string',
      widget: 'input',
      title: '城市',
      required: true,
    },
    street: {
      type: 'string',
      widget: 'input',
      title: '街道',
    },
  },
} satisfies NexusSchema;

// 关键代码片段（用于 CodeBlock 展示）
const multiInstanceSnippet = `// 一个 form 挂载多个不同 schema 的表单：schema 与状态互相独立
const [form] = useForm();

<NexusForm form={form} schema={accountSchema} />
<NexusForm form={form} schema={addressSchema} />

// form 的 API 聚合作用于全部实例（无需任何 instanceId）
form.setValues({ username: '张三', city: '北京' }); // 按 schema 匹配赋值
form.getValues(); // => { username: '张三', email: '', city: '北京', street: '' }
form.submit();    // 逐实例校验，全部通过才触发各自的 onFinish
form.resetFields(); // 重置全部实例

// 组件/插件在引擎宿主注册后对全部实例生效
registerAntdUI(form.getEngine()); // 只注册一次

// 需要完全独立的表单：各自 useForm()（独立引擎宿主）
const [formB] = useForm();
<NexusForm form={formB} schema={accountSchema} />`;

/**
 * 实例数据实时预览（useFormData 消费 context 中的实例引擎，
 * 只能在 NexusForm 内部使用——这里作为 children 渲染在表单内）
 */
function LiveData({ label }: { label: string }) {
  const data = useFormData();
  return (
    <div style={{ marginTop: 12 }}>
      <Text strong style={{ fontSize: 12 }}>
        {label}
      </Text>
      <pre style={{ fontSize: 12, marginBottom: 0 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

export default function MultiInstancePage() {
  // 同一个 form（一个引擎宿主）挂载两个不同 schema
  const [form] = useForm();
  const [accountResult, setAccountResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [addressResult, setAddressResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [merged, setMerged] = useState<Record<string, unknown> | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);

  // 另一个完全独立的 form（独立引擎宿主）
  const [standaloneForm] = useForm();

  // 注册 antd UI（在引擎宿主注册一次，全部实例共享）
  useEffect(() => {
    registerAntdUI(form.getEngine());
    registerAntdUI(standaloneForm.getEngine());
  }, [form, standaloneForm]);

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          同一 form 多 schema（聚合 API）
        </Title>
        <Paragraph type='secondary'>
          一个 useForm() 的 form 可挂载多个不同 schema 的 NexusForm：
          每个挂载自动获得独立实例（schema/值/校验/订阅互不影响）； form 的 API
          聚合作用于全部实例——不需要任何 instanceId。
        </Paragraph>

        {/* ── 演示 1：同一 form 双 schema ── */}
        <Card
          title='演示 1：同一个 form 挂载两个不同 schema'
          size='small'
          style={{ marginBottom: 24 }}
          extra={
            <Text type='secondary' style={{ fontSize: 12 }}>
              同一 form = 同一引擎宿主 · 实例自动独立
            </Text>
          }
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Card
              title='账户信息'
              size='small'
              style={{ flex: 1, minWidth: 320 }}
            >
              <NexusForm
                form={form}
                schema={accountSchema}
                onFinish={async (data) => setAccountResult(data)}
                footer={
                  <Space style={{ marginTop: 16 }}>
                    <Button type='primary' htmlType='submit'>
                      提交账户
                    </Button>
                    <Button onClick={() => form.resetFields()}>重置</Button>
                  </Space>
                }
              >
                <LiveData label='account 实例数据（live）' />
              </NexusForm>
              {accountResult && (
                <pre style={{ fontSize: 12, marginTop: 8 }}>
                  onFinish: {JSON.stringify(accountResult, null, 2)}
                </pre>
              )}
            </Card>
            <Card
              title='收货地址'
              size='small'
              style={{ flex: 1, minWidth: 320 }}
            >
              <NexusForm
                form={form}
                schema={addressSchema}
                onFinish={async (data) => setAddressResult(data)}
                footer={
                  <Space style={{ marginTop: 16 }}>
                    <Button type='primary' htmlType='submit'>
                      提交地址
                    </Button>
                    <Button onClick={() => form.resetFields()}>重置</Button>
                  </Space>
                }
              >
                <LiveData label='address 实例数据（live）' />
              </NexusForm>
              {addressResult && (
                <pre style={{ fontSize: 12, marginTop: 8 }}>
                  onFinish: {JSON.stringify(addressResult, null, 2)}
                </pre>
              )}
            </Card>
          </div>
          <Paragraph
            type='secondary'
            style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
          >
            两个 NexusForm 共用一个 form：schema
            与数据互不影响（提交「账户信息」 不会校验「收货地址」）。
          </Paragraph>
        </Card>

        {/* ── 演示 2：聚合 API ── */}
        <Card
          title='演示 2：聚合 API（getValues / setValues / submit / resetFields）'
          size='small'
          style={{ marginBottom: 24 }}
          extra={
            <Text type='secondary' style={{ fontSize: 12 }}>
              无需 instanceId
            </Text>
          }
        >
          <Space wrap>
            <Button
              onClick={() => {
                form.setValues({
                  username: '张三',
                  email: 'zhangsan@example.com',
                  city: '北京',
                  street: '中关村大街',
                });
                setMerged(form.getValues());
              }}
            >
              聚合填充并读取 getValues()
            </Button>
            <Button
              danger
              onClick={() => {
                form.resetFields();
                setMerged(form.getValues());
              }}
            >
              全部重置
            </Button>
            <Button
              type='primary'
              onClick={async () => {
                setSubmitFailed(false);
                try {
                  await form.submit();
                } catch {
                  setSubmitFailed(true);
                }
              }}
            >
              聚合提交（校验全部实例）
            </Button>
          </Space>
          {submitFailed && (
            <Text type='danger' style={{ fontSize: 12 }}>
              聚合提交失败：存在未通过校验的实例（错误字段已自动聚焦）
            </Text>
          )}
          {merged && (
            <pre style={{ fontSize: 12, marginTop: 12 }}>
              form.getValues(): {JSON.stringify(merged, null, 2)}
            </pre>
          )}
          <Paragraph
            type='secondary'
            style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
          >
            setValues 按各实例的 schema 匹配赋值；getValues 合并全部实例；
            submit 逐实例校验（任一失败则整体不提交）；resetFields 全部重置。
          </Paragraph>
        </Card>

        {/* ── 演示 3：完全独立的 form ── */}
        <Card
          title='演示 3：需要完全隔离时各自 useForm()'
          size='small'
          style={{ marginBottom: 24 }}
          extra={
            <Text type='secondary' style={{ fontSize: 12 }}>
              不同 form = 不同引擎宿主
            </Text>
          }
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Card
              title='独立表单 A'
              size='small'
              style={{ flex: 1, minWidth: 320 }}
            >
              <NexusForm
                form={standaloneForm}
                schema={accountSchema}
                footer={false}
              >
                <LiveData label='standalone 实例数据（live）' />
              </NexusForm>
            </Card>
          </div>
          <Paragraph
            type='secondary'
            style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
          >
            standaloneForm 与 form
            的引擎宿主完全独立：注册、联动、状态互不影响。
          </Paragraph>
        </Card>

        <Divider style={{ margin: '8px 0 16px' }} />
        <CodeBlock
          lang='tsx'
          title='同一 form 多 schema 核心代码'
          code={multiInstanceSnippet}
        />
      </div>
    </MainArea>
  );
}
