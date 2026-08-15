// ============================================================================
// input-doc — 输入框组件文档
// 实例 1：基础用法（尺寸/变体/清除） 实例 2：前后缀与标签 实例 3：字数统计与限制
// ============================================================================

import type { WidgetDoc } from '../types';

export const inputDoc: WidgetDoc = {
  id: 'input',
  group: '基础输入',
  title: '输入框',
  english: 'Input',
  description:
    '单行文本输入框，表单最常用的基础组件。支持前后缀、清除按钮、字数统计，以及 antd 6 的尺寸（size）、形态变体（variant）、状态（status）等公共属性。',
  demos: [
    {
      title: '基础用法',
      description:
        '声明 type: "string" + widget: "input" 即可渲染输入框。size 控制尺寸，allowClear 开启清除按钮，variant 切换线框/填充/无边框/下划线四种形态。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          name: {
            type: 'string',
            widget: 'input',
            title: '姓名',
            placeholder: '请输入姓名',
            required: true,
          },
          nickname: {
            type: 'string',
            widget: 'input',
            title: '昵称',
            props: { size: 'large', allowClear: true },
          },
          remark: {
            type: 'string',
            widget: 'input',
            title: '备注',
            props: { variant: 'filled', status: 'warning' },
          },
        },
      },
    },
    {
      title: '前后缀与前后置标签',
      description:
        'prefix/suffix 在输入框内部前后显示装饰内容；addonBefore/addonAfter 在输入框外部拼接标签，常用于单位、协议名等场景。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          website: {
            type: 'string',
            widget: 'input',
            title: '个人网站',
            placeholder: 'example.com',
            props: {
              addonBefore: 'https://',
              prefix: '🌐',
            },
          },
          price: {
            type: 'string',
            widget: 'input',
            title: '价格',
            props: { addonAfter: '元', suffix: '💰' },
          },
          discount: {
            type: 'string',
            widget: 'input',
            title: '折扣码',
            props: { prefix: 'VIP-', addonBefore: '优惠券' },
          },
        },
      },
    },
    {
      title: '字数统计与长度限制',
      description:
        'maxLength 限制最大字符数，showCount 展示当前字数。二者常组合使用实现输入长度控制。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          slogan: {
            type: 'string',
            widget: 'input',
            title: '宣传语',
            maxLength: 20,
            props: { showCount: true },
          },
          code: {
            type: 'string',
            widget: 'input',
            title: '短代码',
            maxLength: 6,
            placeholder: '最多 6 位',
          },
        },
      },
    },
  ],
};
