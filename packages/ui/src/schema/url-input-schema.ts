import { formControlCommon } from './_common';

export const urlInputSchema = {
  maxLength: { type: 'number', widget: 'number', title: '最大字符数' },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  ...formControlCommon,
};
