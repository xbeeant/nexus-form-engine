// ============================================================================
// widget-docs — 组件文档注册表
// 每新增一个组件文档：创建 docs/<name>-doc.ts 并在下方导入、加入 widgetDocs
// ============================================================================

import type { WidgetDoc } from './types';

// ── 基础输入 ────────────────────────────────────────────────────────────────
import { inputDoc } from './docs/input-doc';
import { textareaDoc } from './docs/textarea-doc';
import { numberDoc } from './docs/number-doc';
import { passwordDoc } from './docs/password-doc';
import { urlInputDoc } from './docs/urlInput-doc';
import { htmlDoc } from './docs/html-doc';

// ── 选择类 ──────────────────────────────────────────────────────────────────
import { selectDoc } from './docs/select-doc';
import { multiSelectDoc } from './docs/multiSelect-doc';
import { radioDoc } from './docs/radio-doc';
import { checkboxDoc } from './docs/checkbox-doc';
import { checkboxesDoc } from './docs/checkboxes-doc';
import { switchDoc } from './docs/switch-doc';
import { sliderDoc } from './docs/slider-doc';
import { rateDoc } from './docs/rate-doc';
import { colorDoc } from './docs/color-doc';
import { segmentedDoc } from './docs/segmented-doc';

// ── 复杂选择 ────────────────────────────────────────────────────────────────
import { cascaderDoc } from './docs/cascader-doc';
import { treeSelectDoc } from './docs/treeSelect-doc';
import { transferDoc } from './docs/transfer-doc';
import { mentionsDoc } from './docs/mentions-doc';
import { autoCompleteDoc } from './docs/autoComplete-doc';

// ── 日期时间 ────────────────────────────────────────────────────────────────
import { dateDoc } from './docs/date-doc';
import { dateRangeDoc } from './docs/dateRange-doc';
import { timeDoc } from './docs/time-doc';
import { timeRangeDoc } from './docs/timeRange-doc';

// ── 文件图片 ────────────────────────────────────────────────────────────────
import { fileDoc } from './docs/file-doc';
import { imageDoc } from './docs/image-doc';
import { voidTitleDoc } from './docs/voidTitle-doc';

// ── 列表 ──────────────────────────────────────────────────────────────────
import { listDoc } from './docs/list-doc';
import { simpleListDoc } from './docs/simpleList-doc';
import { tableListDoc } from './docs/tableList-doc';

// ── 布局 ──────────────────────────────────────────────────────────────────
import { cardDoc } from './docs/card-doc';
import { gridDoc } from './docs/grid-doc';
import { flexDoc } from './docs/flex-doc';
import { tabsDoc } from './docs/tabs-doc';
import { stepsDoc } from './docs/steps-doc';
import { collapseDoc } from './docs/collapse-doc';
import { spaceDoc } from './docs/space-doc';
import { dividerDoc } from './docs/divider-doc';
import { passThroughDoc } from './docs/passThrough-doc';

export const widgetDocs: WidgetDoc[] = [
  inputDoc,
  textareaDoc,
  numberDoc,
  passwordDoc,
  urlInputDoc,
  htmlDoc,
  selectDoc,
  multiSelectDoc,
  radioDoc,
  checkboxDoc,
  checkboxesDoc,
  switchDoc,
  sliderDoc,
  rateDoc,
  colorDoc,
  segmentedDoc,
  cascaderDoc,
  treeSelectDoc,
  transferDoc,
  mentionsDoc,
  autoCompleteDoc,
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
];
