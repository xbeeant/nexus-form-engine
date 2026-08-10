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
// 卡片组件 Schema - 用于包裹和分组表单字段
export { cardSchema };

// 复选框相关 Schema
export { checkboxSchema };       // 单个复选框
export { checkboxesSchema };     // 复选框组（支持多选）

// 颜色选择器 Schema
export { colorSchema };

// 日期相关 Schema
export { dateSchema };            // 单个日期选择
export { dateRangeSchema };       // 日期范围选择

// HTML 内容 Schema - 用于渲染自定义 HTML 内容
export { htmlSchema };

// 图片 Schema - 用于图片上传或展示
export { imageSchema };

// 输入框相关 Schema
export { inputSchema };           // 普通文本输入框
export { numberSchema };          // 数字输入框
export { passwordSchema };        // 密码输入框
export { textareaSchema };        // 多行文本输入框
export { urlInputSchema };        // URL 输入框

// 下拉选择相关 Schema
export { selectSchema };          // 单选下拉框
export { multiSelectSchema };     // 多选下拉框
export { radioSchema };           // 单选框
export { treeSelectSchema };      // 树形选择器

// 列表相关 Schema
export { listSchema };            // 列表（支持 x-render）
export { simpleListSchema };      // 简单列表
export { tableListSchema };       // 表格列表

// 评分 Schema - 星级评分组件
export { rateSchema };

// 滑块 Schema - 滑动选择器
export { sliderSchema };

// 开关 Schema - 切换开关
export { switchSchema };

// 时间相关 Schema
export { timeSchema };            // 单个时间选择
export { timeRangeSchema };       // 时间范围选择

// 无标题 Schema - 用于无标题的空白区域
export { voidTitleSchema };
