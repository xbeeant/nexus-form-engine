import { formControlCommon } from './_common';

// ── 本地数据版 ──────────────────────────────────────────────────────────────
// 选项通过 enum/enumNames（x-render 风格）或 options 声明
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

// ── 远程数据版 ──────────────────────────────────────────────────────────────
// 选项通过 remoteData 配置异步加载（GET/POST + 动态 params）
export const selectRemoteSchema = {
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
