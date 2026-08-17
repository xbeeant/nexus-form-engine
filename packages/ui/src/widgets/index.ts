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
  useFormItem, // 公共 Hook - 默认包裹 Form.Item（label=false 时不包裹）
  useFormItemProps, // Hook - 获取 Ant Design FormItem 所需的属性
  withFormItem, // 公共包裹方法 - 为任意组件包装表单验证功能
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

import { type WidgetProps, withFormItem } from './_shared';
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
// 约束：所有内置 widget 均为裸组件（({}) => {}），在此处统一应用公共的
// withFormItem 包裹（label=false 时自动不包裹 Form.Item）；
// 以下组件自管理 Form.Item / 自带标题展示，跳过默认包裹：
//   - voidTitle：自身渲染 title/description，无需 Form.Item
//   - treeSelect：内部通过 useFormItem 自管理 Form.Item（含加载/只读分支）

const SKIP_DEFAULT_FORM_ITEM = new Set(['voidTitle', 'treeSelect']);

function applyDefaultFormItem(
  name: string,
  widget: (props: WidgetProps) => ReactNode,
): (props: WidgetProps) => ReactNode {
  return SKIP_DEFAULT_FORM_ITEM.has(name) ? widget : withFormItem(widget);
}

export const antdWidgets: Record<string, (props: WidgetProps) => ReactNode> = {
  input: applyDefaultFormItem('input', inputWidget),
  password: applyDefaultFormItem('password', passwordWidget),
  select: applyDefaultFormItem('select', selectWidget),
  selectWithRemote: applyDefaultFormItem(
    'selectWithRemote',
    selectWidgetWithRemote,
  ),
  radio: applyDefaultFormItem('radio', radioWidget),
  rate: applyDefaultFormItem('rate', rateWidget),
  checkbox: applyDefaultFormItem('checkbox', checkboxWidget),
  switch: applyDefaultFormItem('switch', switchWidget),
  voidTitle: applyDefaultFormItem('voidTitle', voidTitleWidget), // 无标题空白组件
  number: applyDefaultFormItem('number', inputNumberWidget), // 数字输入框
  multiSelect: applyDefaultFormItem('multiSelect', multiSelectWidget), // 多选下拉框
  multiSelectWithRemote: applyDefaultFormItem(
    'multiSelectWithRemote',
    multiSelectWidgetWithRemote,
  ), // 多选下拉框（远程数据）
  checkboxes: applyDefaultFormItem('checkboxes', checkboxesWidget), // 复选框组
  textarea: applyDefaultFormItem('textarea', textAreaWidget), // 多行文本输入框
  textArea: applyDefaultFormItem('textArea', textAreaWidget), // 多行文本输入框
  date: applyDefaultFormItem('date', datePickerWidget), // 日期选择器
  dateRange: applyDefaultFormItem('dateRange', dateRangeWidget), // 日期范围选择器
  time: applyDefaultFormItem('time', timePickerWidget), // 时间选择器
  timeRange: applyDefaultFormItem('timeRange', timeRangeWidget), // 时间范围选择器
  html: applyDefaultFormItem('html', htmlWidget), // HTML 内容渲染
  slider: applyDefaultFormItem('slider', sliderWidget), // 滑块选择器
  image: applyDefaultFormItem('image', imageInputWidget), // 图片上传组件
  color: applyDefaultFormItem('color', colorWidget), // 颜色选择器
  urlInput: applyDefaultFormItem('urlInput', urlInputWidget), // URL 输入框
  treeSelect: applyDefaultFormItem('treeSelect', treeSelectWidget), // 树形选择器
  autoComplete: applyDefaultFormItem('autoComplete', autoCompleteWidget), // 自动完成
  autoCompleteWithRemote: applyDefaultFormItem(
    'autoCompleteWithRemote',
    autoCompleteWidgetWithRemote,
  ), // 自动完成（远程数据）
  cascader: applyDefaultFormItem('cascader', cascaderWidget), // 级联选择
  cascaderWithRemote: applyDefaultFormItem(
    'cascaderWithRemote',
    cascaderWidgetWithRemote,
  ), // 级联选择（远程数据）
  mentions: applyDefaultFormItem('mentions', mentionsWidget), // 提及
  mentionsWithRemote: applyDefaultFormItem(
    'mentionsWithRemote',
    mentionsWidgetWithRemote,
  ), // 提及（远程数据）
  segmented: applyDefaultFormItem('segmented', segmentedWidget), // 分段控制器
  transfer: applyDefaultFormItem('transfer', transferWidget), // 穿梭框
  file: applyDefaultFormItem('file', fileWidget), // 通用文件上传
  list: applyDefaultFormItem('list', listWidget),
  simpleList: applyDefaultFormItem('simpleList', simpleListWidget),
  tableList: applyDefaultFormItem('tableList', tableListWidget),
};
