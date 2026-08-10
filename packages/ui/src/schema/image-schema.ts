export const imageSchema = {
  maxCount: {
    type: 'number',
    widget: 'number',
    title: '最大数量',
    props: { min: 1 },
  },
  accept: {
    type: 'string',
    widget: 'input',
    title: '文件类型',
    placeholder: '如 image/*',
  },
  listType: {
    type: 'string',
    widget: 'select',
    title: '列表样式',
    props: {
      options: [
        { value: 'text', label: '文本' },
        { value: 'picture', label: '图片' },
        { value: 'picture-card', label: '卡片' },
      ],
    },
  },
};
