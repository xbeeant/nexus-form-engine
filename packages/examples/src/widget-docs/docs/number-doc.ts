// ============================================================================
// number-doc — 数字输入组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const numberDoc: WidgetDoc = {
  id: 'number',
  group: '基础输入',
  title: '数字输入',
  english: 'InputNumber',
  description:
    '数字输入框，支持步长、小数精度、增减按钮、前后缀。数值范围（min/max）写在字段节点上会自动转换为校验规则（见「校验配置」）。',
  demos: [
    {
      title: '基础用法',
      description:
        'step 控制增减步长；controls 关闭后隐藏增减按钮；keyboard 控制键盘上下键步进。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          age: {
            type: 'number',
            widget: 'number',
            title: '年龄',
            props: { step: 1, controls: true },
          },
          score: {
            type: 'number',
            widget: 'number',
            title: '评分',
            props: { step: 0.5, keyboard: true },
          },
          count: {
            type: 'number',
            widget: 'number',
            title: '数量（无按钮）',
            props: { controls: false },
          },
        },
      },
    },
    {
      title: '精度与前后缀',
      description:
        'precision 固定小数位数；prefix/suffix 显示在输入框内部两端；addonBefore/addonAfter 在输入框外部拼接标签。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          price: {
            type: 'number',
            widget: 'number',
            title: '商品单价',
            props: { precision: 2, prefix: '¥', addonAfter: '元' },
          },
          weight: {
            type: 'number',
            widget: 'number',
            title: '重量',
            props: { precision: 1, suffix: 'kg' },
          },
          ratio: {
            type: 'number',
            widget: 'number',
            title: '折扣率',
            props: { precision: 2, addonBefore: '促销', addonAfter: '%' },
          },
        },
      },
    },
    {
      title: '范围校验与高精度',
      description:
        'min/max 写在字段节点上（非 props），Parser 自动转换为数值范围校验规则；stringMode 开启后以字符串存储，避免浮点精度问题。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          quantity: {
            type: 'number',
            widget: 'number',
            title: '采购数量',
            description: '范围 1-100，越界提交时提示',
            min: 1,
            max: 100,
            props: { step: 1 },
          },
          amount: {
            type: 'number',
            widget: 'number',
            title: '金额（高精度）',
            props: { precision: 4, stringMode: true, addonBefore: '¥' },
          },
        },
      },
    },
  ],
};
