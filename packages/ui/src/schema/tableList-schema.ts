export const tableListSchema = {
  addText: {
    type: 'string',
    widget: 'input',
    title: '添加按钮文案',
    placeholder: '默认「添加一行」',
  },
  hideAddButton: { type: 'boolean', widget: 'switch', title: '隐藏添加按钮' },
  hideDeleteButton: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏删除按钮',
  },
  scrollX: { type: 'boolean', widget: 'switch', title: '横向滚动' },
};
