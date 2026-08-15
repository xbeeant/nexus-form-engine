// ============================================================================
// rate-doc — 评分组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const rateDoc: WidgetDoc = {
  id: 'rate',
  group: '选择类',
  title: '评分',
  english: 'Rate',
  description:
    '星级评分。支持自定义星数（count）、半选（allowHalf）、清除（allowClear）、自定义字符（character）与悬停提示（tooltips）。',
  demos: [
    {
      title: '基础用法',
      description:
        'count 控制星数；allowHalf 开启半星；allowClear 允许再次点击清除。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          overall: {
            type: 'number',
            widget: 'rate',
            title: '综合评分',
            default: 4,
            props: { count: 5, allowClear: true },
          },
          precision: {
            type: 'number',
            widget: 'rate',
            title: '精细评分（半星）',
            default: 3.5,
            props: { count: 5, allowHalf: true },
          },
          ten: {
            type: 'number',
            widget: 'rate',
            title: '十分制',
            default: 8,
            props: { count: 10 },
          },
        },
      },
    },
    {
      title: '自定义字符与提示',
      description:
        'character 替换星星符号；tooltips 为每颗星提供悬停文案（逗号分隔）；size 控制尺寸。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          mood: {
            type: 'number',
            widget: 'rate',
            title: '体验打分',
            props: {
              count: 5,
              character: '😊',
              tooltips: '很差,较差,一般,满意,非常满意',
            },
          },
          service: {
            type: 'number',
            widget: 'rate',
            title: '服务评价',
            props: {
              count: 4,
              character: '★',
              size: 'large',
              tooltips: '失望,一般,满意,惊喜',
            },
          },
        },
      },
    },
  ],
};
