// ============================================================================
// radio-doc — 单选组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const radioDoc: WidgetDoc = {
  id: 'radio',
  group: '选择类',
  title: '单选',
  english: 'Radio',
  description:
    '单选组，用于少量互斥选项。默认点状样式，optionType: "button" 切换为按钮样式（可配合 buttonStyle 调整外观）。',
  demos: [
    {
      title: '基础用法',
      description:
        'enum + enumNames 声明选项；字段类型为 string 时值为选中项的值。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          gender: {
            type: 'string',
            widget: 'radio',
            title: '性别',
            required: true,
            enum: ['male', 'female'],
            enumNames: ['男', '女'],
          },
          payment: {
            type: 'string',
            widget: 'radio',
            title: '支付方式',
            enum: ['alipay', 'wechat', 'card'],
            enumNames: ['支付宝', '微信支付', '银行卡'],
          },
        },
      },
    },
    {
      title: '按钮样式',
      description:
        'optionType: "button" 渲染为按钮组；buttonStyle 切换描边（outline）与实心（solid）；size 控制尺寸。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          frequency: {
            type: 'string',
            widget: 'radio',
            title: '发布频率（描边）',
            enum: ['daily', 'weekly', 'monthly'],
            enumNames: ['每日', '每周', '每月'],
            props: { optionType: 'button', buttonStyle: 'outline' },
          },
          plan: {
            type: 'string',
            widget: 'radio',
            title: '订阅计划（实心）',
            enum: ['free', 'pro', 'enterprise'],
            enumNames: ['免费版', '专业版', '企业版'],
            props: {
              optionType: 'button',
              buttonStyle: 'solid',
              size: 'small',
            },
          },
        },
      },
    },
  ],
};
