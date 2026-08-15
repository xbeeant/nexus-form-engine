import { formControlCommon } from './_common';

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
