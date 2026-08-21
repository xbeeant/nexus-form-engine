import { formControlCommon } from './_common';

// ── 本地数据版 ──────────────────────────────────────────────────────────────
export const autoCompleteSchema = {
  options: { widget: 'propertyOptions', title: '候选项（value/label）' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  backfill: {
    type: 'boolean',
    widget: 'switch',
    title: '键盘选中回填输入框',
  },
  defaultActiveFirstOption: {
    type: 'boolean',
    widget: 'switch',
    title: '默认高亮首项',
  },
  ...formControlCommon,
};

// ── 远程数据版 ──────────────────────────────────────────────────────────────
export const remoteAutoCompleteSchema = {
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  defaultActiveFirstOption: {
    type: 'boolean',
    widget: 'switch',
    title: '默认高亮首项',
  },
  // ── 远程数据配置 ────────────────────────────────────────────────────────
  remoteData: {
    type: 'object',
    widget: 'propertyRemoteData',
    title: '远程数据',
    description:
      '配置联想数据源，支持 GET/POST 请求与动态参数。用户输入时会自动请求此接口',
    default: undefined,
  },
  // ────────────────────────────────────────────────────────────────────────
  ...formControlCommon,
};
