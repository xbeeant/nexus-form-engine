import { formControlCommon } from './_common';

export const treeSelectSchema = {
  url: {
    type: 'string',
    widget: 'input',
    title: '数据接口地址',
    placeholder: '如 /api/tree',
  },
  searchUrl: {
    type: 'string',
    widget: 'input',
    title: '搜索接口地址',
    placeholder: '不配置时走 url + searchKey',
  },
  searchKey: {
    type: 'string',
    widget: 'input',
    title: '搜索参数名',
    placeholder: '默认 keyword',
  },
  parentKey: {
    type: 'string',
    widget: 'input',
    title: '父节点参数名',
    placeholder: '默认 pid',
  },
  pidKey: {
    type: 'string',
    widget: 'input',
    title: '响应中父节点字段名',
    placeholder: '默认 pid',
  },
  method: {
    type: 'string',
    widget: 'select',
    title: '请求方法',
    props: {
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
      ],
    },
  },
  dataPath: {
    type: 'string',
    widget: 'input',
    title: '数据取值路径',
    placeholder: '如 data.list',
  },
  valueKey: {
    type: 'string',
    widget: 'input',
    title: 'value 字段名',
    placeholder: '默认 value',
  },
  labelKey: {
    type: 'string',
    widget: 'input',
    title: 'label 字段名',
    placeholder: '默认 label',
  },
  childrenKey: {
    type: 'string',
    widget: 'input',
    title: 'children 字段名',
    placeholder: '默认 children',
  },
  hasChildrenKey: {
    type: 'string',
    widget: 'input',
    title: 'hasChildren 字段名',
    placeholder: '后端是否有子节点字段',
  },
  isLeafKey: {
    type: 'string',
    widget: 'input',
    title: 'isLeaf 字段名',
    placeholder: '后端是否叶子节点字段',
  },
  params: {
    type: 'string',
    widget: 'textarea',
    title: '额外请求参数',
    placeholder: 'JSON 格式，如 {"type": "all"}',
  },
  multiple: { type: 'boolean', widget: 'switch', title: '允许多选' },
  treeCheckable: {
    type: 'boolean',
    widget: 'switch',
    title: '节点复选框',
    description: '多选模式下默认开启',
  },
  showCheckedStrategy: {
    type: 'string',
    widget: 'select',
    title: '选中回填策略',
    props: {
      options: [
        { value: 'SHOW_CHILD', label: '仅显示子节点' },
        { value: 'SHOW_PARENT', label: '仅显示父节点' },
        { value: 'SHOW_ALL', label: '显示全部' },
      ],
    },
  },
  maxTagCount: { type: 'number', widget: 'number', title: '最大标签数' },
  treeDefaultExpandAll: {
    type: 'boolean',
    widget: 'switch',
    title: '默认展开全部节点',
  },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
  asyncLoad: { type: 'boolean', widget: 'switch', title: '异步加载子节点' },
  autoExpand: { type: 'boolean', widget: 'switch', title: '自动展开' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  readOnlyUrl: {
    type: 'string',
    widget: 'input',
    title: '只读回显接口',
    placeholder: '如 /api/tree/detail',
  },
  ...formControlCommon,
};
