// ============================================================================
// timeRange-doc — 时间范围组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const timeRangeDoc: WidgetDoc = {
  id: 'timeRange',
  group: '日期时间',
  title: '时间范围',
  english: 'TimePicker.RangePicker',
  description:
    '起止时间范围选择，值为 [开始时间, 结束时间] 数组。支持步长、格式自定义与 12 小时制。',
  demos: [
    {
      title: '基础用法',
      description:
        '字段类型为 array，值为 [开始, 结束]；format 控制格式；allowClear 允许清除。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          workTime: {
            type: 'array',
            widget: 'timeRange',
            title: '工作时间',
            props: { format: 'HH:mm' },
          },
          full: {
            type: 'array',
            widget: 'timeRange',
            title: '完整秒格式',
            props: { format: 'HH:mm:ss', allowClear: true },
          },
        },
      },
    },
    {
      title: '步长与 12 小时制',
      description:
        'minuteStep 控制分钟步长；use12Hours 切换 12 小时制。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          schedule: {
            type: 'array',
            widget: 'timeRange',
            title: '值班时段（15 分钟步长）',
            props: {
              format: 'HH:mm',
              minuteStep: 15,
            },
          },
          twelve: {
            type: 'array',
            widget: 'timeRange',
            title: '12 小时制时段',
            props: {
              use12Hours: true,
              format: 'h:mm A',
            },
          },
        },
      },
    },
  ],
};
