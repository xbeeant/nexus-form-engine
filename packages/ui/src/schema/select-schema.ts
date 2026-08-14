import { formControlCommon } from './_common';

export const selectSchema = {
  options: { widget: 'propertyOptions', title: '选项（value/label）' },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  optionFilterProp: {
    type: 'string',
    widget: 'select',
    title: '搜索匹配字段',
    props: {
      options: [
        { value: 'value', label: '值（value）' },
        { value: 'label', label: '文案（label）' },
        { value: 'children', label: '子节点（children）' },
      ],
    },
  },
  listHeight: {
    type: 'number',
    widget: 'number',
    title: '下拉列表高度',
    placeholder: '默认 256',
  },
  popupMatchSelectWidth: {
    type: 'boolean',
    widget: 'switch',
    title: '下拉框与选择器同宽',
  },
  ...formControlCommon,
};
