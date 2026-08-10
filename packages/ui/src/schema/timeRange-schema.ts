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
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  use12Hours: { type: 'boolean', widget: 'switch', title: '12 小时制' },
};
