import { formControlCommon } from './_common';

export const segmentedSchema = {
  options: { widget: 'propertyOptions', title: '选项（value/label）' },
  block: { type: 'boolean', widget: 'switch', title: '整行宽度（block）' },
  ...formControlCommon,
};
