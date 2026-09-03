import { formControlCommon } from './_common';

export const dateRangeSchema = {
  format: {
    type: 'string',
    widget: 'select',
    title: '日期/时间格式',
    props: {
      options: [
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
        { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
        { value: 'YYYY年MM月DD日', label: 'YYYY年MM月DD日' },
        { value: 'YYYY-MM-DD HH:mm:ss', label: 'YYYY-MM-DD HH:mm:ss' },
        { value: 'YYYY-MM-DD HH:mm', label: 'YYYY-MM-DD HH:mm' },
      ],
    },
  },
  showTime: { type: 'boolean', widget: 'switch', title: '显示时间' },
  showNow: {
    type: 'boolean',
    widget: 'switch',
    title: '显示「此刻」按钮',
    description: '面板底部展示当前日期/时间按钮',
  },
  needConfirm: {
    type: 'boolean',
    widget: 'switch',
    title: '确认后提交',
    description: '开启 showTime 时生效',
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  inputReadOnly: { type: 'boolean', widget: 'switch', title: '禁止输入' },
  ...formControlCommon,
};
