export const simpleListSchema = {
  addText: {
    type: 'string',
    widget: 'input',
    title: '添加按钮文案',
    placeholder: '默认「添加」',
  },
  hideAddButton: { type: 'boolean', widget: 'switch', title: '隐藏添加按钮' },
  hideDeleteButton: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏删除按钮',
  },
  hideMoveButton: { type: 'boolean', widget: 'switch', title: '隐藏移动按钮' },
  hideCopyButton: { type: 'boolean', widget: 'switch', title: '隐藏复制按钮' },
};
