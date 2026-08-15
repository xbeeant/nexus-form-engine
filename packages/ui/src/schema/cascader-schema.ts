import { formControlCommon } from './_common';

export const cascaderSchema = {
  options: {
    widget: 'propertyOptions',
    title: '选项（value/label）',
    description: '扁平选项生成一级选择；多级嵌套请使用「级联数据」JSON',
  },
  cascaderData: {
    type: 'string',
    widget: 'textarea',
    title: '级联数据（JSON）',
    placeholder: '[{"value":"a","label":"A","children":[{"value":"a1","label":"A1"}]}]',
  },
  changeOnSelect: {
    type: 'boolean',
    widget: 'switch',
    title: '选中即提交（父级可选）',
  },
  multiple: { type: 'boolean', widget: 'switch', title: '允许多选' },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
  expandTrigger: {
    type: 'string',
    widget: 'select',
    title: '展开触发方式',
    props: {
      options: [
        { value: 'click', label: '点击' },
        { value: 'hover', label: '悬停' },
      ],
    },
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  ...formControlCommon,
};
