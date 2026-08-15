// ============================================================================
// time-doc — 时间选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const timeDoc: WidgetDoc = {
  id: 'time',
  group: '日期时间',
  title: '时间选择',
  english: 'TimePicker',
  description:
    '时间选择器，值以字符串存储（HH:mm:ss）。支持格式、步长（hourStep/minuteStep/secondStep）与 12 小时制。',
  demos: [
    {
      title: '基础用法',
      description:
        'format 控制显示与存储格式；allowClear 允许清除；default 设置初始时间字符串。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          alarm: {
            type: 'string',
            widget: 'time',
            title: '提醒时间',
            default: '08:30:00',
            props: { allowClear: true },
          },
          short: {
            type: 'string',
            widget: 'time',
            title: '短格式',
            props: { format: 'HH:mm' },
          },
        },
      },
    },
    {
      title: '步长与 12 小时制',
      description:
        'hourStep/minuteStep/secondStep 控制各时间粒度步长；use12Hours 切换 12 小时制（含 AM/PM）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          break: {
            type: 'string',
            widget: 'time',
            title: '午休开始（步长 30 分钟）',
            props: {
              format: 'HH:mm',
              minuteStep: 30,
            },
          },
          twelve: {
            type: 'string',
            widget: 'time',
            title: '12 小时制',
            props: {
              use12Hours: true,
              format: 'h:mm:ss A',
            },
          },
        },
      },
    },
  ],
};
