// ============================================================================
// ExamplesPage — 使用示例
// 综合演示：9 种 widget + 10 种 layout + reactions 联动 + 数据对象
//             + 校验 + 只读模式 + watch + removeHiddenData + registerValidator
// ============================================================================

import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import {
  Alert,
  Button,
  Card,
  Segmented,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { CodeBlock } from '../site/CodeBlock';
import { demoSchema } from '../site/demoSchema';
import { MainArea } from '../site/MainArea';

const { Paragraph } = Typography;

export default function ExamplesPage() {
  const [form] = useForm();
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );
  const [errorCount, setErrorCount] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [locale, setLocale] = useState<'zh-CN' | 'en-US'>('zh-CN');
  const [removeHidden, setRemoveHidden] = useState(true);
  const [persist, setPersist] = useState(false);
  const [showSchema, setShowSchema] = useState<'form' | 'schema'>('form');

  // 注册 antd UI（仅首次）
  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  // 注册外部校验逻辑
  useEffect(() => {
    // 同步校验：用户名不能包含 "admin"
    form.registerValidator('username', (value) => {
      const v = String(value ?? '');
      if (v && /admin/i.test(v)) {
        return ['用户名不能包含 "admin"'];
      }
      return [];
    });

    // 同步校验：年龄范围
    form.registerValidator('age', (value) => {
      const n = Number(value);
      if (value !== undefined && value !== '' && (n < 18 || n > 120)) {
        return ['年龄需在 18-120 之间'];
      }
      return [];
    });

    // 跨字段校验：密码和确认密码一致性（示例）
    form.registerValidator('password', (value, formData) => {
      const pwd = String(value ?? '');
      const confirm = String(
        (formData as Record<string, unknown>)?.confirmPassword ?? '',
      );
      if (pwd && confirm && pwd !== confirm) {
        return ['两次输入的密码不一致'];
      }
      return [];
    });

    // 异步校验：检查用户名是否已被占用（模拟）
    form.registerValidator('username', async (value) => {
      const v = String(value ?? '');
      if (!v || v.length < 3) {
        return [];
      }
      await new Promise((r) => setTimeout(r, 300));
      const taken = ['root', 'admin', 'system'].includes(v.toLowerCase());
      return taken ? [`用户名 "${v}" 已被占用`] : [];
    });
  }, [form]);

  return (
    <MainArea>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 16px 48px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Typography.Title level={2} style={{ marginBottom: 4 }}>
              使用示例
            </Typography.Title>
            <Paragraph type='secondary'>
              覆盖 9 种 widget + 10 种 layout + reactions 联动 + 计算字段 +
              字段级校验约束（min/pattern）+ 数据对象 + registerValidator
            </Paragraph>
          </div>
          <Segmented
            value={showSchema}
            onChange={(v) => setShowSchema(v as 'form' | 'schema')}
            options={[
              { label: '表单演示', value: 'form' },
              { label: 'Schema 源码', value: 'schema' },
            ]}
          />
        </div>

        <Space style={{ marginBottom: 16 }} wrap>
          <Button
            onClick={() => setReadOnly((v) => !v)}
            type={readOnly ? 'primary' : 'default'}
          >
            {readOnly ? '退出只读模式' : '进入只读模式'}
          </Button>
          <Segmented
            value={locale}
            onChange={(v) => setLocale(v as 'zh-CN' | 'en-US')}
            options={[
              { label: '中文', value: 'zh-CN' },
              { label: 'English', value: 'en-US' },
            ]}
          />
          <Typography.Text type='secondary' style={{ fontSize: 12 }}>
            「促销与计算」卡片演示 visible/required 别名联动与计算字段（单价 ×
            数量 = 总额）
          </Typography.Text>
        </Space>

        {showSchema === 'schema' ? (
          <CodeBlock
            lang='json'
            title='demoSchema'
            code={JSON.stringify(demoSchema, null, 2)}
          />
        ) : (
          <>
            {/* ── 特性控制 ── */}
            <Card size='small' style={{ marginBottom: 16 }} title='特性演示'>
              <Space orientation='vertical' style={{ width: '100%' }}>
                <Space>
                  <Typography.Text>
                    <b>removeHiddenData</b>（提交/取值时是否移除 hidden 字段）：
                  </Typography.Text>
                  <Switch
                    checked={removeHidden}
                    onChange={setRemoveHidden}
                    checkedChildren='移除 hidden'
                    unCheckedChildren='包含 hidden'
                  />
                </Space>
                <Space>
                  <Typography.Text>
                    <b>persist</b>（草稿持久化，刷新页面自动续填）：
                  </Typography.Text>
                  <Switch
                    checked={persist}
                    onChange={setPersist}
                    checkedChildren='保存草稿'
                    unCheckedChildren='关闭'
                  />
                </Space>
                <Space>
                  <Button
                    size='small'
                    onClick={() =>
                      console.log(
                        'getValueByPath("username"): ' +
                          form.getValueByPath('username'),
                      )
                    }
                  >
                    读取 username 值
                  </Button>
                  <Button
                    size='small'
                    onClick={() =>
                      console.log('getValues():', form.getValues())
                    }
                  >
                    读取所有可见值
                  </Button>
                  <Button
                    size='small'
                    onClick={() =>
                      console.log('getAllValues():', form.getAllValues())
                    }
                  >
                    读取所有值（含 hidden）
                  </Button>
                  <Button
                    size='small'
                    onClick={() =>
                      console.log('getHiddenValues():', form.getHiddenValues())
                    }
                  >
                    读取 hidden 值
                  </Button>
                </Space>
                <Space>
                  <Button
                    size='small'
                    onClick={() =>
                      form.setValueByPath('username', 'zhangsan_new')
                    }
                  >
                    设置 username
                  </Button>
                  <Button
                    size='small'
                    onClick={() =>
                      form.setSchemaByPath('username', {
                        title: '用户名（已修改）',
                      })
                    }
                  >
                    动态修改 Schema
                  </Button>
                  <Button
                    size='small'
                    onClick={async () => {
                      const errors = await form.validateFields([
                        'username',
                        'password',
                      ]);
                      console.error('校验结果:', Object.fromEntries(errors));
                    }}
                  >
                    校验指定字段
                  </Button>
                </Space>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                  <b>registerValidator</b> 演示：用户名含 "admin" 报错 / 含
                  "root" 或 "system" 报错 / 年龄 18-120 /
                  密码一致性校验（提交时触发）
                </Typography.Text>
              </Space>
            </Card>

            <NexusForm
              form={form}
              schema={demoSchema}
              readOnly={readOnly}
              locale={locale}
              persist={
                persist
                  ? { key: 'nexus-examples-draft', storage: 'localStorage' }
                  : undefined
              }
              removeHiddenData={removeHidden}
              watch={{
                username: (value, allValues) => {
                  console.log('watch username', value, allValues);
                },
                age: (value) => {
                  console.log('watch age', value);
                },
                '#': (allValues) => {
                  console.log('watch all', allValues);
                },
              }}
              initialValues={{
                username: 'zhangsan',
                contactMethod: 'phone',
                gender: 'male',
                city: '杭州',
                subscribe: true,
                notify: false,
                publicProfile: true,
                debugMode: false,
                bio: '热爱开源的全栈工程师',
                profile: { website: 'https://zhangsan.dev', score: 1200 },
              }}
              onFinish={async (data) => {
                setSubmitted(data);
                setErrorCount(0);
              }}
              onFinishFailed={(errors) => {
                console.error(errors);
                setErrorCount(errors.size);
              }}
              footer={
                <Space style={{ marginTop: 16 }}>
                  <Button type='primary' htmlType='submit'>
                    提交
                  </Button>
                  <Button
                    onClick={() => {
                      form.resetFields();
                      setSubmitted(null);
                      setErrorCount(0);
                    }}
                  >
                    重置
                  </Button>
                </Space>
              }
            >
              {errorCount > 0 && (
                <Alert
                  type='error'
                  showIcon
                  title={`校验未通过，共 ${errorCount} 个字段有错误`}
                  style={{ marginTop: 16 }}
                />
              )}
            </NexusForm>

            {submitted && (
              <Card
                title='提交结果（formData）'
                size='small'
                style={{ marginTop: 24 }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.6,
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(submitted, null, 2)}
                </pre>
              </Card>
            )}
          </>
        )}
      </div>
    </MainArea>
  );
}
