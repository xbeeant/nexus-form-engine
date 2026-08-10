// ── Widget 组件导出文件 ─────────────────────────────────────────────────────────
// 此文件集中导出所有 Ant Design UI 表单组件（Widget）
// Widget 是表单引擎中的核心组件，负责表单字段的渲染、交互和数据绑定

// ── 类型导出 ─────────────────────────────────────────────────────────────────────
// WidgetProps 是所有 Widget 组件的通用属性类型
import type { ReactNode } from 'react';

export type { WidgetProps } from './_shared';

// ── 工具函数和组件导出 ─────────────────────────────────────────────────────────
export {
  mapOptions, // 将选项数据转换为 Select/Option 格式
  ReadOnlyDisplay, // 只读显示组件 - 用于展示非编辑状态的数据
  useFormItemProps, // Hook - 获取 Ant Design FormItem 所需的属性
  withFormItem, // 高阶组件 - 为任意组件包装表单验证功能
} from './_shared';
// ── 导出所有 Widget 组件 ───────────────────────────────────────────────────────
// 核心输入组件
export { checkboxWidget } from './checkbox'; // 单个复选框
export { checkboxesWidget } from './checkboxes'; // 复选框组
export { colorWidget } from './color'; // 颜色选择器
export { datePickerWidget } from './datePicker'; // 日期选择器
export { dateRangeWidget } from './dateRange'; // 日期范围选择器
// 图片和 HTML 组件
export { htmlWidget } from './html'; // HTML 内容渲染
export { imageInputWidget } from './imageInput'; // 图片上传组件
export { inputWidget } from './input'; // 文本输入框
export { inputNumberWidget } from './inputNumber'; // 数字输入框
// 列表组件（x-render 兼容）
export { listWidget } from './list'; // 列表渲染器
// 复杂选择组件
export { multiSelectWidget } from './multiSelect'; // 多选下拉框
export { passwordWidget } from './password'; // 密码输入框
export { radioWidget } from './radio'; // 单选框
export { selectWidget } from './select'; // 下拉选择器
export { simpleListWidget } from './simpleList'; // 简单列表渲染器
export { sliderWidget } from './slider'; // 滑块选择器
export { switchWidget } from './switch'; // 开关
export { tableListWidget } from './tableList'; // 表格列表渲染器
export { textAreaWidget } from './textArea'; // 多行文本输入框
export { timePickerWidget } from './timePicker'; // 时间选择器
export { timeRangeWidget } from './timeRange'; // 时间范围选择器
export { treeSelectWidget } from './treeSelect'; // 树形选择器
export { urlInputWidget } from './urlInput'; // URL 输入框
export { voidTitleWidget } from './voidTitle'; // 无标题空白组件

import type { WidgetProps } from './_shared';
import { checkboxWidget } from './checkbox';
import { checkboxesWidget } from './checkboxes';
import { colorWidget } from './color';
import { datePickerWidget } from './datePicker';
import { dateRangeWidget } from './dateRange';
import { htmlWidget } from './html';
import { imageInputWidget } from './imageInput';
import { inputWidget } from './input';
import { inputNumberWidget } from './inputNumber';
import { listWidget } from './list';
import { multiSelectWidget } from './multiSelect';
import { passwordWidget } from './password';
import { radioWidget } from './radio';
import { selectWidget } from './select';
import { simpleListWidget } from './simpleList';
import { sliderWidget } from './slider';
import { switchWidget } from './switch';
import { tableListWidget } from './tableList';
import { textAreaWidget } from './textArea';
import { timePickerWidget } from './timePicker';
import { timeRangeWidget } from './timeRange';
import { treeSelectWidget } from './treeSelect';
import { urlInputWidget } from './urlInput';
import { voidTitleWidget } from './voidTitle';

// ── Ant Design Widget 映射表 ───────────────────────────────────────────────────
// antdWidgets 对象将布局名称映射到对应的 Widget 组件实现
// 引擎通过此映射表找到对应的组件来渲染表单字段

// 核心 Widget（旧名 + 新名兼容）
export const antdWidgets: Record<string, (props: WidgetProps) => ReactNode> = {
  // 核心 Widget（保留旧名称，支持向后兼容）
  input: inputWidget,
  password: passwordWidget,
  select: selectWidget,
  radio: radioWidget,
  checkbox: checkboxWidget,
  switch: switchWidget,

  // 新增 Widget（推荐使用的新名称）
  voidTitle: voidTitleWidget, // 无标题空白组件
  number: inputNumberWidget, // 数字输入框
  multiSelect: multiSelectWidget, // 多选下拉框
  checkboxes: checkboxesWidget, // 复选框组
  textarea: textAreaWidget, // 多行文本输入框
  date: datePickerWidget, // 日期选择器
  dateRange: dateRangeWidget, // 日期范围选择器
  time: timePickerWidget, // 时间选择器
  timeRange: timeRangeWidget, // 时间范围选择器
  html: htmlWidget, // HTML 内容渲染
  slider: sliderWidget, // 滑块选择器
  image: imageInputWidget, // 图片上传组件
  color: colorWidget, // 颜色选择器
  urlInput: urlInputWidget, // URL 输入框
  treeSelect: treeSelectWidget, // 树形选择器

  // 列表 Widget（用于 x-render 列表渲染）
  list: listWidget,
  simpleList: simpleListWidget,
  tableList: tableListWidget,
};
