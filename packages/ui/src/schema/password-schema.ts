export const passwordSchema = {
  maxLength: { type: 'number', widget: 'number', title: '最大字符数' },
  visibilityToggle: {
    type: 'boolean',
    widget: 'switch',
    title: '显示切换按钮',
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
};
