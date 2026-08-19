// ============================================================================
// MultiInstancePage — 单 form 多实例（schema 互相独立）
// 同一 useForm() 返回的 form 可挂载多个不同 schema 的 NexusForm：
// - 每个 NexusForm 通过 instanceId 定向到独立实例（schema/值/校验/订阅隔离）
// - form 的 API 默认聚合全部实例，也可传 instanceId 定向操作
// ============================================================================

import type { NexusEngine, NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { Button, Card, Divider, Space, Typography } from 'antd';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { CodeBlock } from '../site/CodeBlock';
import { MainArea } from '../site/MainArea';

const { Paragraph, Text, Title } = Typography;

// ── 演示 1/2：账户信息 + 收货地址（两个不同 schema 挂到同一个 form）────────
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

// ── 演示 3：不指定 instanceId（自动分配 'default' / 'nexus-1'）─────────────
const noteSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    content: {
      type: 'string',
      widget: 'input',
      title: '内容',
    },
  },
} satisfies NexusSchema;

const tagSchema = {
  type: 'object',
  displayType: 'row',
  properties: {
    tag: {
      type: 'string',
      widget: 'input',
      title: '标签',
    },
  },
} satisfies NexusSchema;

// 关键代码片段（用于 CodeBlock 展示）
const multiInstanceSnippet = `// 一个 form 挂载多个不同 schema 的表单：各自实例完全独立
const [form] = useForm();

<NexusForm form={form} instanceId="account" schema={accountSchema} />
<NexusForm form={form} instanceId="address" schema={addressSchema} />

// form API 默认聚合全部实例
form.setValues({ username: '张三', city: '北京' }); // 应用到所有实例
form.getValues(); // => { username: '张三', email: '', city: '北京', street: '' }
form.submit();    // 逐实例校验，全部通过才触发各自的 onFinish

// 传入 instanceId 定向操作单个实例
form.setValues({ street: '中关村大街' }, 'address');
form.getValues(undefined, 'address'); // 仅 address 实例数据
form.resetFields('account');          // 只重置账户信息
form.submit('account');               // 只校验并提交账户实例`;

/**
 * 实例数据实时预览（等价于 useFormData，但可指定任意实例视图引擎）
 */
function useInstanceData(engine: NexusEngine): Record<string, unknown> {
  const _version = useSyncExternalStore(
    (cb) => engine.subscribeStore(cb),
    () => engine.getSnapshot(),
    () => engine.getSnapshot(),
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: _version 是 formData 失效信号
  return useMemo(() => engine.getFormData(), [engine, _version]);
}

export default function MultiInstancePage() {
  // 演示 1/2：同一个 form（共享一个引擎），挂载两个不同 schema 的表单
  const [form] = useForm();
  const [accountResult, setAccountResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [addressResult, setAddressResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [submitFailed, setSubmitFailed] = useState(false);

  // 演示 3：另一个 form 自动分配实例 id（'default' + 'nexus-1'）
  const [autoForm] = useForm();

  const engine = form._getEngine();
  const accountEngine = engine.instance('account');
  const addressEngine = engine.instance('address');

  const accountData = useInstanceData(accountEngine);
  const addressData = useInstanceData(addressEngine);
  const mergedData = useMemo(
    () => ({ ...accountData, ...addressData }),
    [accountData, addressData],
  );

  // 注册 antd UI（实例共享引擎级注册）
  useEffect(() => {
    registerAntdUI(engine);
    registerAntdUI(autoForm._getEngine());
  }, [engine, autoForm]);

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <Title level={2} style={{ marginBottom: 4 }}>
          单 form 多实例（schema 互相独立）
        </Title>
        <Paragraph type='secondary'>
          同一个 useForm() 可挂载多个不同 schema 的 NexusForm：实例间
          schema、数据、校验、watch 订阅完全隔离；form 的 API 默认聚合全部实例，
          也可传 instanceId 定向操作单个实例
        </Paragraph>

        {/* ── 演示 1：同一 form 双实例 ── */}
        <Card
          title='演示 1：同一 form 挂载两个不同 schema（显式 instanceId）'
          size='small'
          style={{ marginBottom: 24 }}
          extra={
            <Text type='secondary' style={{ fontSize: 12 }}>
              instanceId=&quot;account&quot; / &quot;address&quot;
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
                instanceId='account'
                schema={accountSchema}
                onFinish={async (data) => setAccountResult(data)}
                footer={
                  <Space style={{ marginTop: 16 }}>
                    <Button type='primary' htmlType='submit'>
                      提交账户
                    </Button>
                    <Button onClick={() => form.resetFields('account')}>
                      重置
                    </Button>
                  </Space>
                }
              />
              {accountResult && (
                <pre style={{ fontSize: 12, marginTop: 8 }}>
                  {JSON.stringify(accountResult, null, 2)}
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
                instanceId='address'
                schema={addressSchema}
                onFinish={async (data) => setAddressResult(data)}
                footer={
                  <Space style={{ marginTop: 16 }}>
                    <Button type='primary' htmlType='submit'>
                      提交地址
                    </Button>
                    <Button onClick={() => form.resetFields('address')}>
                      重置
                    </Button>
                  </Space>
                }
              />
              {addressResult && (
                <pre style={{ fontSize: 12, marginTop: 8 }}>
                  {JSON.stringify(addressResult, null, 2)}
                </pre>
              )}
            </Card>
          </div>
          <Paragraph
            type='secondary'
            style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
          >
            两个实例共享一个 form，但 schema 与数据互不影响：提交「账户信息」
            不会校验「收货地址」，任意实例的重置/联动都只作用于自身。
          </Paragraph>
        </Card>

        {/* ── 演示 2：聚合与定向 API ── */}
        <Card
          title='演示 2：聚合 API 与定向操作'
          size='small'
          style={{ marginBottom: 24 }}
          extra={
            <Text type='secondary' style={{ fontSize: 12 }}>
              setValues / getValues / submit / resetFields
            </Text>
          }
        >
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 320 }}>
              <Space wrap>
                <Button
                  onClick={() =>
                    form.setValues(
                      { username: '张三', email: 'zhangsan@example.com' },
                      'account',
                    )
                  }
                >
                  填充账户（定向）
                </Button>
                <Button
                  onClick={() =>
                    form.setValues(
                      { city: '北京', street: '中关村大街' },
                      'address',
                    )
                  }
                >
                  填充地址（定向）
                </Button>
                <Button
                  onClick={() =>
                    form.setValues({ username: '全体用户', street: '聚合赋值' })
                  }
                >
                  全部填充（聚合）
                </Button>
                <Button danger onClick={() => form.resetFields()}>
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
              <Paragraph
                type='secondary'
                style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}
              >
                未传 instanceId 时：setValues 应用到全部实例、getValues 合并、
                submit 逐实例校验（任一失败则整体不提交）、resetFields
                全部重置。
              </Paragraph>
            </div>
            <div style={{ flex: 1, minWidth: 320 }}>
              <Text strong>account 实例数据</Text>
              <pre style={{ fontSize: 12 }}>
                {JSON.stringify(accountData, null, 2)}
              </pre>
              <Text strong>address 实例数据</Text>
              <pre style={{ fontSize: 12 }}>
                {JSON.stringify(addressData, null, 2)}
              </pre>
              <Text strong>form.getValues()（合并）</Text>
              <pre style={{ fontSize: 12 }}>
                {JSON.stringify(mergedData, null, 2)}
              </pre>
            </div>
          </div>
        </Card>

        {/* ── 演示 3：自动分配实例 id ── */}
        <Card
          title='演示 3：不传 instanceId（自动分配 default / nexus-1）'
          size='small'
          style={{ marginBottom: 24 }}
          extra={
            <Text type='secondary' style={{ fontSize: 12 }}>
              兼容直接使用引擎的默认实例
            </Text>
          }
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Card
              title='便签（default 实例）'
              size='small'
              style={{ flex: 1, minWidth: 320 }}
            >
              <NexusForm form={autoForm} schema={noteSchema} footer={false} />
            </Card>
            <Card
              title='便签（nexus-1 实例）'
              size='small'
              style={{ flex: 1, minWidth: 320 }}
            >
              <NexusForm form={autoForm} schema={tagSchema} footer={false} />
            </Card>
          </div>
          <Paragraph
            type='secondary'
            style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}
          >
            未指定 instanceId 时：首个 NexusForm 使用 default 实例（与直接操作
            engine 的场景兼容），后续自动分配 nexus-1 / nexus-2
            …。两实例字段名不同， watch / 校验 / 提交互不干扰。
          </Paragraph>
        </Card>

        <Divider style={{ margin: '8px 0 16px' }} />
        <CodeBlock
          lang='tsx'
          title='单 form 多实例核心代码'
          code={multiInstanceSnippet}
        />
      </div>
    </MainArea>
  );
}
