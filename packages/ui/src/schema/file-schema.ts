export const fileSchema = {
  action: {
    type: 'string',
    widget: 'input',
    title: '上传接口地址（action）',
    placeholder: '如 /api/upload',
  },
  accept: {
    type: 'string',
    widget: 'input',
    title: '接受的文件类型（accept）',
    placeholder: '如 .pdf,.doc,image/*',
  },
  multiple: { type: 'boolean', widget: 'switch', title: '允许多选' },
  listType: {
    type: 'string',
    widget: 'select',
    title: '展示形态（listType）',
    props: {
      options: [
        { value: 'text', label: '文本列表' },
        { value: 'picture', label: '图片预览' },
        { value: 'picture-card', label: '图片卡片' },
      ],
    },
  },
  maxCount: {
    type: 'number',
    widget: 'number',
    title: '最大上传数量',
    placeholder: '默认无限制',
  },
  drag: { type: 'boolean', widget: 'switch', title: '拖拽上传' },
  buttonText: {
    type: 'string',
    widget: 'input',
    title: '按钮文案',
    placeholder: '默认「点击上传」',
  },
};
