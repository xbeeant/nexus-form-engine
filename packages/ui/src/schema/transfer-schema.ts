export const transferSchema = {
  transferData: {
    type: 'string',
    widget: 'textarea',
    title: '数据源（JSON）',
    placeholder: '[{"key":"a","title":"选项A"},{"key":"b","title":"选项B"}]',
  },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
  oneWay: {
    type: 'boolean',
    widget: 'switch',
    title: '单向（只能移到右侧）',
  },
  titles: {
    type: 'string',
    widget: 'input',
    title: '列标题',
    placeholder: '如 待选,已选（逗号分隔）',
  },
};
