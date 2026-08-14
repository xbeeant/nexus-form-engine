// ── 公共表单控件属性 ─────────────────────────────────────────────────────────
// antd v6 所有表单控件（Input/Select/DatePicker/...）共有的声明式属性，
// 供各组件 schema 通过 `...formControlCommon` 复用。
// 注：antd v6 中 bordered 已废弃（改用 variant），故不在此提供 bordered。

export const formControlCommon = {
  size: {
    type: 'string',
    widget: 'select',
    title: '尺寸（size）',
    props: {
      options: [
        { value: 'large', label: '大' },
        { value: 'middle', label: '中' },
        { value: 'small', label: '小' },
      ],
    },
  },
  status: {
    type: 'string',
    widget: 'select',
    title: '状态（status）',
    props: {
      options: [
        { value: 'error', label: '错误' },
        { value: 'warning', label: '警告' },
      ],
    },
  },
  variant: {
    type: 'string',
    widget: 'select',
    title: '形态变体（variant）',
    props: {
      options: [
        { value: 'outlined', label: '线框' },
        { value: 'filled', label: '填充' },
        { value: 'borderless', label: '无边框' },
        { value: 'underlined', label: '下划线' },
      ],
    },
  },
};
