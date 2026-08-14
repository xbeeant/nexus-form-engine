export const sliderSchema = {
  // 滑块的取值范围（props.min/max 为 UI 属性，可通过「Schema」标签页 JSON 编辑；
  // 校验约束 min/max 位于「校验配置」分区，schema 级并会自动转校验规则）
  step: {
    type: 'number',
    widget: 'number',
    title: '步长',
    placeholder: '如 1',
  },
  range: { type: 'boolean', widget: 'switch', title: '范围模式（双滑块）' },
  dots: { type: 'boolean', widget: 'switch', title: '只显示刻度值' },
  included: {
    type: 'boolean',
    widget: 'switch',
    title: '包含选中区间',
    description: '选中区间是否填充（含边界刻度）',
  },
  reverse: { type: 'boolean', widget: 'switch', title: '反向' },
  vertical: { type: 'boolean', widget: 'switch', title: '垂直方向' },
  keyboard: { type: 'boolean', widget: 'switch', title: '键盘操作' },
  tooltip: {
    type: 'boolean',
    widget: 'switch',
    title: '显示数值提示',
  },
  marks: {
    type: 'string',
    widget: 'textarea',
    title: '刻度标记（JSON）',
    placeholder: '如 {"0":"0%","50":"50%","100":"100%"}',
  },
};
