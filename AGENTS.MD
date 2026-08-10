# AGENTS.md: @nexus/form-engine 工程约束规范

## 1. 核心架构原则 (Core Philosophy)

- **Monorepo 分层**: 本项目为 Lerna + Bun workspaces monorepo，共 5 个包：`packages/core`（纯逻辑）、`packages/react`（React 渲染适配）、`packages/ui`（内置控件/布局库）、`packages/designer`（Schema 可视化设计器）、`packages/examples`（示例应用）。
- **UI 无关性 (UI Agnostic)**: `packages/core`（`@nexus/form-engine`）**严禁**包含任何 DOM、React、Vue 或 CSS 相关代码。Core 层必须是纯 TypeScript，可在 Node.js/Browser/Worker 中运行。
- **协议融合 (Unified Schema)**: 数据定义与布局定义**必须**在同一份 JSON Schema 中，**严禁**要求用户维护两份 Schema。
- **布局透明 (Layout Transparency)**: 布局节点（Card/Tabs/Grid 等）的 Key **严禁**进入 `formData` 数据路径。调整布局结构**严禁**导致数据 Key 变化或联动规则失效。
- **显式依赖 (Explicit Dependencies)**: **严禁**使用 Proxy/MobX 进行隐式依赖收集。**必须**使用 `DependencyGraph` 显式构建依赖边，保证 O(k) 的联动更新复杂度。
- **插件化扩展 (Plugin-based)**: 数组操作、异步校验**严禁**硬编码进 Core 主类，**必须**通过 `engine.use(plugin)` 注入（见 §3.3）。

---

## 2. Schema 协议规范 (Protocol Specification)

### 2.1 节点类型判定（判定顺序不可颠倒）

AI 解析 Schema 时，**必须**遵循以下判定顺序（`packages/core/src/utils/schema-helper.ts` 中 `isDataArray` → `isDataField` → `isDataObject` → `isLayoutNode`）：

| 判定 | 节点特征 | 类型 | 数据路径影响 | 示例 |
| :--- | :--- | :--- | :--- | :--- |
| ⚡ 1st | `type: "array"` 且有 `items` | **数据数组** | ✅ Key 进入路径 | `{ "type": "array", "widget": "list", "items": {...} }` |
| 2nd | 有 `widget` 且无 `properties`/`items`，或 `type` 为基础类型 | **数据字段** | ✅ Key 进入路径 | `{ "type": "string", "widget": "input" }` |
| 3rd | `type: "object"` 无 `widget` 且有 `properties` | **数据对象** | ✅ Key 进入路径 | `{ "type": "object", "properties": {...} }` |
| 4th | 非数据节点且有 `properties` | **布局容器/面板** | ❌ Key **不**进入路径 | `{ "type": "card", "properties": {...} }` |

> ⚠️ **`isDataArray` 必须先于 `isDataField` 判断**：`{ type: "array", widget: "list", items: {...} }` 同时满足两者，必须优先识别为 DataArray（`SchemaParser.ts:179`）。
> **布局容器白名单** (`LAYOUT_CONTAINER_TYPES`): `card`, `tabs`, `grid`, `flex`, `steps`, `collapse`, `divider`, `void`
> **布局面板白名单** (`LAYOUT_PANE_TYPES`): `tabPane`, `step`, `collapsePanel`
> 面板类型优雅降级：未注册的面板直接在父容器内平铺渲染。

### 2.2 路径计算规则 (`SchemaParser.walkProperties`)

1. 遇到 **数据节点**：`currentPath = parentPath ? \`${parentPath}.${key}\` : key`
2. 遇到 **布局节点**：`currentPath = parentPath`（⚠️ **Key 被丢弃，直接透传父路径**，`SchemaParser.ts:625`）
3. **数组项子字段**：如 `items[0].name` 也会进入 `fieldStates`（带 `meta.itemOf` 标记），用于校验/订阅/状态访问，但**不参与 `getFormData` 收集**——数组整体由数组字段序列化。数组值变更时 `Engine.syncArrayItemStates` 会重建这些项子字段。

### 2.3 数据绑定协议 (Bind)

字段值可与数据路径解耦（`Engine.setFieldValues`/`getFormData` 双向转换）：

- `bind: "user.name"` — 字段值映射写入 `user.name`
- `bind: ["a.b", "c.d"]` — 数组值 `[v1, v2]` 按顺序拆分映射
- `bind: false` — 纯 UI 字段，不参与数据收集

### 2.4 联动协议 (Reactions)

- **简单联动**: `required/disabled/readOnly/hidden` 支持 `"{{ formData.x === 'y' }}"` 字符串，Parser 通过 `collectExpressionReactions` **自动转换为 `_autoExpr` reaction**（静态布尔值不处理）。
- **复杂联动**: 结构化 `reactions` 数组：
  - `dependencies: string[]` — **允许相对路径**，`resolveReactionScopes` 从目标字段最内层作用域向上逐级解析（如 `address.city` 内 `dependencies: ["province"]` → `"address.province"`）；`_autoExpr` 的依赖均为根级绝对路径，不做作用域解析
  - `when: Expression` — 条件成立执行 `fulfill`，否则执行 `otherwise`
  - `fulfill` / `otherwise`：`{ state?: ReactionStatePatch, schema?: ReactionSchemaPatch }`
    - `state` 补丁：`visible/hidden/disabled/readOnly/required/loading/title/description/props.*`
    - `schema` 补丁：点路径 → 值/表达式（`props.options` 等支持多级），**仅运行时覆盖，不持久化回 Schema**
- **上下文变量白名单**: 仅 `$deps`、`$self`、`$form`、`$index`、`formData`、`rootValue`（`ExpressionSandbox`）。
- **validate 表达式依赖**: `validate: { key: "{{ ... }}" }` 生成的规则携带 `_validateExpr`，其 `formData.xxx` 依赖被提取进依赖图，依赖字段变化时**实时重校验**目标字段（`validateExprFields`）。

---

## 3. Core 层实现约束 (Core Implementation)

### 3.1 依赖图 (DependencyGraph, `core/src/DependencyGraph.ts`)

- 依赖边在 `SchemaParser.buildDependencyGraph` 中**静态构建**（reactions 边 + validate 表达式 `formData.xxx` 边），**严禁运行时动态扫描**。
- `addDependencies(target, sources)`、`getDependents(path)`、`getDependencies(path)`、`hasNode`。
- `Engine.runReactionsForSource` 通过 `getDependents(sourcePath)` 做 O(k) 查询，复用单份 `formData` 快照，**严禁对每个 dependent 重复构建 formData**。
- **严禁在 `setFieldValue` 中进行全量 Diff 或全量 `validate()`**。

### 3.2 状态管理 (FieldState)

- 每个字段维护独立状态：`{ path, value, initialValue, visible, disabled, readOnly, required, loading, errors, props, reactions, meta }`（`meta` 含 `title/widget/type/rules/bind/items/itemOf/enum/...`）。
- 通过 `engine.setFieldState(path, patch)` 局部更新（仅合并传入属性），`patch.required` 会同步动态必填规则（`syncRequiredRule`）。

### 3.3 插件系统 (Plugins, `core/src/async-validator.ts` + `array-list.ts`)

- **严禁**在 Core 主类中硬编码数组变换 / 异步校验调度逻辑。
- `ArrayOperationsPlugin`（`array-list.ts`）通过 `onArrayOperation` 钩子承载 `engine.arrayOperation`（push/pop/remove/update/insert/move），不可变方式计算并 `setFieldValue` 写回；无插件注册时 `engine.arrayOperation` 返回 `undefined` 并告警。
- `AsyncValidatorPlugin`（`async-validator.ts`）通过 `onValidateField` 钩子承载防抖(300ms)/超时(5s)/并行异步校验调度；**Core 只做同步校验**（required、内置 min/max/pattern 规则、validate 表达式、同步外部校验器）。
- 插件可通过 `plugin.validators / widgets / layouts` 注册能力，Hook 包括 `onInit / onBeforeFieldValueChange / onFieldValueChange / onValidateField / onArrayOperation / onBeforeValidate / onValidate / onSubmit`。

### 3.4 订阅系统（性能红线）

- `engine.subscribe(path, cb)`：按路径订阅（回调携带最新 `FieldState`）。
- `engine.subscribeField(path, cb)` + `getFieldVersion(path)`：**按路径精准版本订阅**，供 `useSyncExternalStore` 使用——字段状态每次变更版本 +1，**严禁让所有字段共享同一次全局重渲染**。
- `engine.subscribeAll(cb)` / `subscribeStore(onStoreChange)` + `getSnapshot()`：全局订阅（仅用于 `useFormData` / RenderTree 消费）。
- **严禁**使用 `watch(formData)` 之类隐式全量监听做联动。

---

## 4. React Renderer 层约束 (packages/react)

### 4.1 组件注册

- `packages/core` 与 `packages/react` **严禁内置任何 UI 控件实现**（连 `<input>` 都不允许）；`registerWidgets/registerLayouts` 注册的是 UI 无关的 `NexusComponent`（`(props) => any` 签名）。
- 内置控件/布局库集中放在 **`packages/ui`**（`@nexus/form-engine-ui`）：widgets（input/select/number/checkbox/radio/switch/slider/date/time/treeSelect/color/list/simpleList/tableList 等）+ layouts（card/tabs/grid/flex/steps/collapse/divider/passThrough），由上层通过 `engine.registerWidgets()` / `registerLayouts()` 注入。
- Schema 未指定 `widget` 时，Parser 按 `type/format` 推断（`SchemaParser.inferWidgetFromSchema`，自动对齐 x-render）。

### 4.2 渲染逻辑

- 入口文件：`packages/react/src/react/NexusField.tsx`（含 `NexusForm/NexusField/NexusLayout/NexusObject/FormController/useForm` + Hooks）、`packages/react/src/react/useWatch.ts`（`useWatch/useWatchState/useWatchMultiple/useWatchAll`）。
- **必须**使用 `useSyncExternalStore` + `engine.subscribeField(path)` + `getFieldVersion(path)` 按路径精准订阅单字段（`useFieldValue` / `useFieldState`）。
- **严禁**在 Renderer 层解析 Schema 或计算路径，**必须**直接消费 Core 输出的 `RenderTree`（`engine.getRenderTree()`，配合全局 version 快照）。
- **隐藏字段处理**: `visible: false` 时渲染 `display: none` 占位符（`data-nexus-hidden`）**严禁**从 DOM 移除（防止栅格塌陷）；仅当布局节点配置 `removeHidden: true`（经 `LayoutConfigContext` 透传）才完全移除。
- `FormController` 是 API 层（`useForm()` 创建）：`submit/resetFields/setValues/setValueByPath/getValues/getAllValues/getHiddenValues/validateFields/registerValidator/setSchema/setSchemaByPath/scrollToPath/getFieldError/...`；`submit` 失败自动滚动聚焦第一个错误字段。
- 表单布局配置（`displayType/labelWidth/colon/column/readOnly` 等）优先级：组件 props > Schema 顶层 > 默认值。

---

## 5. Designer 层 (packages/designer)

- 供 Schema 可视化编辑：`Palette`（组件面板）/ `Canvas` / `PropertyPanel` / `widgets/*`（BindEditor、DependenciesEditor、ValidateEditor、EnumEditor 等）。
- UI 包的 `packages/ui/src/schema/*-schema.ts` 提供各 widget 的 Schema 默认配置与元数据（供 catalog 使用）。
- **修改设计器时严禁改动 Core 协议**；设计器只负责生成符合 §2 的 Schema，必须通过 `schemaUtils` 生成合法结构（布局 key 不进路径）。

---

## 6. 测试与命令 (Testing & Commands)

- Core 单元测试：`packages/core/tests/*.test.ts`（Vitest）。新增核心逻辑（Parser 路径计算 / 依赖图 / reactions / 校验 / 数组操作）**必须**配套测试。
- 各包脚本：
  - 测试：`lerna run test`（core 内为 `vitest run`）
  - Lint：`bunx --bun @biomejs/biome lint .`（包内 `biome check .`）
  - 格式化：`bunx --bun @biomejs/biome format --write .`
  - 构建：`lerna run build`

---

## 7. 目录结构约束（真实布局）

```
nexus-form-engine/
├── packages/
│   ├── core/                 # 🚫 严禁 UI 代码（@nexus/form-engine）
│   │   ├── src/
│   │   │   ├── Engine.ts             # 引擎主类（状态/联动/校验/订阅/插件分发）
│   │   │   ├── SchemaParser.ts       # 分离 DataFields + RenderTree + 依赖图
│   │   │   ├── DependencyGraph.ts    # 显式依赖图（静态构建）
│   │   │   ├── ExpressionSandbox.ts  # 表达式安全求值沙箱
│   │   │   ├── async-validator.ts    # 异步校验器插件（防抖/超时/并行）
│   │   │   ├── array-list.ts         # 数组操作插件
│   │   │   ├── types/schema.ts       # 📜 全部协议类型定义
│   │   │   └── utils/                # schema-helper / data-converters / schema-serializer
│   │   └── tests/                    # Vitest 单元测试
│   ├── react/                # 🎨 React 适配（@nexus/form-engine-react）
│   │   └── src/react/        # NexusField.tsx（含 NexusForm/NexusLayout/useForm 等）+ useWatch.ts
│   ├── ui/                   # 🧩 内置控件/布局库（@nexus/form-engine-ui）
│   │   └── src/              # widgets/ + layouts/ + schema/
│   ├── designer/             # 🛠️ Schema 可视化设计器（@nexus/form-engine-designer）
│   └── examples/             # 示例应用
├── lerna.json / biome.json / bun.lock
```

---

## 8. 代码生成与审查清单 (Checklist)

AI 在生成或修改代码前，**必须**自检：

- [ ] **Core 纯净性**: 这个文件是否 import 了 `react`/`vue`/`dom`/`css`？如果是，**立即停止**，移至 packages/react / ui。
- [ ] **路径安全性**: 这个 Schema 变更是否改变了 `formData` 的 Key 结构？布局节点（card/tabs/grid...）的 Key 必须被丢弃；数组项子字段必须带 `itemOf` 且不参与收集；`bind` 转换方向（`setValues`/`getValues` 用转换后格式）是否正确？
- [ ] **判定顺序**: 新增节点类型判断时，`isDataArray` 是否先于 `isDataField`？
- [ ] **性能安全**: 这个更新是否触发了 `engine.validate()` 全量校验、全量 Diff 或隐式依赖收集？如果是，**必须**改为 `setFieldValue` 增量路径 + 依赖图 O(k) 通知。
- [ ] **类型安全**: `NexusSchema` 的联合类型是否支持 `reactions`/`widget`/`bind` 的推断？新 widget 的 props 是否通过 `WidgetPropsMap` module augmentation 注册？
- [ ] **向后兼容**: Schema 是否包含 `displayType`/`colSpan`/`column`/`width`/`enum`/`enumNames`/`validate` 等 x-render 字段？必须在 Parser 层做兼容映射。
- [ ] **测试覆盖**: 核心逻辑变更是否在 `packages/core/tests/` 补充了 Vitest 用例？
- [ ] **插件边界**: 有没有把数组变换或异步校验调度写进 Core 主类？应注入 `ArrayOperationsPlugin` / `AsyncValidatorPlugin`。

---

## 9. 常见错误模式 (Anti-Patterns)

- ❌ **错误**: 在 `card.properties` 下定义字段，导致 `formData.card.fieldName`。
    - ✅ **正确**: Parser 识别 `card` 为布局节点，路径计算透传父路径，结果为 `formData.fieldName`。
- ❌ **错误**: 在 React 组件内用 `useMemo` 重新解析 Schema / 计算路径。
    - ✅ **正确**: Schema 解析仅在 `engine.init()` / `setSchema()` / `setSchemaByPath()` 时执行一次，React 只订阅 `RenderTree` 与字段版本。
- ❌ **错误**: 使用 `useWatch(engine, '#')` 或 subscribeAll 实现字段联动。
    - ✅ **正确**: Parser 已把表达式转成 `_autoExpr` reaction 进依赖图；组件内用 `engine.subscribeField('fieldA', ...)` 精准订阅。
- ❌ **错误**: 在 Core 里手写 `push/pop/splice` 或在 `Engine.validate` 里调度 setTimeout 异步校验。
    - ✅ **正确**: 先 `engine.use(new ArrayOperationsPlugin(engine))` / `engine.use(new AsyncValidatorPlugin(engine, options))`，再调用 `engine.arrayOperation(...)` / `registerValidator(path, fn)`。
- ❌ **错误**: 为了 UI 效果（如栅格对齐、隐藏空态）修改数据 Schema 结构或布局节点 Key。
    - ✅ **正确**: 布局问题用布局节点 + `removeHidden` / `colSpan` / `width` 解决；隐藏字段渲染 `display:none` 占位符。

---

> **Agent 指令**: 当用户要求修改表单逻辑时，优先检查 `packages/core/src/SchemaParser.ts` 的路径计算、`Engine.ts` 的 reactions 执行与订阅通知；当用户要求修改 UI 时，优先检查 `packages/react/src/react/NexusField.tsx` 的隐藏占位策略与 `packages/ui/src/widgets|layouts/`。**永远不要为了 UI 效果而修改数据 Schema 结构。**