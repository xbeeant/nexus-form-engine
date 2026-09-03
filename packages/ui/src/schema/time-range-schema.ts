import { formControlCommon } from './_common';

export const timeRangeSchema = {
  format: {
    type: 'string',
    widget: 'select',
    title: '时间格式',
    props: {
      options: [
        { value: 'HH:mm:ss', label: 'HH:mm:ss' },
        { value: 'HH:mm', label: 'HH:mm' },
      ],
    },
  },
  hourStep: {
    type: 'number',
    widget: 'number',
    title: '小时步长',
    props: { min: 1, max: 24 },
  },
  minuteStep: {
    type: 'number',
    widget: 'number',
    title: '分钟步长',
    props: { min: 1, max: 60 },
  },
  secondStep: {
    type: 'number',
    widget: 'number',
    title: '秒步长',
    props: { min: 1, max: 60 },
  },
  use12Hours: { type: 'boolean', widget: 'switch', title: '12 小时制' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  inputReadOnly: { type: 'boolean', widget: 'switch', title: '禁止输入' },
  ...formControlCommon,
};
