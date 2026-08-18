// ── Widget 组件导出文件 ─────────────────────────────────────────────────────────
// 此文件集中导出所有 Ant Design UI 表单组件（Widget）
// Widget 是表单引擎中的核心组件，负责表单字段的渲染、交互和数据绑定

// ── 类型导出 ─────────────────────────────────────────────────────────────────────
// WidgetProps 是所有 Widget 组件的通用属性类型
import type { ReactNode } from 'react';

export type { WidgetProps } from './_shared';

// ── 工具函数和组件导出 ─────────────────────────────────────────────────────────
export {
  FieldWrapper, // 字段包裹组件 - NexusForm 渲染层默认包裹所有 widget（label=false 时不包裹）
  mapOptions, // 将选项数据转换为 Select/Option 格式
  ReadOnlyDisplay, // 只读显示组件 - 用于展示非编辑状态的数据
  useFormItem, // 公共 Hook - 默认包裹 Form.Item（label=false 时不包裹）
  useFormItemProps, // Hook - 获取 Ant Design FormItem 所需的属性
  withFormItem, // 公共包裹方法 - 仅需在 NexusForm 之外渲染时使用
} from './_shared';
// ── 导出所有 Widget 组件 ───────────────────────────────────────────────────────
// 核心输入组件
export {
  autoCompleteWidget,
  autoCompleteWidgetWithRemote,
} from './autoComplete'; // 自动完成
export { cascaderWidget, cascaderWidgetWithRemote } from './cascader'; // 级联选择
export { checkboxWidget } from './checkbox'; // 单个复选框
export { checkboxesWidget } from './checkboxes'; // 复选框组
export { colorWidget } from './color'; // 颜色选择器
export { datePickerWidget } from './datePicker'; // 日期选择器
export { dateRangeWidget } from './dateRange'; // 日期范围选择器
// 图片和 HTML 组件
export { fileWidget } from './file'; // 通用文件上传
export { htmlWidget } from './html'; // HTML 内容渲染
export { imageInputWidget } from './imageInput'; // 图片上传组件
export { inputWidget } from './input'; // 文本输入框
export { inputNumberWidget } from './inputNumber'; // 数字输入框
// 列表组件（x-render 兼容）
export { listWidget } from './list'; // 列表渲染器
// 复杂选择组件
export { mentionsWidget, mentionsWidgetWithRemote } from './mentions'; // 提及
export { multiSelectWidget, multiSelectWidgetWithRemote } from './multiSelect'; // 多选下拉框
export { passwordWidget } from './password'; // 密码输入框
export { radioWidget } from './radio'; // 单选框
export { rateWidget } from './rate'; // 评分
export { segmentedWidget } from './segmented'; // 分段控制器
export { selectWidget, selectWidgetWithRemote } from './select'; // 下拉选择器
export { simpleListWidget } from './simpleList'; // 简单列表渲染器
export { sliderWidget } from './slider'; // 滑块选择器
export { switchWidget } from './switch'; // 开关
export { tableListWidget } from './tableList'; // 表格列表渲染器
export { textAreaWidget } from './textArea'; // 多行文本输入框
export { timePickerWidget } from './timePicker'; // 时间选择器
export { timeRangeWidget } from './timeRange'; // 时间范围选择器
export { transferWidget } from './transfer'; // 穿梭框
export { treeSelectWidget } from './treeSelect'; // 树形选择器
export { urlInputWidget } from './urlInput'; // URL 输入框
export { voidTitleWidget } from './voidTitle'; // 无标题空白组件

import type { WidgetProps } from './_shared';
import {
  autoCompleteWidget,
  autoCompleteWidgetWithRemote,
} from './autoComplete';
import { cascaderWidget, cascaderWidgetWithRemote } from './cascader';
import { checkboxWidget } from './checkbox';
import { checkboxesWidget } from './checkboxes';
import { colorWidget } from './color';
import { datePickerWidget } from './datePicker';
import { dateRangeWidget } from './dateRange';
import { fileWidget } from './file';
import { htmlWidget } from './html';
import { imageInputWidget } from './imageInput';
import { inputWidget } from './input';
import { inputNumberWidget } from './inputNumber';
import { listWidget } from './list';
import { mentionsWidget, mentionsWidgetWithRemote } from './mentions';
import { multiSelectWidget, multiSelectWidgetWithRemote } from './multiSelect';
import { passwordWidget } from './password';
import { radioWidget } from './radio';
import { rateWidget } from './rate';
import { segmentedWidget } from './segmented';
import { selectWidget, selectWidgetWithRemote } from './select';
import { simpleListWidget } from './simpleList';
import { sliderWidget } from './slider';
import { switchWidget } from './switch';
import { tableListWidget } from './tableList';
import { textAreaWidget } from './textArea';
import { timePickerWidget } from './timePicker';
import { timeRangeWidget } from './timeRange';
import { transferWidget } from './transfer';
import { treeSelectWidget } from './treeSelect';
import { urlInputWidget } from './urlInput';
import { voidTitleWidget } from './voidTitle';

// ── Ant Design Widget 映射表 ───────────────────────────────────────────────────
// antdWidgets 对象将布局名称映射到对应的 Widget 组件实现
// 引擎通过此映射表找到对应的组件来渲染表单字段
//
// 约束：所有内置 widget 均为裸组件（({}) => {}），不做任何包裹；
// Form.Item 包裹（label/错误/必填/布局）由 NexusForm 渲染层默认完成——
// 通过 engine.registerFieldWrapper(FieldWrapper) 注册后，
// NexusField 统一包裹所有 widget，仅当 label === false 时不包裹。

export const antdWidgets: Record<string, (props: WidgetProps) => ReactNode> = {
  input: inputWidget,
  password: passwordWidget,
  select: selectWidget,
  selectWithRemote: selectWidgetWithRemote,
  radio: radioWidget,
  rate: rateWidget,
  checkbox: checkboxWidget,
  switch: switchWidget,
  voidTitle: voidTitleWidget, // 标题占位（配合 label:false 使用）
  number: inputNumberWidget, // 数字输入框
  multiSelect: multiSelectWidget, // 多选下拉框
  multiSelectWithRemote: multiSelectWidgetWithRemote, // 多选下拉框（远程数据）
  checkboxes: checkboxesWidget, // 复选框组
  textarea: textAreaWidget, // 多行文本输入框
  textArea: textAreaWidget, // 多行文本输入框
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
  autoComplete: autoCompleteWidget, // 自动完成
  autoCompleteWithRemote: autoCompleteWidgetWithRemote, // 自动完成（远程数据）
  cascader: cascaderWidget, // 级联选择
  cascaderWithRemote: cascaderWidgetWithRemote, // 级联选择（远程数据）
  mentions: mentionsWidget, // 提及
  mentionsWithRemote: mentionsWidgetWithRemote, // 提及（远程数据）
  segmented: segmentedWidget, // 分段控制器
  transfer: transferWidget, // 穿梭框
  file: fileWidget, // 通用文件上传
  list: listWidget,
  simpleList: simpleListWidget,
  tableList: tableListWidget,
};
