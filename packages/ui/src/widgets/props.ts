// ============================================================================
// @nexus/form-engine-ui — Widget Props 类型注册表
//
// 每个 widget 的 `props` 字段在此定义强类型接口，并通过 module augmentation
// 注入到 core 的 WidgetPropsMap 中，使得编写 Schema 时获得自动补全和类型检查。
//
// 使用示例:
//   const field: TypedFieldSchema<'input'> = {
//     widget: 'input',
//     type:  'string',
//     title: '用户名',
//     props: { maxLength: 20, showCount: true },  // ✅ InputWidgetProps 自动补全
//   };
// ============================================================================

// ── antd Input 相关 ─────────────────────────────────────────────────────────

/** Input / Input.Password / Input.TextArea widget 可透传给 antd 的 props */
export interface InputWidgetProps {
  maxLength?: number;
  showCount?: boolean;
  prefix?: string;
  suffix?: string;
  allowClear?: boolean;
  bordered?: boolean;
  addonBefore?: string;
  addonAfter?: string;
  onPressEnter?: () => void;
}

/** TextArea widget 可透传给 antd 的 props（在 Input 基础上增加） */
export interface TextAreaWidgetProps extends InputWidgetProps {
  rows?: number;
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

/** Password widget 的 props（与 Input 相同） */
export type PasswordWidgetProps = InputWidgetProps;

// ── antd InputNumber ────────────────────────────────────────────────────────

/** InputNumber widget 可透传给 antd 的 props */
export interface InputNumberWidgetProps {
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  formatter?: (value: number | string | undefined) => string;
  parser?: (value: string | undefined) => number | string;
  keyboard?: boolean;
  stringMode?: boolean;
  placeholder?: string;
  bordered?: boolean;
}

// ── antd Select / Radio / Checkbox ──────────────────────────────────────────

/** Select widget 可透传给 antd 的 props */
export interface SelectWidgetProps {
  mode?: 'multiple' | 'tags';
  showSearch?: boolean;
  allowClear?: boolean;
  maxTagCount?: number;
  bordered?: boolean;
  loading?: boolean;
  filterOption?:
    | boolean
    | ((input: string, option?: { label: string; value: unknown }) => boolean);
  dropdownMatchSelectWidth?: boolean | number;
  listHeight?: number;
  tokenSeparators?: string[];
  options?: Array<{ label: string; value: unknown } | string | number>;
}

/** Radio widget 可透传给 antd Radio.Group 的 props */
export interface RadioWidgetProps {
  optionType?: 'default' | 'button';
  buttonStyle?: 'outline' | 'solid';
  options?: Array<{ label: string; value: unknown } | string | number>;
}

/** Checkbox 单个 widget 可透传给 antd Checkbox 的 props */
export interface CheckboxWidgetProps {
  indeterminate?: boolean;
}

/** Checkboxes 多选组 widget 可透传给 antd Checkbox.Group 的 props */
export interface CheckboxesWidgetProps {
  options?: Array<{ label: string; value: unknown } | string | number>;
}

/** MultiSelect 与 Select 相同 */
export type MultiSelectWidgetProps = SelectWidgetProps;

// ── antd Switch ─────────────────────────────────────────────────────────────

/** Switch widget 可透传给 antd Switch 的 props */
export interface SwitchWidgetProps {
  checkedChildren?: string;
  unCheckedChildren?: string;
  loading?: boolean;
}

// ── antd DatePicker / TimePicker ────────────────────────────────────────────

/** DatePicker widget 可透传给 antd DatePicker 的 props */
export interface DatePickerWidgetProps {
  format?: string;
  showTime?: boolean | Record<string, unknown>;
  picker?: 'date' | 'week' | 'month' | 'quarter' | 'year';
  placeholder?: string;
  disabledDate?: (current: unknown) => boolean;
}

/** DateRange widget 可透传给 antd DatePicker.RangePicker 的 props */
export interface DateRangeWidgetProps {
  format?: string;
  showTime?: boolean | Record<string, unknown>;
  placeholder?: [string, string];
}

/** TimePicker widget 可透传给 antd TimePicker 的 props */
export interface TimePickerWidgetProps {
  format?: string;
  placeholder?: string;
  hourStep?: number;
  minuteStep?: number;
  secondStep?: number;
}

/** TimeRange widget 可透传给 antd TimePicker.RangePicker 的 props */
export interface TimeRangeWidgetProps {
  format?: string;
  placeholder?: [string, string];
}

// ── antd Slider ─────────────────────────────────────────────────────────────

/** Slider widget 可透传给 antd Slider 的 props */
export interface SliderWidgetProps {
  min?: number;
  max?: number;
  step?: number;
  range?: boolean;
  marks?: Record<number, string>;
  dots?: boolean;
  vertical?: boolean;
  tooltipVisible?: boolean;
  included?: boolean;
  reverse?: boolean;
}

// ── antd Rate ───────────────────────────────────────────────────────────────

/** Rate widget 可透传给 antd Rate 的 props */
export interface RateWidgetProps {
  count?: number;
  allowHalf?: boolean;
  character?: string;
  tooltips?: string[];
}

// ── TreeSelect ──────────────────────────────────────────────────────────────

/** TreeSelect widget 专属配置（非 antd 原始 props，而是本 UI 层扩展） */
export interface TreeSelectWidgetProps {
  request?: (params?: Record<string, unknown>) => Promise<unknown>;
  url?: string;
  params?: Record<string, unknown>;
  treeData?: Array<{
    value: string | number;
    title: string;
    key?: string | number;
    children?: Array<{
      value: string | number;
      title: string;
      key?: string | number;
      children?: unknown[];
    }>;
  }>;
  searchUrl?: string;
  searchKey?: string;
  parentKey?: string;
  pidKey?: string;
  dataPath?: string;
  valueKey?: string;
  labelKey?: string;
  childrenKey?: string;
  hasChildrenKey?: string;
  isLeafKey?: string;
  multiple?: boolean;
  showSearch?: boolean;
  autoExpand?: boolean;
  asyncLoad?: boolean;
  readOnlyRequest?: (
    value: unknown,
  ) => Promise<{ label?: string; [key: string]: unknown } | null>;
  readOnlyUrl?: string;
  method?: 'GET' | 'POST';
  allowClear?: boolean;
}

// ── Color / ImageInput / Upload ─────────────────────────────────────────────

/** Color picker widget props */
export interface ColorWidgetProps {
  format?: 'hex' | 'rgb' | 'hsb';
  allowClear?: boolean;
}

/** Image input widget props */
export interface ImageInputWidgetProps {
  action?: string;
  accept?: string;
  maxCount?: number;
  listType?: 'picture-card' | 'picture' | 'text';
}

/** URL input widget props */
export interface UrlInputWidgetProps {
  maxLength?: number;
  allowClear?: boolean;
  bordered?: boolean;
  placeholder?: string;
}

// ── HTML / VoidTitle ────────────────────────────────────────────────────────

/** HTML 渲染 widget props */
export interface HtmlWidgetProps {
  /** HTML 内容字符串 */
  html?: string;
}

/** VoidTitle widget props */
export interface VoidTitleWidgetProps {
  /** 标题文本 */
  text?: string;
  /** 标题级别 */
  level?: 1 | 2 | 3 | 4 | 5;
}

// ── List / SimpleList / TableList ──────────────────────────────────────────

/** List widget props */
export interface ListWidgetProps {
  /** 单条记录的默认模板 */
  template?: Record<string, unknown>;
}

/** SimpleList widget props */
export type SimpleListWidgetProps = ListWidgetProps;

/** TableList widget props */
export type TableListWidgetProps = ListWidgetProps;

// ============================================================================
// Module Augmentation: 将接口注入 core 的 WidgetPropsMap
// （declare module 自动与 core 的 WidgetPropsMap 合并，无需显式 import 目标类型）
// ============================================================================

declare module '@nexus/form-engine' {
  interface WidgetPropsMap {
    /** Input 输入框 */
    input: InputWidgetProps;
    /** Password 密码输入框 */
    password: PasswordWidgetProps;
    /** TextArea 文本域（注意：注册键名为 textarea，全小写） */
    textarea: TextAreaWidgetProps;
    textArea: TextAreaWidgetProps;
    /** InputNumber 数字输入框 */
    number: InputNumberWidgetProps;
    /** Select 下拉选择 */
    select: SelectWidgetProps;
    /** Radio 单选框组 */
    radio: RadioWidgetProps;
    /** Checkbox 单个复选框 */
    checkbox: CheckboxWidgetProps;
    /** Checkboxes 多选框组 */
    checkboxes: CheckboxesWidgetProps;
    /** Switch 开关 */
    switch: SwitchWidgetProps;
    /** DatePicker 日期选择（注意：注册键名为 date） */
    date: DatePickerWidgetProps;
    /** DateRange 日期范围选择 */
    dateRange: DateRangeWidgetProps;
    /** TimePicker 时间选择（注意：注册键名为 time） */
    time: TimePickerWidgetProps;
    /** TimeRange 时间范围选择 */
    timeRange: TimeRangeWidgetProps;
    /** Slider 滑动输入条 */
    slider: SliderWidgetProps;
    /** Color 颜色选择器 */
    color: ColorWidgetProps;
    /** Image 图片上传 */
    image: ImageInputWidgetProps;
    /** URL 输入框（注意：注册键名为 urlInput） */
    urlInput: UrlInputWidgetProps;
    /** HTML 渲染 */
    html: HtmlWidgetProps;
    /** VoidTitle 标题 */
    voidTitle: VoidTitleWidgetProps;
    /** MultiSelect 多选 */
    multiSelect: MultiSelectWidgetProps;
    /** List 数组列表 */
    list: ListWidgetProps;
    /** SimpleList 简单列表 */
    simpleList: SimpleListWidgetProps;
    /** TableList 表格列表 */
    tableList: TableListWidgetProps;
  }
}
