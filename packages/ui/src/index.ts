// ── UI 包入口文件 ─────────────────────────────────────────────────────────────
// 此文件是 @xbeeant/ui 包的主入口，统一导出所有布局、组件和 Schema 定义
// 用于快速集成 Ant Design UI 组件到表单引擎中

import './styles.css';

import type { NexusEngine, NexusPlugin } from '@xbeeant/form-engine';
import { antdLayouts } from './layouts';
import { antdWidgets } from './widgets';
import { FieldWrapper } from './widgets/_shared';

// ── 布局组件导出 ───────────────────────────────────────────────────────────────
export { antdLayouts } from './layouts';
export { cardLayout } from './layouts/card';
export { collapseLayout } from './layouts/collapse';
export { dividerLayout } from './layouts/divider';
export { flexLayout } from './layouts/flex';
export { gridLayout } from './layouts/grid';
export {
  collapsePanelLayout,
  stepLayout,
  tabPaneLayout,
  voidLayout,
} from './layouts/passThrough';
export { stepsLayout } from './layouts/steps';
export { tabsLayout } from './layouts/tabs';
export type { PropertySchemaMap } from './schema';
// ── Schema 定义导出 ─────────────────────────────────────────────────────────────
// 每个组件的 Schema 定义，用于定义组件的配置结构、验证规则和渲染行为
export {
  cardSchema, // 卡片组件 Schema
  checkboxesSchema, // 复选框组 Schema
  checkboxSchema, // 单个复选框 Schema
  colorSchema, // 颜色选择器 Schema
  dateRangeSchema, // 日期范围选择器 Schema
  dateSchema, // 日期选择器 Schema
  htmlSchema, // HTML 渲染 Schema
  imageSchema, // 图片 Schema
  inputSchema, // 文本输入框 Schema
  listSchema, // 列表 Schema
  multiSelectSchema, // 多选下拉框 Schema
  numberSchema, // 数字输入框 Schema
  passwordSchema, // 密码输入框 Schema
  radioSchema, // 单选框 Schema
  rateSchema, // 评分组件 Schema
  selectSchema, // 下拉选择器 Schema
  simpleListSchema, // 简单列表 Schema
  sliderSchema, // 滑块 Schema
  switchSchema, // 开关 Schema
  tableListSchema, // 表格列表 Schema
  textareaSchema, // 多行文本输入框 Schema
  timeRangeSchema, // 时间范围选择器 Schema
  timeSchema, // 时间选择器 Schema
  treeSelectSchema, // 树形选择器 Schema
  urlInputSchema, // URL 输入框 Schema
  voidTitleSchema, // 无标题 Schema
  widgetSchemas, // 聚合映射：widget 名 → 属性描述符（设计器默认属性面板）
} from './schema';

// ── Widget 组件导出 ─────────────────────────────────────────────────────────────
// 所有可用的表单组件，支持双向绑定、表单验证和自定义渲染
export { antdWidgets } from './widgets';
export type { WidgetProps } from './widgets/_shared';
export {
  FieldWrapper,
  mapOptions, // 将选项数据映射为 Select/Option 格式
  ReadOnlyDisplay, // 只读显示组件
  useFormItem, // 公共 Hook - 默认包裹 Form.Item（label=false 时不包裹）
  useFormItemProps, // 获取 Ant Design FormItem 属性 Hook
  withFormItem, // 公共包裹方法 - 为任意组件包装表单验证功能
} from './widgets/_shared';
export { autoCompleteWidget } from './widgets/autoComplete';
export { cascaderWidget } from './widgets/cascader';
export { checkboxWidget } from './widgets/checkbox';
export { checkboxesWidget } from './widgets/checkboxes';
export { colorWidget } from './widgets/color';
export { datePickerWidget } from './widgets/datePicker';
export { dateRangeWidget } from './widgets/dateRange';
export { fileWidget } from './widgets/file';
export { htmlWidget } from './widgets/html';
export { imageInputWidget } from './widgets/imageInput';
export { inputWidget } from './widgets/input';
export { inputNumberWidget } from './widgets/inputNumber';
export { listWidget } from './widgets/list';
export { mentionsWidget } from './widgets/mentions';
export { multiSelectWidget } from './widgets/multiSelect';
export { passwordWidget } from './widgets/password';
export type {
  AutoCompleteWidgetProps,
  CascaderWidgetProps,
  CheckboxesWidgetProps,
  CheckboxWidgetProps,
  ColorWidgetProps,
  DatePickerWidgetProps,
  DateRangeWidgetProps,
  FileWidgetProps,
  HtmlWidgetProps,
  ImageInputWidgetProps,
  InputNumberWidgetProps,
  InputWidgetProps,
  ListWidgetProps,
  MentionsWidgetProps,
  MultiSelectWidgetProps,
  PasswordWidgetProps,
  RadioWidgetProps,
  SegmentedWidgetProps,
  SelectWidgetProps,
  SimpleListWidgetProps,
  SliderWidgetProps,
  SwitchWidgetProps,
  TableListWidgetProps,
  TextAreaWidgetProps,
  TimePickerWidgetProps,
  TimeRangeWidgetProps,
  TransferWidgetProps,
  TreeSelectWidgetProps,
  UrlInputWidgetProps,
  VoidTitleWidgetProps,
} from './widgets/props';
export { radioWidget } from './widgets/radio';
export { rateWidget } from './widgets/rate';
export { segmentedWidget } from './widgets/segmented';
export { selectWidget } from './widgets/select';
export { simpleListWidget } from './widgets/simpleList';
export { sliderWidget } from './widgets/slider';
export { switchWidget } from './widgets/switch';
export { tableListWidget } from './widgets/tableList';
export { textAreaWidget } from './widgets/textArea';
export { timePickerWidget } from './widgets/timePicker';
export { timeRangeWidget } from './widgets/timeRange';
export { transferWidget } from './widgets/transfer';
export type { TreeSelectConfig } from './widgets/treeSelect';
export { treeSelectWidget } from './widgets/treeSelect';
export { urlInputWidget } from './widgets/urlInput';
export { voidTitleWidget } from './widgets/voidTitle';

/**
 * Ant Design UI 注册函数
 * 将所有 Ant Design UI 组件（widgets 和 layouts）注册到表单引擎中
 * @param engine - 表单引擎实例，用于注册组件
 * @description
 * 自动注册 antdWidgets、antdLayouts 及 FieldWrapper 到引擎中，
 * 使引擎可以使用这些组件构建表单。此函数会覆盖已注册的同名组件。
 * FieldWrapper 注册后，NexusForm 渲染层默认包裹所有 widget
 * （Form.Item 布局/校验展示），仅当 label === false 时不包裹。
 */
export function registerAntdUI(engine: NexusEngine): void {
  engine.registerFieldWrapper(FieldWrapper);
  engine.registerWidgets(antdWidgets);
  engine.registerLayouts(antdLayouts);
}

/**
 * Ant Design UI 预设插件
 * @description 导出一个完整的 Ant Design UI 插件对象，包含所有组件、布局和字段包裹组件
 * @example
 * ```typescript
 * const engine = new NexusEngine();
 * engine.use(antdPreset);
 * ```
 */
export const antdPreset: NexusPlugin = {
  name: 'antd-preset',
  fieldWrapper: FieldWrapper,
  widgets: antdWidgets,
  layouts: antdLayouts,
};
