export const numberSchema = {
  // 数值范围约束（min/max）请使用「校验配置」分区：schema 级 min/max 会
  // 自动转换为校验规则；此处仅保留纯 UI 属性（step/precision/addon/controls）
  step: {
    type: 'number',
    widget: 'number',
    title: '步长',
    placeholder: '如 1',
  },
  precision: {
    type: 'number',
    widget: 'number',
    title: '小数位数',
    props: { min: 0, max: 10 },
  },
  addonBefore: {
    type: 'string',
    widget: 'input',
    title: '前缀标签',
    placeholder: '如 ¥',
  },
  addonAfter: {
    type: 'string',
    widget: 'input',
    title: '后缀标签',
    placeholder: '如 元',
  },
  controls: { type: 'boolean', widget: 'switch', title: '显示增减按钮' },
};
