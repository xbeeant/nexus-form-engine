export const dateSchema = {
  format: {
    type: 'string',
    widget: 'select',
    title: '日期/时间格式',
    props: {
      options: [
        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
        { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD' },
        { value: 'YYYY年MM月DD日', label: 'YYYY年MM月DD日' },
        { value: 'HH:mm:ss', label: 'HH:mm:ss' },
        { value: 'HH:mm', label: 'HH:mm' },
      ],
    },
  },
  showTime: { type: 'boolean', widget: 'switch', title: '显示时间' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  disabledDate: { type: 'boolean', widget: 'switch', title: '禁用日期' },
};
