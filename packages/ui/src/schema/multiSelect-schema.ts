export const multiSelectSchema = {
  options: { widget: 'propertyOptions', title: '选项（value/label）' },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  maxTagCount: { type: 'number', widget: 'number', title: '最大标签数' },
};
