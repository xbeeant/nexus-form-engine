// ── Schema 定义导出文件 ─────────────────────────────────────────────────────────
// 此文件集中导出所有 Ant Design UI 组件的 Schema 定义
// Schema 用于定义组件的配置结构、数据验证规则和渲染行为
// 任何需要自定义或扩展组件行为的开发者都可以在此文件中修改或添加新的 Schema

import {
  autoCompleteRemoteSchema,
  autoCompleteSchema,
} from './autoComplete-schema';
import { cardSchema } from './card-schema';
import { cascaderRemoteSchema, cascaderSchema } from './cascader-schema';
import { checkboxSchema } from './checkbox-schema';
import { checkboxesSchema } from './checkboxes-schema';
import { colorSchema } from './color-schema';
import { dateSchema } from './date-schema';
import { dateRangeSchema } from './dateRange-schema';
import { fileSchema } from './file-schema';
import { htmlSchema } from './html-schema';
import { imageSchema } from './image-schema';
import { inputSchema } from './input-schema';
import { listSchema } from './list-schema';
import { mentionsRemoteSchema, mentionsSchema } from './mentions-schema';
import {
  multiSelectRemoteSchema,
  multiSelectSchema,
} from './multiSelect-schema';
import { numberSchema } from './number-schema';
import { passwordSchema } from './password-schema';
import { radioSchema } from './radio-schema';
import { rateSchema } from './rate-schema';
import { segmentedSchema } from './segmented-schema';
import { selectRemoteSchema, selectSchema } from './select-schema';
import { simpleListSchema } from './simpleList-schema';
import { sliderSchema } from './slider-schema';
import { spaceSchema } from './space-schema';
import { switchSchema } from './switch-schema';
import { tableListSchema } from './tableList-schema';
import { textareaSchema } from './textarea-schema';
import { timeSchema } from './time-schema';
import { timeRangeSchema } from './timeRange-schema';
import { transferSchema } from './transfer-schema';
import { treeSelectSchema } from './treeSelect-schema';
import { urlInputSchema } from './urlInput-schema';
import { voidTitleSchema } from './voidTitle-schema';

// ── 导出所有 Schema 定义 ─────────────────────────────────────────────────────────
export {
  autoCompleteRemoteSchema,
  autoCompleteSchema,
  cardSchema,
  cascaderRemoteSchema,
  cascaderSchema,
  checkboxesSchema,
  checkboxSchema,
  colorSchema,
  dateRangeSchema,
  dateSchema,
  fileSchema,
  htmlSchema,
  imageSchema,
  inputSchema,
  listSchema,
  mentionsRemoteSchema,
  mentionsSchema,
  multiSelectRemoteSchema,
  multiSelectSchema,
  numberSchema,
  passwordSchema,
  radioSchema,
  rateSchema,
  segmentedSchema,
  selectRemoteSchema,
  selectSchema,
  simpleListSchema,
  sliderSchema,
  spaceSchema,
  switchSchema,
  tableListSchema,
  textareaSchema,
  timeRangeSchema,
  timeSchema,
  transferSchema,
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
  selectWithRemote: selectRemoteSchema,
  radio: radioSchema,
  rate: rateSchema,
  checkbox: checkboxSchema,
  checkboxes: checkboxesSchema,
  switch: switchSchema,
  voidTitle: voidTitleSchema,
  number: numberSchema,
  multiSelect: multiSelectSchema,
  multiSelectWithRemote: multiSelectRemoteSchema,
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
  autoComplete: autoCompleteSchema,
  autoCompleteWithRemote: autoCompleteRemoteSchema,
  cascader: cascaderSchema,
  cascaderWithRemote: cascaderRemoteSchema,
  mentions: mentionsSchema,
  mentionsWithRemote: mentionsRemoteSchema,
  segmented: segmentedSchema,
  transfer: transferSchema,
  file: fileSchema,
  list: listSchema,
  simpleList: simpleListSchema,
  tableList: tableListSchema,
  card: cardSchema,
  space: spaceSchema,
};
