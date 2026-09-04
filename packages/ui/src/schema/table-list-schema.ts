export const tableListSchema = {
  addText: {
    type: 'string',
    widget: 'input',
    title: '添加按钮文案',
    placeholder: '默认「添加一行」',
  },
  hideAdd: { type: 'boolean', widget: 'switch', title: '隐藏添加按钮' },
  hideDelete: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏删除按钮',
  },
  scrollX: { type: 'boolean', widget: 'switch', title: '横向滚动' },
  actionColumnProps: {
    type: 'object',
    title: '操作列配置',
    properties: {
      hidden: { type: 'boolean', widget: 'switch', title: '隐藏操作列' },
    },
  },
};
