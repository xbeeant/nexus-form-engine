import { formControlCommon } from './_common';

// ── 本地数据版 ──────────────────────────────────────────────────────────────
export const multiSelectSchema = {
  options: { widget: 'propertyOptions', title: '选项（value/label）' },
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
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
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  maxTagCount: { type: 'number', widget: 'number', title: '最大标签数' },
  maxCount: { type: 'number', widget: 'number', title: '最大选中数' },
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
  tokenSeparators: {
    type: 'string',
    widget: 'input',
    title: '自动分词分隔符',
    placeholder: '多个用逗号分隔，如 ,;',
  },
  ...formControlCommon,
};

// ── 远程数据版 ──────────────────────────────────────────────────────────────
export const remoteMultiSelectSchema = {
  showSearch: { type: 'boolean', widget: 'switch', title: '可搜索' },
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
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  maxTagCount: { type: 'number', widget: 'number', title: '最大标签数' },
  maxCount: { type: 'number', widget: 'number', title: '最大选中数' },
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
  tokenSeparators: {
    type: 'string',
    widget: 'input',
    title: '自动分词分隔符',
    placeholder: '多个用逗号分隔，如 ,;',
  },
  // ── 远程数据配置 ────────────────────────────────────────────────────────
  remoteData: {
    type: 'object',
    widget: 'propertyRemoteData',
    title: '远程数据',
    description: '配置异步数据源，支持 GET/POST 请求与动态参数',
    default: undefined,
  },
  // ────────────────────────────────────────────────────────────────────────
  ...formControlCommon,
};
