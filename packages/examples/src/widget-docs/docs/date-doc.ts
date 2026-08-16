// ============================================================================
// date-doc — 日期选择组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const dateDoc: WidgetDoc = {
  id: 'date',
  group: '日期时间',
  title: '日期选择',
  english: 'DatePicker',
  description:
    '日期选择器。format 控制格式与存储值；picker 切换周/月/季度/年选择；showTime 开启时间选择。',
  demos: [
    {
      title: '基础用法',
      description:
        'format 声明显示与存储格式（默认 YYYY-MM-DD）；allowClear 允许清除；default 设置初始日期字符串。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          birthday: {
            type: 'string',
            widget: 'date',
            title: '生日',
            props: { allowClear: true },
          },
          joinDate: {
            type: 'string',
            widget: 'date',
            title: '入职日期（斜杠格式）',
            default: '2024/06/01',
            props: { format: 'YYYY/MM/DD' },
          },
        },
      },
    },
    {
      title: '周/月/季度/年选择',
      description: 'picker 切换选择粒度；不同粒度下 format 需与之匹配。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          reportWeek: {
            type: 'string',
            widget: 'date',
            title: '周报所属周',
            props: { picker: 'week', format: 'YYYY年WW周' },
          },
          reportMonth: {
            type: 'string',
            widget: 'date',
            title: '月报所属月',
            props: { picker: 'month', format: 'YYYY年MM月' },
          },
          quarter: {
            type: 'string',
            widget: 'date',
            title: '季度',
            props: { picker: 'quarter' },
          },
          planYear: {
            type: 'string',
            widget: 'date',
            title: '计划年份',
            props: { picker: 'year' },
          },
        },
      },
    },
    {
      title: '日期 + 时间',
      description:
        'showTime 在日期基础上增加时间选择；format 需包含时间部分；needConfirm 开启后需点击确定才提交；inputReadOnly 禁止手动输入。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          meetingTime: {
            type: 'string',
            widget: 'date',
            title: '会议时间',
            props: {
              showTime: true,
              format: 'YYYY-MM-DD HH:mm',
              needConfirm: true,
            },
          },
          deadline: {
            type: 'string',
            widget: 'date',
            title: '截止时间（禁止输入）',
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
