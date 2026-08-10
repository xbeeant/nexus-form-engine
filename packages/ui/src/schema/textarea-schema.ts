export const textareaSchema = {
  maxLength: { type: 'number', widget: 'number', title: '最大字符数' },
  showCount: { type: 'boolean', widget: 'switch', title: '显示字数统计' },
  autoSize: { type: 'boolean', widget: 'switch', title: '自适应高度' },
  rows: {
    type: 'number',
    widget: 'number',
    title: '行数',
    props: { min: 1, max: 20 },
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
};
