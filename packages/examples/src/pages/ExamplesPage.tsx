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
    // 同步校验：商品名称不能包含 "测试"/"test"/"admin"
    form.registerValidator('name', (value) => {
      const v = String(value ?? '');
      if (v && /(测试|test|admin)/i.test(v)) {
        return ['商品名称不能包含 "测试" / "test" / "admin"'];
      }
      return [];
    });

    // 同步校验：售价范围，且不得高于市场价
    form.registerValidator('price', (value, formData) => {
      const n = Number(value);
      if (value !== undefined && value !== '' && (n < 0 || n > 100000)) {
        return ['售价需在 0-100000 之间'];
      }
      const market = Number(
        (formData as Record<string, unknown>)?.marketPrice ?? 0,
      );
      if (value !== undefined && value !== '' && market > 0 && n > market) {
        return ['售价不得高于市场价'];
      }
      return [];
    });

    // 异步校验：检查品牌名是否已被占用（模拟）
    form.registerValidator('name', async (value) => {
      const v = String(value ?? '');
      if (!v || v.length < 3) {
        return [];
      }
      await new Promise((r) => setTimeout(r, 300));
      const taken = ['root', 'admin', 'system'].includes(v.toLowerCase());
      return taken ? [`商品名 "${v}" 已被占用`] : [];
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
              场景：新品发布（商品上架）。覆盖全部默认 widget（input / password
              / select / radio / checkbox / switch / rate / slider / number /
              date / time / dateRange / timeRange / color / urlInput /
              treeSelect / cascader / autoComplete / multiSelect / checkboxes /
              mentions / segmented / transfer / image / file / html / list /
              simpleList / tableList）+ 全部布局（card / grid / tabs / collapse
              / steps / flex / divider / space）+ reactions 联动 + 计算字段 +
              校验 + 数据对象 + registerValidator
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
            「促销配置」卡片演示 visible/required
            联动（勾选秒杀/优惠券显示对应字段） 与计算字段（售价 × 折扣 =
            折后价）
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
                        `getValueByPath("name"): ${form.getValueByPath('name')}`,
                      )
                    }
                  >
                    读取商品名称
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
                      form.setValueByPath('name', 'Nexus 智能手表 X2')
                    }
                  >
                    设置商品名称
                  </Button>
                  <Button
                    size='small'
                    onClick={() =>
                      form.setSchemaByPath('name', {
                        title: '商品名称（已修改）',
                      })
                    }
                  >
                    动态修改 Schema
                  </Button>
                  <Button
                    size='small'
                    onClick={async () => {
                      const errors = await form.validateFields([
                        'name',
                        'price',
                      ]);
                      console.error('校验结果:', Object.fromEntries(errors));
                    }}
                  >
                    校验指定字段
                  </Button>
                </Space>
                <Typography.Text type='secondary' style={{ fontSize: 12 }}>
                  <b>registerValidator</b> 演示：商品名含 "测试"/"test"/"admin"
                  报错 / 异步占用检查（root/admin/system）/ 售价 0-100000 且不得
                  高于市场价
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
                name: (value, allValues) => {
                  console.log('watch name', value, allValues);
                },
                price: (value) => {
                  console.log('watch price', value);
                },
                '#': (allValues) => {
                  console.log('watch all', allValues);
                },
              }}
              initialValues={{
                name: 'Nexus 智能手表 X2',
                brand: 'Nexus 科技',
                category: 'digital/phone',
                region: ['zhejiang', 'hangzhou'],
                currency: 'CNY',
                tags: ['新品', '包邮'],
                features: ['正品保障', '极速发货'],
                status: 'draft',
                channel: 'pc',
                price: 399,
                marketPrice: 499,
                discount: 80,
                stock: 200,
                safeStock: 50,
                recommend: true,
                notify: false,
                agree: true,
                profile: { website: 'https://nexus.dev', score: 98 },
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
