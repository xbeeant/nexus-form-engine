import { formControlCommon } from './_common';

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
