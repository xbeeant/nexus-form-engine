export const simpleListSchema = {
  addText: {
    type: 'string',
    widget: 'input',
    title: '添加按钮文案',
    placeholder: '默认「添加」',
  },
  hideAdd: { type: 'boolean', widget: 'switch', title: '隐藏添加按钮' },
  hideDelete: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏删除按钮',
  },
  hideMove: { type: 'boolean', widget: 'switch', title: '隐藏移动按钮' },
  hideCopy: { type: 'boolean', widget: 'switch', title: '隐藏复制按钮' },
};
