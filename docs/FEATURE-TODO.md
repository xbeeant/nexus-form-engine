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

### ✅ T1-6 条件分支容器 oneOf / anyOf（x-render `oneOf` / formily 子表单对齐）
- **设计决策**：分支容器 Key 不进入 formData 数据路径（布局透明，对齐 AGENTS.MD 红线），仅活动分支字段收集数据。
- **Parser**：`processBranchNode` 预解析全部分支字段（`visible=["branchOf" 标记]`），渲染树分出 `RenderBranchNode.branches: RenderTreeNode[][]`（各分支独立分组）。支持 `oneOf` / `anyOf` / `branches` 三种键形态；`fieldBranches`（字段→所属分支集合）从渲染分组静态构建，跨分支同名键精确归并。
- **Engine**：`_oneOfBranch` reaction 边（容器依赖选择字段）→ `syncBranchFromSource` 依据 `conditions` 重算激活分支（anyOf）或沿用 `activeIndex`（oneOf）；`syncBranchFields` 翻转成员可见性、清除离开分支字段的值、保留共享字段值、标记 formData 失效 + bumpStore（不重建渲染树）。
- **公开 API**：`setOneOfActiveIndex(path, index)` / `getOneOfActiveIndex(path)`。
- **React**：`NexusBranch` 组件（`engine.subscribeField(dataPath)` + `getFieldVersion` 精准订阅），按 `meta.oneOf.activeIndex` 渲染 `node.branches[activeIndex]`，容器 disabled/readOnly/hidden 经 FieldInheritContext 下发。
- **schema-lifecycle**：`collectFieldPaths` / `getSchemaFieldPaths` / `getInitialValues` 支持分支容器（各分支字段在父路径收集）。
- **测试**：`core/tests/oneof-branch.test.ts`（11 用例：解析/布局透明/anyOf 自动切换/oneOf 手动切换/共享键保留/独占值清除/嵌套布局分支）。

### ✅ T1-7 时间/日期字符串传输格式 `dateString` / `timeString`（x-render 对齐）
- **现状**：`date`/`time`/`dateRange`/`timeRange` 单控件已存字符串，但 `dateRangeWidget` 用 `[dayjs, dayjs]` 传输（JSON.stringify 退化为 UTC ISO 字符串，破坏 format 语义），字段值在「字符串 / dayjs」双形态间摇摆。
- **规范**：日期与时间控件统一「字符串传输格式」——单控件 `dateString`/`timeString`（按 `format` 格式化），范围控件 `[string, string]`。引擎 formData 永不出现 dayjs 对象（JSON 安全），控件内部回显时经 `toDayjs` 解析。
- **UI**：`dateRangeWidget` 改为字符串数组写回（`onChange?.(['2024-01-01', '2024-03-15'])`）；`antdWidgets` 注册 `dateString` / `timeString` / `dateRangeString` / `timeRangeString` 四个别名（与 `date`/`time`/`dateRange`/`timeRange` 同实现）。
- **测试**：`ui/tests/widgets.test.tsx` 新增用例（回显字符串、范围字符串数组、readOnly `~` 连接、别名注册）。

### ✅ T1-8 附带编辑器 / 点击动作 `sideEffects`（x-render `onClickAction` 对齐）
- **协议**：字段声明 `sideEffects`（字符串 = `{ editor }` 简写，或对象 `{ editor?, title?, mode?, props? }`）→ 字段旁渲染「编辑」入口按钮 → 点击弹出 Modal/Drawer 内嵌编辑器组件编辑字段值，保存写回字符串。编辑器是接收 `value/onChange` 的一等组件，注册于引擎 `editors` 注册表。
- **Core**：`types/schema.ts` 新增 `SideEffectsConfig` + `BaseSchemaNode.sideEffects` + `FieldState.meta.sideEffects` + `NexusPlugin.editors` + `FormEngine.registerEditors/getEditor`；`engine.ts` 维护 `editorRegistry`，`use()` 注册 `plugin.editors`，`destroy()` 清空；`schema-parser.ts` 透传 `sideEffects` 进 meta（独立槽位，不进字段 props）。
- **React**：`NexusField` 透传 `sideEffects/value/onChange/dataPath` 给 `FieldWrapper` → `FieldWrapper` 非布局字段额外渲染 `SideEffectsEditor`。
- **UI**：`side-effects-editor.tsx`（触发按钮 + Modal/Drawer，编辑器查找 `engine.getEditor(name)` 回退内置 textarea）；`registerAntdUI` 内置注册 `textarea` 编辑器。
- **Designer**：`property/basic-property.ts` 加入 `sideEffects` 配置项（`sideEffects` widget：editor/title/mode 下拉）。
- **测试**：`core/tests/side-effects.test.ts`（6 用例：解析/透传/独立槽位/registerEditors/plugin.editors/destroy）+ `ui/tests/widgets.test.tsx`（4 用例：渲染入口/编辑写回/取消不写/drawer 模式）。

---

## P2 — 增强

### ✅ T2-1 `validateFirst` 校验短路（Formily 对齐）
- `Engine.validate(paths?, options?: { validateFirst?: boolean })`：首个字段校验失败即停止后续字段。
- `FormController.validateFields` / `submit(options)` 透传。

### ✅ T2-2 `omitNil` 提交过滤（ProForm 对齐）
- `NexusForm` prop `omitNil?: boolean` + `FormController.submit(options?)` / `getValues(paths?, options?)`：递归移除 `undefined/null/''` 值（`omitNilDeep`，数组逐项递归保留结构）。

### ✅ T2-3 Designer 补充 `passThrough` 布局项
- `designer/src/catalog.ts` layouts 增加 passThrough（透传容器）。

### ✅ T2-4 函数式 reactions `run`（formily `x-reactions` as function 对齐）
- `Reaction` 新增可选 `run?: (ctx: ReactionFnContext) => void`——命令式函数替代声明式 `fulfill/otherwise`，作为声明式模型的逃逸舱（复杂计算、跨字段联动、依赖分支）。
- `ReactionFnContext`：`state / deps / formData / getValue / setValue / setState / form`；`setValue`/`setState` 复用引擎公开方法（含实时重校验 + 沿依赖图传播）。
- `dependencies` 仍显式声明（参与依赖图构建与重跑触发）；run 存在时优先于声明式补丁执行。
- **测试**：`core/tests/function-reaction.test.ts`（5 用例：依赖触发 / 上下文完整 / 链式传播 sum→double / 仅声明依赖触发 / run 与声明式共存优先）。

### ✅ T2-5 `display` 三态模型（visible / display:none / hidden，formily 对齐）
- `FieldState.display: 'visible' | 'none' | 'hidden'`（默认 'visible'）：
  - `'none'`：不渲染（无占位符，`NexusField` 直接返回 null），但**仍参与数据收集与提交**（值保留，`visible=true`）
  - `'hidden'`：不渲染且**不参与数据收集**（等同 `hidden:true`，`visible=false`，值进 hidden）
- `BaseSchemaNode.display`（可声明为静态或 `{{ }}` 表达式经 `_autoExpr` reaction 动态联动）+ `ReactionStatePatch.display` + `FieldStatePatch.display`（`setFieldState` 支持）。
- Parser 5 处 FieldState 构造统一 `resolveDisplay(node)` + `display` 缺省；engine `applyStatePatch`/`setFieldState` 处理 display（'hidden' → visible=false，'none'/'visible' → visible=true）。
- React `NexusField`：`display==='none'` 直接返回 null（不占位）、值照常收集。
- **测试**：`core/tests/display-model.test.ts`（7 用例：默认/None 语义/Hidden 语义/表达式联动/声明式 reaction/setFieldState patch/hidden 等价）+ `react/tests/nexus-form.test.tsx`（render 行为：none 无节点、值保留）。

### ✅ T2-6 依赖驱动的动态 enum（ProForm / x-render 对齐）
- **协议**：`DataFieldSchema.enum` / `enumNames` 支持声明为 `{{ }}` 表达式（`EnumFieldSchema`），经依赖图按 `$deps` / `formData` 动态重算选项——如 `enum: "{{ $deps[0] === 'CN' ? ['北京','上海'] : ['New York','LA'] }}"`。
- **Parser**：`collectExpressionReactions` 新增 `REACTION_OPTION_FIELDS`（`enum` / `enumNames`），表达式自动转 `_autoExpr` reaction（与 hidden/display 等状态表达式同机制）。
- **Core**：`ReactionStatePatch` 新增 `enum`/`enumNames` 键，`applyStatePatch` 求值后写入 `meta.enum`/`meta.enumNames`（渲染层据此重建下拉选项）；字段值不变、数据收集语义不破坏。
- **UI**：`nexus-field` options useMemo 依赖 `meta.enum`，反应更新即重渲染选项。
- **测试**：`core/tests/dynamic-enum.test.ts`（6 用例：表达式求值/enum+Names 联动/formData 引用/静态数组不受影响/值保留/声明式 reaction）+ `ui/tests/widgets.test.tsx`（渲染层切换）。

### ✅ T2-7 字段级 `onChange`/`onBlur`/`onFocus` schema 钩子（formily / rjsf 对齐）
- **协议**：`DataFieldSchema.hooks`（`onChange` / `onBlur` / `onFocus` 一等函数），在对应事件触发时调用（值变化 commit 后、失焦、聚焦）。
- **Core**：`FieldHooks` + `FieldHookContext`（dataPath/value/oldValue/formData/getValue/setValue/setState/form）+ `FieldState.meta.hooks` 透传（data field / array item 两处）；`index.ts` 导出。
- **React**：`useFieldHookRunner` 构建执行上下文（复用 FormController 公开 API）；`handleChange` 捕获旧值后 setFieldValue 再触发 onChange 钩子；`handleBlur` 校验后触发 onBlur；`onFocusCapture` 冒泡触发 onFocus。setValue 一律走引擎（含实时重校验 + 联动传播），可与 reactions 组合产生联动副作用。
- **测试**：`react/tests/nexus-form.test.tsx`（onChange 新旧值/onBlur/onFocus 触发 + 钩子内 setValue 联动副作用）。

### ✅ T2-8 数组折叠/卡片 + 拖拽排序（formily ArrayField 对齐）
- **list widget 升级**：卡片式数组项改用 antd `Collapse` 折叠面板渲染（`collapsible` 默认开启，`collapsible: false` 回退原卡片式）：
  - 每项默认展开，可手动折叠/隐藏字段（紧凑布局）；`activeKeys` 受控状态，数组增删/重置后新增项自动补入展开态、越界索引自动移除。
- **拖拽排序**（`props.dragSort: true` opt-in）：HTML5 原生 DnD——卡片标题左侧 `⇅` 手柄 draggable，拖动悬停高亮目标卡片、`drop` 时经 `arrayMove` 换序；与上移/下移按钮并存（无障碍回退），readOnly/disabled 时禁用。
- **测试**：`ui/tests/widgets.test.tsx`（Collapse 卡片字段渲染+数据回显 / dragSort 手柄渲染）。

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

T0-1 ✅ → T1-1 ✅ → T1-2 ✅ → T1-3 ✅ → T1-4 ✅ → T1-5 ✅ → T1-6 ✅ → T1-7 ✅ → T1-8 ✅ → T2-1 ✅ → T2-2 ✅ → T2-3 ✅ → T2-4 ✅ → T2-5 ✅ → T2-6 ✅ → T2-7 ✅ → T2-8 ✅ → T3-1 ✅ → T3-2 ✅