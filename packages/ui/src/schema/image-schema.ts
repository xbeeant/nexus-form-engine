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
  multiple: { type: 'boolean', widget: 'switch', title: '多选文件' },
  showUploadList: {
    type: 'boolean',
    widget: 'switch',
    title: '显示上传列表',
  },
  directory: { type: 'boolean', widget: 'switch', title: '支持文件夹' },
  name: {
    type: 'string',
    widget: 'input',
    title: '上传字段名',
    placeholder: '默认 file',
  },
};
