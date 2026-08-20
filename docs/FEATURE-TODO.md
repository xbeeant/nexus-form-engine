# Nexus Form Engine 功能补全计划（2026-08）

> 目的：审视工程现状 → 与主流 Schema 表单引擎（formily / x-render / Ant Design ProForm / react-jsonschema-form）对比 → 按优先级补全符合本引擎定位的能力。
> 状态标记：⬜ 待办 / 🔄 进行中 / ✅ 完成

---

## P0 — Bug 修复

### ✅ T0-1 `passThrough` 布局识别缺失
- **现状**：`LayoutContainerType` 已声明 `passThrough`（types/schema.ts:27）、UI 已实现 `passThrough.tsx` 布局、文档已收录，但 `LAYOUT_CONTAINER_TYPES`（core/src/utils/schema-helper.ts:23）**漏掉** `passThrough` → Parser 无法识别为布局节点，Key 会错误进入数据路径。
- **修复**：schema-helper.ts 白名单补 `'passThrough'`，并补 Parser 测试断言（schema-parser.test.ts 18 用例）。

---

## P1 — 对齐主流引擎核心能力

### ✅ T1-1 字段级 `tooltip`（antd ProForm / Formily 对齐）
- Schema 字段新增 `tooltip`（静态字符串；表达式经 reactions `fulfill.state.tooltip` 动态联动，applyStatePatch 同时补上缺失的 `description` 处理）。
- 链路：`types/schema.ts` → `SchemaParser` 透传 meta（字段/对象容器/数组项 4 处）→ `NexusField` 剥离 → `FieldWrapper`/`useFormItem` → antd `Form.Item tooltip`。
- Designer：`basic-property.ts` 增加 tooltip 编辑项。

### ✅ T1-2 `onValuesChange` 回调（x-render / Formily 对齐）
- `NexusForm` 新增 `onValuesChange?: (changedValue, allValues, changedPath?) => void`。
- `FormController._syncConfig` 承载，经 `_onFieldValueChange` 分发（与 `watch: '#'` 同路径，按实例独立）。

### ✅ T1-3 提交 loading（`submitting`）状态（Formily 对齐）
- `FormController`：`getSubmitting()` + `onSubmittingChange(cb)`，submit() 生命周期置位（含异步 onFinish，try/finally）。
- React：`useFormSubmitting(form)` Hook（useSyncExternalStore）。
- `NexusForm` footer 提交按钮展示 loading/disabled。

### ✅ T1-4 数组操作 minItems/maxItems 约束（rjsf / Formily 对齐）
- `ArrayOperationsPlugin.applyWith`：`push`/`insert` 超过 `maxItems` 阻止；`pop`/`remove` 低于 `minItems` 阻止（读取 `meta.min/meta.max`）；`batch` 遇拦截中止并返回已生效结果。

### ✅ T1-5 `reloadRemoteData(path?)` 远程选项重载（x-render 对齐）
- Core：Engine 维护远程版本表 `getRemoteDataVersion(path)` / `reloadRemoteData(path?)`（定向重载严格递增，保证全局重载后的定向重载可感知；bump 字段版本触发组件重渲染）。
- React：`NexusField` 透传 `remoteVersion` prop。
- UI：`useRemoteOptions` 增加 reloadToken 参数（变化即清缓存重取）；select/multiSelect/autoComplete/cascader/mentions/treeSelect 接入。
- FormController：`reloadRemoteData(path?)` 聚合转发。

---

## P2 — 增强

### ✅ T2-1 `validateFirst` 校验短路（Formily 对齐）
- `Engine.validate(paths?, options?: { validateFirst?: boolean })`：首个字段校验失败即停止后续字段。
- `FormController.validateFields` / `submit(options)` 透传。

### ✅ T2-2 `omitNil` 提交过滤（ProForm 对齐）
- `NexusForm` prop `omitNil?: boolean` + `FormController.submit(options?)` / `getValues(paths?, options?)`：递归移除 `undefined/null/''` 值（`omitNilDeep`，数组逐项递归保留结构）。

### ✅ T2-3 Designer 补充 `passThrough` 布局项
- `designer/src/catalog.ts` layouts 增加 passThrough（透传容器）。

---

## P3 — 测试与文档

### ✅ T3-1 配套 Vitest 测试
- core：`engine-enhancements.test.ts`（12 用例：数组约束 5 / reloadRemoteData 2 / validateFirst 2 / tooltip 3）+ `schema-parser.test.ts` passThrough 用例。
- ui：`fieldWrapper.test.tsx` tooltip 渲染用例。
- react：`nexusForm.test.tsx` 新增 onValuesChange / reloadRemoteData / omitNil / submitting 4 用例。
- 顺带修复 examples 包预存在的 `maxLength` 类型错误（改 `max` + `props.maxLength`）。

### ✅ T3-2 文档同步
- README 特性清单 + FormController API 表格 + 布局白名单补充 passThrough。

---

## 对比依据（主流引擎能力矩阵）

| 能力 | formily | x-render | ProForm | rjsf | 本引擎现状 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 统一 Schema（数据+布局） | ✅ | ✅ | ✅ | ✅ | ✅ |
| 布局 Key 不进数据路径 | ✅ | ✅ | ✅ | — | ✅（含 passThrough） |
| 显式依赖图 O(k) 联动 | ✅ | — | — | — | ✅ |
| reactions 状态/Schema 补丁 | ✅ | ✅ | ✅ | — | ✅ |
| 表达式联动（{{ }}） | ✅ | ✅ | ✅ | — | ✅ |
| 字段级 tooltip | ✅ | — | ✅ | — | ✅ |
| onValuesChange | ✅ | ✅ | ✅ | ✅ | ✅ |
| 提交 loading 状态 | ✅ | — | ✅ | — | ✅ |
| 数组 min/max 操作约束 | ✅ | — | ✅ | ✅ | ✅ |
| 远程选项重载 | ✅ | ✅ | ✅ | — | ✅ |
| validateFirst | ✅ | — | — | — | ✅ |
| omitNil 提交过滤 | ✅ | — | ✅ | — | ✅ |
| 精准订阅（版本拆分） | ✅ | — | — | — | ✅ |
| 跨表单联动 | ✅ | — | — | — | ✅ |
| 设计器 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 执行顺序

T0-1 ✅ → T1-1 ✅ → T1-2 ✅ → T1-3 ✅ → T1-4 ✅ → T1-5 ✅ → T2-1 ✅ → T2-2 ✅ → T2-3 ✅ → T3-1 ✅ → T3-2 ✅