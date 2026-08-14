// ============================================================================
// 站点共享的演示数据：Schema、外部字段、自定义 catalog
// 供「使用示例」与「设计器」两个页面复用
// 属性描述符（propertySchemaMap）与 UI 注册由 Designer 内置默认提供
// （@nexus/form-engine-ui 的 widgetSchemas / registerAntdUI），无需此处组装
// ============================================================================

import type { NexusSchema } from '@nexus/form-engine';
import type { CatalogItem, FieldDef } from '@nexus/form-engine-designer';

// ============================================================================
// 外部字段列表示例：传入 Designer 后左侧 palette 多一个「字段列表」分组
// ============================================================================
export const externalFields: FieldDef[] = [
  { id: 'order_no', name: '订单编号', widget: 'input' },
  { id: 'amount', name: '金额', widget: 'number' },
  { id: 'status', name: '订单状态', widget: 'select' },
  { id: 'created_at', name: '创建时间', widget: 'date' },
  { id: 'remark', name: '备注', widget: 'textarea' },
];

// ============================================================================
// 自定义 widget catalog 示例：扩展内置 catalog
// ============================================================================
export const customWidgetCatalog: CatalogItem[] = [
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
// 演示 Schema：覆盖 9 种 widget + 10 种 layout + reactions + 数据对象 + 校验
// ============================================================================
export const demoSchema: NexusSchema = {
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
          description:
            '用于登录的账户名（P0 字段级约束：min/max/pattern 自动转校验规则）',
          min: 3,
          max: 20,
          pattern: '^[a-zA-Z0-9_]+$',
        },
        password: {
          type: 'string',
          widget: 'password',
          title: '密码',
          required: true,
          placeholder: '至少 6 位',
          // 规则不带 trigger → 实时生效（输入后立即反馈，提交时同样校验）
          rules: [{ min: 6, message: '密码至少 6 位' }],
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
            },
          ],
        },
        birthday: {
          type: 'string',
          widget: 'date',
          title: '出生日期',
        },
        tmpDateRange: {
          type: 'array',
          widget: 'dateRange',
          default: ['2026-12-01', '2026-12-21'],
          title: '临时日期范围',
          items: { type: 'string', widget: 'date' },
        },
        tmpTimeRange: {
          type: 'array',
          widget: 'timeRange',
          title: '临时时间范围',
          default: ['02:12:01', '12:21:21'],
          items: { type: 'string', widget: 'time' },
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

    promo: {
      widget: '',
      type: 'card',
      title: '促销与计算（hidden / required / 计算字段演示）',
      properties: {
        usePromo: {
          type: 'boolean',
          widget: 'switch',
          title: '使用优惠码',
        },
        promoCode: {
          type: 'string',
          widget: 'input',
          title: '优惠码',
          placeholder: '3-12 位大写字母/数字',
          description: 'hidden/required：勾选优惠码后显示并必填',
          hidden: '{{ formData.usePromo === false }}',
          required: '{{ formData.usePromo === true }}',
          pattern: '^[A-Z0-9]{3,12}$',
          min: 3,
          max: 12,
        },
        unitPrice: {
          type: 'number',
          widget: 'number',
          title: '单价',
          default: 99,
          min: 0,
        },
        quantity: {
          type: 'number',
          widget: 'number',
          title: '数量',
          default: 1,
          min: 1,
        },
        amount: {
          type: 'number',
          widget: 'number',
          title: '总额（计算字段）',
          readOnly: true,
          description:
            'reactions fulfill.state.value = 单价 × 数量，自动重算并传播',
          reactions: [
            {
              dependencies: ['unitPrice', 'quantity'],
              fulfill: {
                state: { value: '{{ $deps[0] * $deps[1] }}' },
              },
            },
          ],
        },
      },
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
