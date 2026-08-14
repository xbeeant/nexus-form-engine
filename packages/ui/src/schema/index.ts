// ── Schema 定义导出文件 ─────────────────────────────────────────────────────────
// 此文件集中导出所有 Ant Design UI 组件的 Schema 定义
// Schema 用于定义组件的配置结构、数据验证规则和渲染行为
// 任何需要自定义或扩展组件行为的开发者都可以在此文件中修改或添加新的 Schema

import { cardSchema } from './card-schema.ts';
import { checkboxSchema } from './checkbox-schema.ts';
import { checkboxesSchema } from './checkboxes-schema.ts';
import { colorSchema } from './color-schema.ts';
import { dateSchema } from './date-schema.ts';
import { dateRangeSchema } from './dateRange-schema.ts';
import { htmlSchema } from './html-schema.ts';
import { imageSchema } from './image-schema.ts';
import { inputSchema } from './input-schema.ts';
import { listSchema } from './list-schema.ts';
import { multiSelectSchema } from './multiSelect-schema.ts';
import { numberSchema } from './number-schema.ts';
import { passwordSchema } from './password-schema.ts';
import { radioSchema } from './radio-schema.ts';
import { rateSchema } from './rate-schema.ts';
import { selectSchema } from './select-schema.ts';
import { simpleListSchema } from './simpleList-schema.ts';
import { sliderSchema } from './slider-schema.ts';
import { switchSchema } from './switch-schema.ts';
import { tableListSchema } from './tableList-schema.ts';
import { textareaSchema } from './textarea-schema.ts';
import { timeSchema } from './time-schema.ts';
import { timeRangeSchema } from './timeRange-schema.ts';
import { treeSelectSchema } from './treeSelect-schema.ts';
import { urlInputSchema } from './urlInput-schema.ts';
import { voidTitleSchema } from './voidTitle-schema.ts';

// ── 导出所有 Schema 定义 ─────────────────────────────────────────────────────────
export {
  cardSchema,
  checkboxesSchema,
  checkboxSchema,
  colorSchema,
  dateRangeSchema,
  dateSchema,
  htmlSchema,
  imageSchema,
  inputSchema,
  listSchema,
  multiSelectSchema,
  numberSchema,
  passwordSchema,
  radioSchema,
  rateSchema,
  selectSchema,
  simpleListSchema,
  sliderSchema,
  switchSchema,
  tableListSchema,
  textareaSchema,
  timeRangeSchema,
  timeSchema,
  treeSelectSchema,
  urlInputSchema,
  voidTitleSchema,
};

// ── 聚合映射 ────────────────────────────────────────────────────────────────────
// widget 名 → 属性描述符（descriptor）映射，供设计器属性面板直接使用。
// key 与 antdWidgets 注册的 widget 名对齐，textArea 为 textarea 的别名。
// 用户可整体替换，也可按 key 覆盖单个 widget 的描述符。
// 描述符是属性面板的字段定义（非完整 SchemaNode），故使用宽松类型。
export type PropertySchemaMap = Record<string, Record<string, any>>;

export const widgetSchemas: PropertySchemaMap = {
  input: inputSchema,
  password: passwordSchema,
  select: selectSchema,
  radio: radioSchema,
  checkbox: checkboxSchema,
  checkboxes: checkboxesSchema,
  switch: switchSchema,
  voidTitle: voidTitleSchema,
  number: numberSchema,
  multiSelect: multiSelectSchema,
  textarea: textareaSchema,
  textArea: textareaSchema,
  date: dateSchema,
  dateRange: dateRangeSchema,
  time: timeSchema,
  timeRange: timeRangeSchema,
  html: htmlSchema,
  slider: sliderSchema,
  image: imageSchema,
  color: colorSchema,
  urlInput: urlInputSchema,
  treeSelect: treeSelectSchema,
  list: listSchema,
  simpleList: simpleListSchema,
  tableList: tableListSchema,
  card: cardSchema,
};
