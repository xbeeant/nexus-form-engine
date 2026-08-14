import { formControlCommon } from './_common';

export const inputSchema = {
  addonBefore: {
    type: 'string',
    widget: 'input',
    title: '前置标签',
    placeholder: '如 https://',
  },
  addonAfter: {
    type: 'string',
    widget: 'input',
    title: '后置标签',
    placeholder: '如 元',
  },
  maxLength: {
    type: 'number',
    widget: 'number',
    title: '最大字符数',
    placeholder: '如 100',
  },
  showCount: { type: 'boolean', widget: 'switch', title: '显示字数统计' },
  prefix: {
    type: 'string',
    widget: 'input',
    title: '前缀',
    placeholder: '如 ¥',
  },
  suffix: {
    type: 'string',
    widget: 'input',
    title: '后缀',
    placeholder: '如 元',
  },
  allowClear: { type: 'boolean', widget: 'switch', title: '允许清除' },
  ...formControlCommon,
};
