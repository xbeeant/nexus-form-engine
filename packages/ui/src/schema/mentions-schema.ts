import { formControlCommon } from './_common';

// ── 本地数据版 ──────────────────────────────────────────────────────────────
export const mentionsSchema = {
  options: { widget: 'propertyOptions', title: '提及候选（label 为触发词）' },
  prefix: {
    type: 'string',
    widget: 'input',
    title: '触发前缀',
    placeholder: '默认 @',
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  autoSize: {
    type: 'boolean',
    widget: 'switch',
    title: '自适应高度',
  },
  rows: {
    type: 'number',
    widget: 'number',
    title: '行数',
    placeholder: '默认 1',
  },
  ...formControlCommon,
};

// ── 远程数据版 ──────────────────────────────────────────────────────────────
export const mentionsRemoteSchema = {
  prefix: {
    type: 'string',
    widget: 'input',
    title: '触发前缀',
    placeholder: '默认 @',
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  autoSize: {
    type: 'boolean',
    widget: 'switch',
    title: '自适应高度',
  },
  rows: {
    type: 'number',
    widget: 'number',
    title: '行数',
    placeholder: '默认 1',
  },
  // ── 远程数据配置 ────────────────────────────────────────────────────────
  remoteData: {
    type: 'object',
    widget: 'propertyRemoteData',
    title: '远程数据',
    description: '配置联想数据源，支持 GET/POST 请求与动态参数。用户输入触发前缀时会自动请求',
    default: undefined,
  },
  // ────────────────────────────────────────────────────────────────────────
  ...formControlCommon,
};
