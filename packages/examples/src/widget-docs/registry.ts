// ============================================================================
// widget-docs — 组件文档注册表
// 每新增一个组件文档：创建 docs/<name>-doc.ts 并在下方导入、加入 widgetDocs
// ============================================================================

import { autoCompleteDoc } from './docs/autoComplete-doc';
import { autoCompleteRemoteDoc } from './docs/autoCompleteRemote-doc';
// ── 布局 ──────────────────────────────────────────────────────────────────
import { cardDoc } from './docs/card-doc';
// ── 复杂选择 ────────────────────────────────────────────────────────────────
import { cascaderDoc } from './docs/cascader-doc';
import { cascaderRemoteDoc } from './docs/cascaderRemote-doc';
import { checkboxDoc } from './docs/checkbox-doc';
import { checkboxesDoc } from './docs/checkboxes-doc';
import { collapseDoc } from './docs/collapse-doc';
import { colorDoc } from './docs/color-doc';
// ── 日期时间 ────────────────────────────────────────────────────────────────
import { dateDoc } from './docs/date-doc';
import { dateRangeDoc } from './docs/dateRange-doc';
import { dividerDoc } from './docs/divider-doc';
// ── 文件图片 ────────────────────────────────────────────────────────────────
import { fileDoc } from './docs/file-doc';
import { flexDoc } from './docs/flex-doc';
import { gridDoc } from './docs/grid-doc';
import { htmlDoc } from './docs/html-doc';
import { imageDoc } from './docs/image-doc';
// ── 基础输入 ────────────────────────────────────────────────────────────────
import { inputDoc } from './docs/input-doc';
// ── 列表 ──────────────────────────────────────────────────────────────────
import { listDoc } from './docs/list-doc';
import { mentionsDoc } from './docs/mentions-doc';
import { mentionsRemoteDoc } from './docs/mentionsRemote-doc';
import { multiSelectDoc } from './docs/multiSelect-doc';
import { multiSelectRemoteDoc } from './docs/multiSelectRemote-doc';
import { numberDoc } from './docs/number-doc';
import { passThroughDoc } from './docs/passThrough-doc';
import { passwordDoc } from './docs/password-doc';
import { radioDoc } from './docs/radio-doc';
import { rateDoc } from './docs/rate-doc';
import { reactionsDoc } from './docs/reactions-doc';
import { segmentedDoc } from './docs/segmented-doc';
// ── 选择类 ──────────────────────────────────────────────────────────────────
import { selectDoc } from './docs/select-doc';
import { selectRemoteDoc } from './docs/selectRemote-doc';
import { simpleListDoc } from './docs/simpleList-doc';
import { sliderDoc } from './docs/slider-doc';
import { spaceDoc } from './docs/space-doc';
import { stepsDoc } from './docs/steps-doc';
import { switchDoc } from './docs/switch-doc';
import { tableListDoc } from './docs/tableList-doc';
import { tabsDoc } from './docs/tabs-doc';
import { textareaDoc } from './docs/textarea-doc';
import { timeDoc } from './docs/time-doc';
import { timeRangeDoc } from './docs/timeRange-doc';
import { transferDoc } from './docs/transfer-doc';
import { treeSelectDoc } from './docs/treeSelect-doc';
import { urlInputDoc } from './docs/urlInput-doc';
import { voidTitleDoc } from './docs/voidTitle-doc';
import type { WidgetDoc } from './types';

export const widgetDocs: WidgetDoc[] = [
  inputDoc,
  textareaDoc,
  numberDoc,
  passwordDoc,
  urlInputDoc,
  htmlDoc,
  selectDoc,
  selectRemoteDoc,
  multiSelectDoc,
  multiSelectRemoteDoc,
  radioDoc,
  checkboxDoc,
  checkboxesDoc,
  switchDoc,
  sliderDoc,
  rateDoc,
  colorDoc,
  segmentedDoc,
  cascaderDoc,
  cascaderRemoteDoc,
  treeSelectDoc,
  transferDoc,
  mentionsDoc,
  mentionsRemoteDoc,
  autoCompleteDoc,
  autoCompleteRemoteDoc,
  dateDoc,
  dateRangeDoc,
  timeDoc,
  timeRangeDoc,
  fileDoc,
  imageDoc,
  voidTitleDoc,
  listDoc,
  simpleListDoc,
  tableListDoc,
  cardDoc,
  gridDoc,
  flexDoc,
  tabsDoc,
  stepsDoc,
  collapseDoc,
  spaceDoc,
  dividerDoc,
  passThroughDoc,
  reactionsDoc,
];
