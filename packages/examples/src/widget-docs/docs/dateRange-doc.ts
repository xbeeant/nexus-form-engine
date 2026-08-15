// ============================================================================
// dateRange-doc — 日期范围选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const dateRangeDoc: WidgetDoc = {
  id: 'dateRange',
  group: '日期时间',
  title: '日期范围',
  english: 'DatePicker.RangePicker',
  description:
    '起止日期范围选择，值为 [start, end] 数组。支持时间范围（showTime）、格式自定义与禁止手动输入。',
  demos: [
    {
      title: '基础用法',
      description:
        '字段类型为 array，值为 [开始日期, 结束日期]；format 控制格式；allowClear 允许清除。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          travelDays: {
            type: 'array',
            widget: 'dateRange',
            title: '出行日期',
            required: true,
            props: { allowClear: true },
          },
          campaign: {
            type: 'array',
            widget: 'dateRange',
            title: '活动周期（斜杠格式）',
            props: { format: 'YYYY/MM/DD' },
          },
        },
      },
    },
    {
      title: '起止时间范围',
      description:
        'showTime 开启时间选择，format 需包含时间部分；needConfirm 提交前需确认；inputReadOnly 禁止手动输入。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          maintenance: {
            type: 'array',
            widget: 'dateRange',
            title: '维护窗口',
            props: {
              showTime: true,
              format: 'YYYY-MM-DD HH:mm',
              needConfirm: true,
            },
          },
          locked: {
            type: 'array',
            widget: 'dateRange',
            title: '冻结区间（禁止输入）',
            props: {
              showTime: true,
              format: 'YYYY-MM-DD HH:mm:ss',
              inputReadOnly: true,
            },
          },
        },
      },
    },
  ],
};
