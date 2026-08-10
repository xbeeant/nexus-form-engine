
# AGENTS.md: @nexus/form-engine 工程约束规范

## 1. 核心架构原则 (Core Philosophy)

- **UI 无关性 (UI Agnostic)**: `@nexus/form-engine/core` **严禁**包含任何 DOM、React、Vue 或 CSS 相关代码。Core 层必须是纯 TypeScript，可在 Node.js/Browser/Worker 中运行。
- **协议融合 (Unified Schema)**: 数据定义与布局定义**必须**在同一份 JSON Schema 中，**严禁**要求用户维护两份 Schema。
- **布局透明 (Layout Transparency)**: 布局节点（Card/Tabs/Grid）的 Key **严禁**进入 `formData` 数据路径。调整布局结构**严禁**导致数据 Key 变化或联动规则失效。
- **显式依赖 (Explicit Dependencies)**: **严禁**使用 Proxy/MobX 进行隐式依赖收集。**必须**使用 `DependencyGraph` 进行显式边构建，确保 O(k) 的更新复杂度。

---

## 2. Schema 协议规范 (Protocol Specification)

### 2.1 节点类型判定

AI 在解析 Schema 时，**必须**遵循以下判定逻辑：

| 节点特征 | 类型 | 数据路径影响 | 示例 |
| :--- | :--- | :--- | :--- |
| 包含 `widget` 字段 | **数据字段** | ✅ Key 进入路径 | `{ "type": "string", "widget": "input" }` |
| `type: "object"` 且无 `widget` | **数据对象** | ✅ Key 进入路径 | `{ "type": "object", "properties": {...} }` |
| `type: "array"` | **数据数组** | ✅ Key 进入路径 | `{ "type": "array", "items": {...} }` |
| `type` 为布局类型且无 `widget` | **布局容器** | ❌ Key **不**进入路径 | `{ "type": "card", "properties": {...} }` |
| `type` 为面板类型 | **布局面板** | ❌ Key **不**进入路径 | `{ "type": "tabPane", "properties": {...} }` |

> **布局类型白名单**: `card`, `tabs`, `grid`, `flex`, `steps`, `collapse`, `divider`, `void`
> **面板类型白名单**: `tabPane`, `step`, `collapsePanel`

### 2.2 路径计算规则

在构建 `dataFields` Map 时：

1. 遇到 **数据节点**：`currentPath = parentPath ? \`${parentPath}.${key}\` : key`
2. 遇到 **布局节点**：`currentPath = parentPath` (⚠️ **Key 被丢弃，直接透传父路径**)

### 2.3 联动协议 (Reactions)

- **简单联动**: 保留 `hidden: "{{ formData.x === 'y' }}"` 语法，兼容 x-render。
- **复杂联动**: 必须使用结构化 `reactions` 数组：

```json
"reactions": [{
  "dependencies": ["fieldA"],
  "fulfill": {
    "state": { "visible": "{{ $deps[0] === 'yes' }}" },
    "schema": { "props.options": "{{ fetchOptions($deps[0]) }}" }
  }
}]
```

- **上下文变量**: 仅允许 `$deps`, `$self`, `$form`, `$index`, `formData`, `rootValue`。

---

## 3. Core 层实现约束 (Core Implementation)

### 3.1 依赖图 (DependencyGraph)

- **必须**在 Schema 初始化时静态构建依赖边，**严禁**运行时动态扫描。
- **必须**提供 `getDependents(path: string): Set<string>` 方法。
- **严禁**在 `setFieldValue` 中进行全量 Diff 或全量校验。

### 3.2 状态管理 (FieldState)

- 每个字段必须维护独立状态：`{ value, visible, disabled, required, loading, errors, props }`。
- 状态更新必须通过 `engine.setFieldState(path, patch)` 触发，内部自动触发依赖图通知。

### 3.3 插件系统 (Plugins)

- **严禁**在 Core 主类中硬编码 `asyncValidator`、`arrayOperations` 等逻辑。
- **必须**通过 `engine.use(plugin)` 注入，插件可拦截 `setFieldValue`、`validate`、`init` 等生命周期。

---

## 4. Renderer 层约束 (Renderer Implementation)

### 4.1 组件注册

- **严禁**内置任何 UI 组件（连 `<input>` 都不允许）。
- **必须**通过 `engine.registerWidgets({ input: MyInput })` 注入。
- **必须**通过 `engine.registerLayouts({ card: MyCard })` 注入布局容器。

### 4.2 渲染逻辑

- **必须**使用 `useSyncExternalStore` (React) 或 `watchEffect` (Vue) 订阅单个字段状态。
- **严禁**在 Renderer 层进行 Schema 解析或路径计算，**必须**直接使用 Core 输出的 `RenderTree`。
- **布局节点隐藏处理**: 当字段 `visible: false` 时，Renderer **必须**渲染占位符或 `display: none`，**严禁**从 DOM 树中移除节点（防止栅格塌陷），除非 Layout Schema 显式配置 `removeHidden: true`。

---

## 5. 代码生成与审查清单 (Checklist)

AI 在生成或修改代码前，**必须**自检：

- [ ] **Core 纯净性**: 这个文件是否 import 了 `react`/`vue`/`dom`？如果是，**立即停止**，移至 Renderer 层。
- [ ] **路径安全性**: 这个 Schema 变更是否改变了 `formData` 的 Key 结构？如果是，**必须**确认是否为布局调整，若是，**必须**确保布局节点 Key 被丢弃。
- [ ] **性能安全**: 这个更新是否触发了 `engine.validate()` 全量校验？如果是，**必须**改为增量校验或插件处理。
- [ ] **类型安全**: `NexusSchema` 类型是否支持 `reactions` 和 `widget` 的联合类型推断？
- [ ] **向后兼容**: 这个 Schema 是否包含 `displayType`/`column` 等 x-render 字段？如果是，**必须**在 Parser 层做兼容映射。

---

## 6. 目录结构约束

```
@nexus/form-engine/
├── core/                # 🚫 严禁 UI 代码
│   ├── DependencyGraph.ts
│   ├── SchemaParser.ts  # 负责分离 DataFields 和 LayoutTree
│   ├── ExpressionSandbox.ts
│   └── Engine.ts
├── react/               # 🎨 仅 UI 适配
│   ├── useEngine.ts
│   ├── NexusField.tsx
│   └── NexusLayout.tsx
├── plugins/             # 🔌 功能扩展
│   ├── async-validator.ts
│   └── array-list.ts
└── types/               # 📜 协议定义
    └── schema.ts
```

---

## 7. 常见错误模式 (Anti-Patterns)

- ❌ **错误**: 在 `card.properties` 下定义字段，导致 `formData.card.fieldName`。
    - ✅ **正确**: Parser 识别 `card` 为布局节点，路径计算跳过 `card`，结果为 `formData.fieldName`。
- ❌ **错误**: 在 React 组件内使用 `useMemo` 重新解析 Schema。
    - ✅ **正确**: Schema 解析仅在 `engine.init()` 或 `engine.setSchema()` 时执行一次，React 只订阅 `RenderTree`。
- ❌ **错误**: 使用 `watch(formData, ...)` 进行联动。
    - ✅ **正确**: 使用 `DependencyGraph` 订阅具体路径 `engine.subscribe('fieldA', ...)`。

---

> **Agent 指令**: 当用户要求修改表单逻辑时，优先检查 `core/SchemaParser.ts` 的路径计算逻辑；当用户要求修改 UI 时，优先检查 `react/NexusLayout.tsx` 的占位策略。**永远不要为了 UI 效果而修改数据 Schema 结构。**