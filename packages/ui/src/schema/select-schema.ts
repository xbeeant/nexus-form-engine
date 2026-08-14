export const selectSchema = {
  options: { widget: 'propertyOptions', title: '选项（value/label）' },
  mode: {
    type: 'string',
    widget: 'select',
    title: '模式',
    props: {
      options: [
        { value: 'multiple', label: '多选' },
        { value: 'tags', label: '标签' },
      ],
    },
  },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  maxTagCount: { type: 'number', widget: 'number', title: '最大标签数' },
  bordered: { type: 'boolean', widget: 'switch', title: '显示边框' },
};
