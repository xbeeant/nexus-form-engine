// ============================================================================
// cardList — 设计器属性面板 Schema
// 与 x-render CardList 配置对齐：theme / max / operateBtnType / *BtnProps 等
// ============================================================================

export const cardListSchema = {
  theme: {
    type: 'string',
    widget: 'select',
    title: '主题风格',
    enum: ['card', 'collapse', 'lineTitle'],
    enumNames: ['卡片 (Card)', '折叠面板 (Collapse)', '标题行 (lineTitle)'],
    default: 'card',
  },
  operateBtnType: {
    type: 'string',
    widget: 'select',
    title: '操作按钮样式',
    enum: ['text', 'icon'],
    enumNames: ['图标+文字', '仅图标'],
    default: 'text',
  },
  hasBackground: {
    type: 'boolean',
    widget: 'switch',
    title: '显示背景色',
  },
  max: {
    type: 'number',
    widget: 'inputNumber',
    title: '列表最大项数',
    placeholder: '不限制',
  },
  hideAdd: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏添加按钮',
  },
  hideDelete: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏删除按钮',
  },
  hideMove: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏上下移动按钮',
  },
  hideCopy: {
    type: 'boolean',
    widget: 'switch',
    title: '隐藏复制按钮',
  },
};
