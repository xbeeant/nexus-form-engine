// ── UI 包入口文件 ─────────────────────────────────────────────────────────────
// 此文件是 @nexus/ui 包的主入口，统一导出所有布局、组件和 Schema 定义
// 用于快速集成 Ant Design UI 组件到表单引擎中

import {
  AsyncValidatorPlugin,
  type NexusEngine,
  type NexusPlugin,
} from '@nexus/form-engine';
import { antdLayouts } from './layouts';
import { antdWidgets } from './widgets';

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
} from './schema';

// ── Widget 组件导出 ─────────────────────────────────────────────────────────────
// 所有可用的表单组件，支持双向绑定、表单验证和自定义渲染
export { antdWidgets } from './widgets';
export type { WidgetProps } from './widgets/_shared';
export {
  mapOptions, // 将选项数据映射为 Select/Option 格式
  ReadOnlyDisplay, // 只读显示组件
  useFormItemProps, // 获取 Ant Design FormItem 属性 Hook
  withFormItem, // 包装组件以支持表单验证
} from './widgets/_shared';
export { checkboxWidget } from './widgets/checkbox';
export { checkboxesWidget } from './widgets/checkboxes';
export { colorWidget } from './widgets/color';
export { datePickerWidget } from './widgets/datePicker';
export { dateRangeWidget } from './widgets/dateRange';
export { htmlWidget } from './widgets/html';
export { imageInputWidget } from './widgets/imageInput';
export { inputWidget } from './widgets/input';
export { inputNumberWidget } from './widgets/inputNumber';
export { listWidget } from './widgets/list';
export { multiSelectWidget } from './widgets/multiSelect';
export { passwordWidget } from './widgets/password';
export type {
  CheckboxesWidgetProps,
  CheckboxWidgetProps,
  ColorWidgetProps,
  DatePickerWidgetProps,
  DateRangeWidgetProps,
  HtmlWidgetProps,
  ImageInputWidgetProps,
  InputNumberWidgetProps,
  InputWidgetProps,
  ListWidgetProps,
  MultiSelectWidgetProps,
  PasswordWidgetProps,
  RadioWidgetProps,
  SelectWidgetProps,
  SimpleListWidgetProps,
  SliderWidgetProps,
  SwitchWidgetProps,
  TableListWidgetProps,
  TextAreaWidgetProps,
  TimePickerWidgetProps,
  TimeRangeWidgetProps,
  TreeSelectWidgetProps,
  UrlInputWidgetProps,
  VoidTitleWidgetProps,
} from './widgets/props';
export { radioWidget } from './widgets/radio';
export { selectWidget } from './widgets/select';
export { simpleListWidget } from './widgets/simpleList';
export { sliderWidget } from './widgets/slider';
export { switchWidget } from './widgets/switch';
export { tableListWidget } from './widgets/tableList';
export { textAreaWidget } from './widgets/textArea';
export { timePickerWidget } from './widgets/timePicker';
export { timeRangeWidget } from './widgets/timeRange';
export type { TreeSelectConfig } from './widgets/treeSelect';
export { treeSelectWidget } from './widgets/treeSelect';
export { urlInputWidget } from './widgets/urlInput';
export { voidTitleWidget } from './widgets/voidTitle';

/**
 * Ant Design UI 注册函数
 * 将所有 Ant Design UI 组件（widgets 和 layouts）注册到表单引擎中
 * @param engine - 表单引擎实例，用于注册组件
 * @description
 * 自动注册所有 antdWidgets 和 antdLayouts 到引擎中，
 * 使引擎可以使用这些组件构建表单。此函数会覆盖已注册的同名组件。
 */
export function registerAntdUI(engine: NexusEngine): void {
  engine.use(new AsyncValidatorPlugin(engine));
  engine.registerWidgets(antdWidgets);
  engine.registerLayouts(antdLayouts);
}

/**
 * Ant Design UI 预设插件
 * @description 导出一个完整的 Ant Design UI 插件对象，包含所有组件和布局
 * @example
 * ```typescript
 * const engine = new NexusEngine();
 * engine.use(antdPreset);
 * ```
 */
export const antdPreset: NexusPlugin = {
  name: 'antd-preset',
  widgets: antdWidgets,
  layouts: antdLayouts,
};
