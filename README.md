# @xbeeant/form-engine

一个 由AI生成的，**Schema 驱动的表单引擎**，通过一份 JSON Schema 同时描述表单的**数据结构**与**布局结构**，提供字段状态管理、数据绑定、联动（reactions）、校验、插件系统等能力。

- **UI 无关核心**：`core` 层为纯 TypeScript，无任何 DOM / React / Vue 依赖，可在 Node.js / Browser / Worker 中运行。
- **协议融合**：数据定义与布局定义在同一份 Schema 中，无需维护两份协议。
- **布局透明**：布局节点（Card / Tabs / Grid）的 Key 不进入 `formData` 数据路径，调整布局不会改变数据 Key 或破坏联动规则。
- **显式依赖**：基于 `DependencyGraph` 静态构建依赖边，避免 Proxy / MobX 隐式依赖收集，保证 O(k) 的联动更新复杂度。

## 特性

- 📋 **统一 Schema**：一份 JSON 同时描述数据字段与布局结构，兼容 x-render 语法（`hidden` / `validate` / `bind` / `enum` / `displayType` 等）
- 🔗 **Reactions 联动**：结构化 `reactions` 数组声明依赖、条件与状态/Schema 补丁，支持 `when` / `fulfill` / `otherwise`，`tooltip` / `title` / `description` 均可动态联动
- 🧩 **插件系统**：异步校验（防抖/超时/并行）、数组操作（push/pop/insert/move + minItems/maxItems 约束）等能力通过 `engine.use()` 注入
- ✅ **多维校验**：内置规则（required/min/max/pattern）、表达式校验、自定义 validator、跨字段校验、`validateFirst` 短路
- 🔀 **数据绑定**：`bind` 支持路径重映射（`"user.name"`）、数组拆分（`["a.b", "c.d"]`）与 `false`（不提交）；提交支持 `omitNil` 空值过滤
- 🔄 **远程选项**：`remoteData` 异步加载 + `reloadRemoteData()` 手动重载
- 📡 **值变化回调**：`onValuesChange` 标准回调（changedValue, allValues, changedPath）
- ⏳ **提交状态**：`getSubmitting()` / `useFormSubmitting` 展示提交 loading
- 🎯 **精准订阅**：React 渲染层基于 `useSyncExternalStore` 按字段路径精准订阅，避免全局重渲染
- 🎨 **UI 无关渲染**：Renderer 层通过 `registerWidgets` / `registerLayouts` 注入组件，`core` 层不做任何 UI 假设
- 🛠 **Schema 设计器**：内置可视化设计器（Canvas / Palette / PropertyPanel），支持拖拽布局与 JSON 编辑

## Monorepo 结构

本仓库使用 Lerna + npm workspaces 管理，包含以下包：

```
packages/
├── core/         @xbeeant/form-engine          表单引擎核心（纯 TS，UI 无关）
├── react/        @xbeeant/form-engine-react    React 渲染层（NexusForm / Hooks）
├── ui/           @xbeeant/form-engine-ui       Ant Design Widget / Layout 组件库
├── designer/     @xbeeant/form-engine-designer 可视化 Schema 设计器
└── examples/     @xbeeant/form-engine-examples 演示应用
```

| 包 | 职责 | 依赖 |
| :--- | :--- | :--- |
| `@xbeeant/form-engine` | 引擎、Schema 解析、依赖图、表达式沙箱、插件 | 无（纯 TS） |
| `@xbeeant/form-engine-react` | `NexusForm` / `NexusField` / `FormController` / `useForm` / `useWatch` 等 | react ≥ 18 |
| `@xbeeant/form-engine-ui` | 基于 antd 的 Widget 与 Layout 实现 | antd ≥ 6、dayjs |
| `@xbeeant/form-engine-designer` | 可视化 Schema 设计器 | antd ≥ 6、dayjs |
| `@xbeeant/form-engine-examples` | 综合示例应用 | 上述全部 |

## 快速开始

```bash
# 安装依赖
npm install

# 启动示例应用
npm run dev

# 构建全部包
npm run build

# 运行测试（core 包使用 Vitest）
npm test
```

### 最小示例

```tsx
import type { NexusSchema } from '@xbeeant/form-engine';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { useEffect } from 'react';

const schema: NexusSchema = {
  type: 'object',
  displayType: 'row',
  labelWidth: 120,
  properties: {
    username: {
      type: 'string',
      widget: 'input',
      title: '用户名',
      required: true,
      placeholder: '请输入用户名',
    },
    contactMethod: {
      type: 'string',
      widget: 'select',
      title: '首选联系方式',
      enum: ['phone', 'email'],
      enumNames: ['手机', '邮箱'],
    },
    contactPhone: {
      type: 'string',
      widget: 'input',
      title: '手机号',
      reactions: [
        {
          dependencies: ['contactMethod'],
          when: '{{ $deps[0] === "phone" }}',
          fulfill: { state: { visible: true, required: true } },
          otherwise: { state: { visible: false, required: false } },
        },
      ],
    },
  },
};

function App() {
  const [form] = useForm();

  useEffect(() => {
    registerAntdUI(form._getEngine());
  }, [form]);

  return (
    <NexusForm
      form={form}
      schema={schema}
      onFinish={(data) => console.log('提交数据', data)}
    />
  );
}
```

## Schema 协议

### 节点类型判定

AI / 开发者解析 Schema 时，依据以下规则判定节点类型：

| 节点特征 | 类型 | 数据路径影响 |
| :--- | :--- | :--- |
| 包含 `widget` 字段 | 数据字段 | ✅ Key 进入路径 |
| `type: "object"` 且无 `widget` | 数据对象 | ✅ Key 进入路径 |
| `type: "array"` | 数据数组 | ✅ Key 进入路径 |
| `type` 为布局类型且无 `widget` | 布局容器 | ❌ Key 不进入路径 |
| `type` 为面板类型 | 布局面板 | ❌ Key 不进入路径 |

- **布局类型白名单**：`card`、`tabs`、`grid`、`flex`、`space`、`steps`、`collapse`、`divider`、`void`、`passThrough`
- **面板类型白名单**：`tabPane`、`step`、`collapsePanel`

> 示例：`card.properties` 下定义的字段路径为 `formData.fieldName`，**不会**变成 `formData.card.fieldName`。

### Reactions 联动

- **简单联动**：保留 `hidden: "{{ formData.x === 'y' }}"` 语法，Parser 自动将其转换为 Reaction。
- **复杂联动**：使用结构化 `reactions` 数组：

```json
"reactions": [{
  "dependencies": ["fieldA"],
  "fulfill": {
    "state": { "visible": "{{ $deps[0] === 'yes' }}" },
    "schema": { "props.options": "{{ fetchOptions($deps[0]) }}" }
  }
}]
```

- **上下文变量**：仅允许 `$deps`、`$self`、`$form`、`$index`、`formData`、`rootValue`。

### 数据绑定（Bind）

```json
{ "type": "string", "widget": "input", "bind": "user.name" }   // 值映射到 user.name
{ "type": "string", "widget": "input", "bind": ["a.b", "c.d"] } // 数组值拆分到多个路径
{ "type": "string", "widget": "input", "bind": false }          // 不参与数据收集
```

## 渲染层

### 组件注册

`@xbeeant/form-engine` 核心不内置任何 UI 组件，组件由渲染层注入：

```tsx
import { registerAntdUI } from '@xbeeant/form-engine-ui';

const engine = new NexusEngine();
registerAntdUI(engine); // 注册 antdWidgets + antdLayouts + AsyncValidatorPlugin

// 或手动注册
engine.registerWidgets({ input: MyInput });
engine.registerLayouts({ card: MyCard });
```

### 表单实例 API

`useForm()` 返回 `FormController` 实例，提供以下方法：

| 方法 | 说明 |
| :--- | :--- |
| `submit(options?)` | 校验 + 提交，回调 `onFinish` / `onFinishFailed`；`options.validateFirst` 首个失败字段短路，`options.omitNil` 递归移除空值 |
| `getValues(paths?, options?)` | 获取可见字段数据（不含 hidden）；`options.omitNil` 递归移除空值 |
| `getAllValues()` | 获取全部字段数据（含 hidden） |
| `getHiddenValues()` | 仅获取 hidden 字段数据 |
| `setValueByPath(path, value)` | 按路径设置单个字段值 |
| `setValues(values)` | 批量设置字段值（按 bind 反向解析） |
| `setSchemaByPath(path, patch)` | 动态更新 Schema 节点 |
| `validateFields(paths?, options?)` | 校验指定字段；`options.validateFirst` 短路 |
| `registerValidator(path, fn)` | 注册字段级校验器（支持异步） |
| `resetFields()` | 重置表单到初始状态 |
| `reloadRemoteData(path?)` | 重载远程选项数据（缺省重载全部，x-render 对齐） |
| `getSubmitting()` / `onSubmittingChange(cb)` | 提交中状态（formily submitting 对齐，配 `useFormSubmitting` Hook） |

### Watch Hooks

```tsx
useWatch(engine, 'profile.name', (value) => console.log(value));
useWatchAll(engine, (formData) => console.log(formData), { deep: true });
useWatchMultiple(engine, ['name', 'email'], (values) => console.log(values));
useWatchState(engine, 'email', (state) => console.log(state.disabled));
```

## 插件

Core 层通过 `engine.use(plugin)` 扩展能力，禁止在主类中硬编码：

- **AsyncValidatorPlugin**：字段级异步校验的防抖 / 超时 / 并行调度（`packages/core/src/async-validator.ts`）。
- **ArrayOperationsPlugin**：数组字段的 `push` / `pop` / `remove` / `update` / `insert` / `move` 操作（`packages/core/src/array-list.ts`）。

```ts
import { AsyncValidatorPlugin, ArrayOperationsPlugin } from '@xbeeant/form-engine';

engine.use(new AsyncValidatorPlugin(engine));
engine.use(new ArrayOperationsPlugin(engine));
```

`ui` 包的 `registerAntdUI` 已自动注入 `AsyncValidatorPlugin`。

## 开发命令

| 命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动示例应用（Vite + HMR） |
| `npm run build` | 构建所有包（Lerna） |
| `npm run test` | 运行 core 包测试（Vitest） |
| `npm run lint` | Biome 代码检查 |
| `npm run format` | Biome 格式化 |

## GitHub Pages 项目介绍站点

`packages/examples` 同时作为项目介绍站点，包含**核心机制 / 扩展介绍 / 使用示例 / 设计器**四个页面，
构建产物发布到 GitHub Pages（路径前缀 `/nexus-form-engine/`，可用 `NEXUS_BASE` 环境变量覆盖）。

手动发布：

```bash
# 本地预览构建产物
cd packages/examples && bunx --bun vite build && bunx --bun vite preview
```

或通过 GitHub Actions：**Actions → Deploy GitHub Pages → Run workflow**（工作流见
[.github/workflows/pages.yml](./.github/workflows/pages.yml)）。首次部署前需在
**Settings → Pages** 中将 Source 设置为 **GitHub Actions**。

## 相关文档

- [AGENTS.md](./AGENTS.md) — 工程约束规范（核心架构原则、协议规范、实现约束、审查清单）
- [自定义 Widget 指南](./packages/ui/docs/custom-widget-guide.md) — 如何开发自定义表单组件
- [示例应用](./packages/examples) — 覆盖全部 Widget / Layout / reactions / 校验 / 只读模式 / watch 的完整示例

## License

MIT
