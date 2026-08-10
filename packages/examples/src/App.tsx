import type { NexusSchema } from '@nexus/form-engine';
import {
  type CatalogItem,
  Designer,
  type FieldDef,
} from '@nexus/form-engine-designer';
import { NexusForm, useForm } from '@nexus/form-engine-react';
import {
  cardSchema,
  checkboxesSchema,
  checkboxSchema,
  colorSchema,
  dateRangeSchema,
  dateSchema,
  htmlSchema,
  imageSchema,
  inputSchema,
  listSchema,
  multiSelectSchema,
  numberSchema,
  passwordSchema,
  radioSchema,
  rateSchema,
  registerAntdUI,
  selectSchema,
  simpleListSchema,
  sliderSchema,
  switchSchema,
  tableListSchema,
  textareaSchema,
  timeRangeSchema,
  timeSchema,
  treeSelectSchema,
  urlInputSchema,
  voidTitleSchema,
} from '@nexus/form-engine-ui';
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

// ============================================================================
// 外部字段列表示例：传入 Designer 后左侧 palette 多一个「字段列表」分组
// ============================================================================
const externalFields: FieldDef[] = [
  { id: 'order_no', name: '订单编号', widget: 'input' },
  { id: 'amount', name: '金额', widget: 'number' },
  { id: 'status', name: '订单状态', widget: 'select' },
  { id: 'created_at', name: '创建时间', widget: 'date' },
  { id: 'remark', name: '备注', widget: 'textarea' },
];

// ============================================================================
// 自定义 widget catalog 示例：扩展内置 catalog
// ============================================================================
const customWidgetCatalog: CatalogItem[] = [
  {
    label: '富文本',
    icon: '✍️',
    category: 'widget',
    widget: 'richText',
    createNode: () => ({
      type: 'string',
      widget: 'richText',
      title: '富文本',
    }),
  },
  {
    label: '评分',
    icon: '⭐',
    category: 'widget',
    widget: 'rate',
    createNode: () => ({ type: 'number', widget: 'rate', title: '评分' }),
  },
];

// ============================================================================
// 1. Schema：全面演示
// ============================================================================
const schema: NexusSchema = {
  type: 'object',
  displayType: 'row',
  labelWidth: 200,
  colon: true,
  properties: {
    basicCard: {
      widget: '',
      type: 'card',
      title: '基本信息（card 布局）',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          title: '用户名',
          required: true,
          placeholder: '3-20 个字符',
          description: '用于登录的账户名',
          rules: [
            {
              min: 3,
              max: 20,
              message: '用户名长度需在 3-20 之间',
              trigger: 'submit',
            },
          ],
        },
        password: {
          type: 'string',
          widget: 'password',
          title: '密码',
          required: true,
          placeholder: '至少 6 位',
          rules: [{ min: 6, message: '密码至少 6 位', trigger: 'submit' }],
        },
        age: {
          type: 'integer',
          widget: 'number',
          title: '年龄',
          rules: [
            {
              min: 0,
              max: 150,
              message: '年龄需在 0-150 之间',
              trigger: 'submit',
            },
          ],
        },
        birthday: {
          type: 'string',
          widget: 'date',
          title: '出生日期',
        },
        bio: {
          type: 'string',
          widget: 'textarea',
          title: '个人简介',
          placeholder: '一句话介绍自己',
          extra: '将展示在个人主页',
          colSpan: 2,
        },
        userId: {
          type: 'string',
          widget: 'input',
          title: '用户 ID',
          readOnly: true,
          default: 'USR-00001',
          description: '系统自动生成，不可编辑',
        },
        inviteCode: {
          type: 'string',
          widget: 'input',
          title: '邀请码',
          disabled: true,
          placeholder: '当前不可填写',
        },
      },
    },
    prefGrid: {
      widget: '',
      type: 'grid',
      column: 2,
      properties: {
        profile: {
          widget: '',
          type: 'object',
          properties: {
            prefGrid: {
              widget: '',
              type: 'grid',
              column: 2,
              properties: {
                website: {
                  type: 'string',
                  widget: 'input',
                  title: '个人网站',
                  placeholder: 'https://',
                },
                score: {
                  type: 'integer',
                  widget: 'number',
                  title: '积分',
                },
              },
            },
          },
        },
        gender: {
          type: 'string',
          widget: 'radio',
          title: '性别',
          enum: ['male', 'female'],
          enumNames: ['男', '女'],
        },
        city: {
          type: 'string',
          widget: 'select',
          title: '所在城市',
          enum: ['北京', '上海', '深圳', '杭州', '成都'],
        },
        subscribe: {
          type: 'boolean',
          widget: 'checkbox',
          title: '订阅邮件通知',
        },
        notify: {
          type: 'boolean',
          widget: 'switch',
          title: '推送通知',
        },
      },
    },

    prefTabs: {
      widget: '',
      type: 'tabs',
      properties: {
        accountPane: {
          widget: '',
          type: 'tabPane',
          title: '账户设置',
          properties: {
            email: {
              type: 'string',
              widget: 'input',
              title: '邮箱',
              rules: [
                {
                  pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
                  message: '邮箱格式不正确',
                  trigger: 'submit',
                },
              ],
            },
            phone: {
              type: 'string',
              widget: 'input',
              title: '手机号',
              rules: [
                {
                  pattern: '^1[3-9]\\d{9}$',
                  message: '手机号格式不正确',
                  trigger: 'submit',
                },
              ],
            },
          },
        },
        privacyPane: {
          widget: '',
          type: 'tabPane',
          title: '隐私设置',
          properties: {
            publicProfile: {
              type: 'boolean',
              widget: 'switch',
              title: '公开个人资料',
            },
            showEmail: {
              type: 'boolean',
              widget: 'checkbox',
              title: '在个人页显示邮箱',
            },
          },
        },
      },
    },

    advanced: {
      widget: '',
      type: 'collapse',
      properties: {
        apiPanel: {
          widget: '',
          type: 'collapsePanel',
          title: 'API 配置',
          properties: {
            apiKey: {
              type: 'string',
              widget: 'password',
              title: 'API Key',
              placeholder: 'sk-...',
            },
            webhook: {
              type: 'string',
              widget: 'input',
              title: 'Webhook URL',
              placeholder: 'https://',
            },
          },
        },
        debugPanel: {
          widget: '',
          type: 'collapsePanel',
          title: '调试选项',
          properties: {
            debugMode: {
              type: 'boolean',
              widget: 'switch',
              title: '调试模式',
            },
          },
        },
      },
    },

    wizard: {
      widget: '',
      type: 'steps',
      properties: {
        step1: {
          widget: '',
          type: 'step',
          title: '身份验证',
          properties: {
            realName: {
              type: 'string',
              widget: 'input',
              title: '真实姓名',
              required: true,
            },
            idNumber: {
              type: 'string',
              widget: 'input',
              title: '身份证号',
            },
          },
        },
        step2: {
          widget: '',
          type: 'step',
          title: '补充信息',
          properties: {
            occupation: {
              type: 'string',
              widget: 'input',
              title: '职业',
            },
            company: {
              type: 'string',
              widget: 'input',
              title: '公司',
            },
          },
        },
      },
    },

    flexRow: {
      widget: '',
      type: 'flex',
      properties: {
        fieldA: {
          type: 'string',
          widget: 'input',
          title: '字段 A',
        },
        fieldB: {
          type: 'string',
          widget: 'input',
          title: '字段 B',
        },
      },
    },

    div1: {
      widget: '',
      type: 'divider',
      title: '以下为联系方式（reactions 联动演示）',
      properties: {},
    },

    contactMethod: {
      type: 'string',
      widget: 'select',
      title: '首选联系方式',
      required: true,
      enum: ['phone', 'email'],
      enumNames: ['手机', '邮箱'],
    },
    contactPhone: {
      type: 'string',
      widget: 'input',
      title: '手机号',
      placeholder: '11 位手机号',
      rules: [
        {
          pattern: '^1[3-9]\\d{9}$',
          message: '手机号格式不正确',
          trigger: 'submit',
        },
      ],
      reactions: [
        {
          dependencies: ['contactMethod'],
          when: '{{ $deps[0] === "phone" }}',
          fulfill: { state: { visible: true, required: true } },
          otherwise: { state: { visible: false, required: false } },
        },
      ],
    },
    contactEmail: {
      type: 'string',
      widget: 'input',
      title: '邮箱',
      placeholder: 'name@example.com',
      rules: [
        {
          pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
          message: '邮箱格式不正确',
          trigger: 'submit',
        },
      ],
      reactions: [
        {
          dependencies: ['contactMethod'],
          when: '{{ $deps[0] === "email" }}',
          fulfill: { state: { visible: true, required: true } },
          otherwise: { state: { visible: false, required: false } },
        },
      ],
    },

    profile: {
      widget: '',
      type: 'object',
      properties: {
        website: {
          type: 'string',
          widget: 'input',
          title: '个人网站',
          placeholder: 'https://',
        },
        score: {
          type: 'integer',
          widget: 'number',
          title: '积分',
        },
      },
    },
  },
};

/** widget 名 → 属性 descriptor 映射（设计器专用） */
export const widgetSchemas: Record<string, Record<string, any>> = {
  input: inputSchema,
  card: cardSchema,
  password: passwordSchema,
  textarea: textareaSchema,
  number: numberSchema,
  select: selectSchema,
  multiSelect: multiSelectSchema,
  radio: radioSchema,
  checkbox: checkboxSchema,
  checkboxes: checkboxesSchema,
  switch: switchSchema,
  date: dateSchema,
  dateRange: dateRangeSchema,
  time: timeSchema,
  timeRange: timeRangeSchema,
  slider: sliderSchema,
  color: colorSchema,
  rate: rateSchema,
  urlInput: urlInputSchema,
  image: imageSchema,
  html: htmlSchema,
  voidTitle: voidTitleSchema,
  treeSelect: treeSelectSchema,
  list: listSchema,
  simpleList: simpleListSchema,
  tableList: tableListSchema,
};

// ============================================================================
// 2. 渲染
// ============================================================================
function App() {
  const [form] = useForm();
  const [submitted, setSubmitted] = useState<Record<string, unknown> | null>(
    null,
  );
  const [errorCount, setErrorCount] = useState(0);
  const [readOnly, setReadOnly] = useState(false);
  const [removeHidden, setRemoveHidden] = useState(true);
  const [view, setView] = useState<'demo' | 'designer'>('demo');

  // 注册 antd UI（仅首次）
  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  // 注册外部校验逻辑（Feature 5）
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
      // 模拟后端接口调用
      await new Promise((r) => setTimeout(r, 300));
      const taken = ['root', 'admin', 'system'].includes(v.toLowerCase());
      return taken ? [`用户名 "${v}" 已被占用`] : [];
    });
  }, [form]);

  // ── Schema 设计器视图 ──────────────────────────────────────────────
  if (view === 'designer') {
    return (
      <div
        style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
      >
        <div
          style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}
        >
          <Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              @nexus/form-engine
            </Typography.Title>
            <Segmented
              value={view}
              onChange={(v) => setView(v as 'demo' | 'designer')}
              options={[
                { label: '表单示例', value: 'demo' },
                { label: 'Schema 设计器', value: 'designer' },
              ]}
            />
          </Space>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Designer
            schema={schema}
            propertySchemaMap={widgetSchemas}
            registerUI={registerAntdUI}
            fields={externalFields}
            widgetCatalog={customWidgetCatalog}
          />
        </div>
      </div>
    );
  }

  // ── 表单示例视图 ───────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1440, margin: '40px auto', padding: '0 16px' }}>
      <Typography.Title level={2} style={{ marginBottom: 4 }}>
        @nexus/form-engine 示例
      </Typography.Title>
      <Typography.Paragraph type='secondary'>
        通过 form 属性 + useForm() 接入，覆盖 9 种 widget + 10 种 layout +
        reactions 联动 + 数据对象 + 校验 + 只读模式 + watch + removeHiddenData +
        registerValidator + widget 依赖值 / form 实例
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
        <Segmented
          value={view}
          onChange={(v) => setView(v as 'demo' | 'designer')}
          options={[
            { label: '表单示例', value: 'demo' },
            { label: 'Schema 设计器', value: 'designer' },
          ]}
        />
        <Button
          onClick={() => setReadOnly((v) => !v)}
          type={readOnly ? 'primary' : 'default'}
        >
          {readOnly ? '退出只读模式' : '进入只读模式'}
        </Button>
      </Space>

      {/* ── 特性控制：removeHiddenData ── */}
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
                console.log(
                  `getValues(): ${JSON.stringify(form.getValues())}`,
                  form.getValues(),
                )
              }
            >
              读取所有可见值
            </Button>
            <Button
              size='small'
              onClick={() =>
                console.log(
                  `getAllValues(): ${JSON.stringify(form.getAllValues())}`,
                )
              }
            >
              读取所有值（含 hidden）
            </Button>
            <Button
              size='small'
              onClick={() =>
                console.log(
                  'getHiddenValues(): ' +
                    JSON.stringify(form.getHiddenValues()),
                )
              }
            >
              读取 hidden 值
            </Button>
          </Space>
          <Space>
            <Button
              size='small'
              onClick={() => form.setValueByPath('username', 'zhangsan_new')}
            >
              设置 username
            </Button>
            <Button
              size='small'
              onClick={() =>
                form.setSchemaByPath('username', { title: '用户名（已修改）' })
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
                console.error(
                  `校验结果: ${JSON.stringify(Object.fromEntries(errors))}`,
                );
              }}
            >
              校验指定字段
            </Button>
          </Space>
          <Space>
            <Typography.Text type='secondary' style={{ fontSize: 12 }}>
              <b>registerValidator</b> 演示：用户名含 "admin" 报错 / 含 "root"
              或 "system" 报错 / 年龄 18-120 / 密码一致性校验（提交时触发）
            </Typography.Text>
          </Space>
        </Space>
      </Card>

      <NexusForm
        form={form}
        schema={schema}
        readOnly={readOnly}
        removeHiddenData={removeHidden}
        watch={{
          // 监听 username 变化
          username: (value, allValues) => {
            console.log('watch username', value, allValues);
          },
          // 监听 age 变化
          age: (value) => {
            console.log('watch age', value);
          },
          // 全局监听所有字段变化
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
          <Typography.Text type='success' style={{ fontSize: 12 }}>
            ✓ form.submit() / form.getValues() / form.getAllValues() /
            form.getValueByPath() / form.setValueByPath() /
            form.setSchemaByPath() / form.registerValidator() /
            form.validateFields() / form.resetFields() 等方法可用
          </Typography.Text>
        </Card>
      )}
    </div>
  );
}

export default App;
