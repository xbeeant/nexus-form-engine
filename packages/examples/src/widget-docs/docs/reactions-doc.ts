// ============================================================================
// reactions-doc — 联动（Reactions / Dependencies）协议文档
// 覆盖：简单联动表达式、计算字段、when/fulfill/otherwise、schema 补丁、
// 相对路径依赖解析、validate 表达式跨字段校验
// ============================================================================

import type { WidgetDoc } from '../types';

export const reactionsDoc: WidgetDoc = {
  id: 'reactions',
  group: '联动',
  title: '联动',
  english: 'Reactions',
  description:
    '声明式联动协议：字段通过 required/hidden/disabled/readOnly 表达式或结构化 reactions 依赖其他字段，依赖变化时由依赖图 O(k) 精准触发状态更新，无需手写事件监听。',
  demos: [
    {
      title: '简单联动（hidden / required 表达式）',
      description:
        'required / disabled / readOnly / hidden 支持 "{{ formData.xxx }}" 表达式，Parser 自动转 reaction 并提取依赖：勾选开关后优惠码显示并必填。',
      schema: {
        type: 'object',
        displayType: 'row',
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
            description: 'hidden/required 表达式联动：勾选后显示并必填',
            hidden: '{{ formData.usePromo === false }}',
            required: '{{ formData.usePromo === true }}',
            pattern: '^[A-Z0-9]{3,12}$',
          },
        },
      },
    },
    {
      title: '计算字段（fulfill.state.value）',
      description:
        'reactions 可声明式计算字段值：总额 = 单价 × 数量。值变化后自动重校验并沿依赖图继续传播（formily x-reactions state.value 对齐）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
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
            description: '由 reactions 自动重算，无需手动输入',
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
    },
    {
      title: 'when / fulfill / otherwise',
      description:
        '条件成立执行 fulfill，否则执行 otherwise。这里用单选控制两个字段的显示与必填互斥切换（visible + required 状态补丁）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          contactMethod: {
            type: 'string',
            widget: 'radio',
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
        },
      },
    },
    {
      title: 'schema 补丁级联选项',
      description:
        'schema 补丁支持点路径覆盖（如 props.options），仅运行时生效、不持久化回 Schema。这里按分类动态切换子选项列表。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          category: {
            type: 'string',
            widget: 'radio',
            title: '商品分类',
            default: 'phone',
            enum: ['phone', 'computer'],
            enumNames: ['手机', '电脑'],
          },
          product: {
            type: 'string',
            widget: 'select',
            title: '具体商品',
            required: true,
            props: {
              options: [
                { label: 'iPhone 15', value: 'iphone-15' },
                { label: '华为 Mate 60', value: 'mate-60' },
              ],
            },
            reactions: [
              {
                dependencies: ['category'],
                when: '{{ $deps[0] === "phone" }}',
                fulfill: {
                  schema: {
                    'props.options': [
                      { label: 'iPhone 15', value: 'iphone-15' },
                      { label: '华为 Mate 60', value: 'mate-60' },
                      { label: '小米 14', value: 'mi-14' },
                    ],
                  },
                },
                otherwise: {
                  schema: {
                    'props.options': [
                      { label: 'MacBook Pro', value: 'macbook-pro' },
                      { label: 'ThinkPad X1', value: 'thinkpad-x1' },
                      { label: 'ROG 幻 16', value: 'rog-16' },
                    ],
                  },
                },
              },
            ],
          },
        },
      },
    },
    {
      title: '相对路径依赖解析',
      description:
        'dependencies 允许相对路径：address.city 内声明 ["province"] 会从最内层作用域向上解析为 address.province（_autoExpr 依赖则为根级绝对路径）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          address: {
            type: 'object',
            properties: {
              province: {
                type: 'string',
                widget: 'select',
                title: '省份',
                enum: ['beijing', 'zhejiang'],
                enumNames: ['北京', '浙江'],
              },
              city: {
                type: 'string',
                widget: 'select',
                title: '城市（依赖 province）',
                props: {
                  options: [
                    { label: '北京', value: 'beijing' },
                    { label: '杭州', value: 'hangzhou' },
                    { label: '宁波', value: 'ningbo' },
                  ],
                },
                reactions: [
                  {
                    dependencies: ['province'],
                    when: '{{ $deps[0] === "beijing" }}',
                    fulfill: {
                      schema: {
                        'props.options': [
                          { label: '北京', value: 'beijing' },
                          { label: '海淀区', value: 'haidian' },
                        ],
                      },
                    },
                    otherwise: {
                      schema: {
                        'props.options': [
                          { label: '杭州', value: 'hangzhou' },
                          { label: '宁波', value: 'ningbo' },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    {
      title: 'validate 表达式跨字段校验',
      description:
        'validate: { key: "{{ ... }}" } 生成携带 _validateExpr 的规则，formData.xxx 依赖进入依赖图——依赖字段变化时实时重校验目标字段（如确认密码）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          password: {
            type: 'string',
            widget: 'password',
            title: '密码',
            required: true,
            rules: [{ min: 6, message: '密码至少 6 位' }],
          },
          confirm: {
            type: 'string',
            widget: 'password',
            title: '确认密码',
            required: true,
            validate: {
              match: '{{ formData.password === $self.value }}',
            },
          },
        },
      },
    },
  ],
  fallbackProps: [
    {
      name: 'required / disabled / readOnly / hidden',
      description:
        '简单联动：布尔值或 "{{ formData.xxx === ... }}" 表达式，Parser 自动转 reaction 并提取依赖',
      type: 'boolean | string',
    },
    {
      name: 'dependencies',
      description:
        '声明依赖字段路径（支持相对路径，从最内层作用域向上解析）；依赖变化时触发本字段联动与重新渲染',
      type: 'string[]',
    },
    {
      name: 'when',
      description:
        '条件表达式（白名单上下文：$deps/$self/$form/$index/formData/rootValue），满足时执行 fulfill',
      type: 'string',
    },
    {
      name: 'fulfill / otherwise',
      description:
        '状态补丁（value/visible/hidden/disabled/readOnly/required/loading/title/description/props.*）与 schema 补丁（点路径覆盖，如 props.options）',
      type: '{ state?, schema? }',
    },
    {
      name: 'validate',
      description:
        '跨字段校验：{ key: "{{ 表达式 }}" }，依赖字段变化时实时重校验目标字段',
      type: 'Record<string, string>',
    },
  ],
};
