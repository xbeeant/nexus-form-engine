# @xbeeant/form-engine

Schema 驱动的表单引擎核心（纯 TypeScript，UI 无关）。

数据定义与布局定义融合在同一份 JSON Schema 中；Core 层不包含任何 DOM / React / Vue / CSS 代码，可在 Node.js、浏览器、Worker 中运行。React 渲染适配见 `@xbeeant/form-engine-react`，内置 Ant Design 控件/布局见 `@xbeeant/form-engine-ui`。

## 特性

- **协议融合**：一份 Schema 同时描述数据结构与布局（card / tabs / grid 等），无需维护两份配置
- **布局透明**：布局节点的 Key 不进入 `formData` 数据路径，调整布局结构不会破坏数据与联动
- **显式依赖图**：依赖边静态构建，联动更新复杂度 O(k)，无隐式依赖收集
- **插件化**：数组操作、异步校验通过 `engine.use(plugin)` 注入，Core 主类保持纯净
- **完整校验**：字段级约束自动转规则，支持 required / min / max / pattern / enum / 自定义 validator 与异步校验
- **表达式安全沙箱**：联动与计算字段使用受控的 `{{ ... }}` 表达式，上下文白名单隔离

## 安装

```bash
npm install @xbeeant/form-engine
```

## 快速开始

```ts
import {
  NexusEngine,
  ArrayOperationsPlugin,
  AsyncValidatorPlugin,
} from '@xbeeant/form-engine';

const engine = new NexusEngine();
// 可选插件：数组操作 / 异步校验调度
engine.use(new ArrayOperationsPlugin(engine));
engine.use(new AsyncValidatorPlugin(engine));

// 初始化 Schema 与初始值
engine.init({
  type: 'object',
  properties: {
    username: {
      type: 'string',
      widget: 'input',
      title: '用户名',
      required: true,
      min: 3,
      max: 20,
    },
    age: { type: 'integer', widget: 'number', title: '年龄' },
  },
});

engine.setFieldValue('username', 'alice');
engine.getFormData(); // { username: 'alice', age: undefined }

engine.validate(); // 同步校验：required / min / max 等内置规则

// 按路径订阅字段状态
const unsubscribe = engine.subscribe('username', (state) => {
  console.log(state.value, state.errors);
});

engine.destroy();
```

## Schema 示例

```jsonc
{
  "type": "object",
  "displayType": "row",
  "labelWidth": 200,
  "properties": {
    "basicCard": {
      "type": "card",
      "title": "基本信息",          // 布局节点：Key 不进入 formData
      "properties": {
        "username": {
          "type": "string",
          "widget": "input",
          "title": "用户名",
          "required": true,
          "min": 3,                 // 字段级约束自动转为校验规则
          "pattern": "^[a-zA-Z0-9_]+$"
        },
        "total": {
          "type": "number",
          "widget": "number",
          "title": "总额",
          "readOnly": true,
          "reactions": [            // 计算字段：单价 × 数量
            {
              "dependencies": ["price", "count"],
              "fulfill": { "state": { "value": "{{ $deps.price * $deps.count }}" } }
            }
          ]
        }
      }
    }
  }
}
```

## 核心 API

### NexusEngine

| 方法 | 说明 |
| :--- | :--- |
| `init(schema, initialValues?)` | 初始化引擎（Schema 解析、依赖图构建仅在此处执行一次） |
| `setSchema(schema)` / `setSchemaByPath(path, patch)` | 动态替换 / 局部更新 Schema |
| `setFieldValue(path, value)` / `setFieldValues(values)` | 写值，自动触发联动与实时校验 |
| `getFieldValue(path)` / `getFormData(paths?)` | 读取值（支持 `bind` 映射） |
| `getFieldState(path)` / `setFieldState(path, patch)` | 字段状态读写（value / visible / disabled / required / errors ...） |
| `validate()` / `validateField(path, options?)` | 全量 / 单字段校验 |
| `getRenderTree()` | 获取渲染树（React 层消费） |
| `subscribe(path, cb)` / `subscribeField(path, cb)` | 按路径订阅字段状态 / 精准版本订阅 |
| `subscribeAll(cb)` | 全局订阅（仅用于 formData / RenderTree 消费） |
| `arrayOperation(options)` | 数组增删改（需注入 `ArrayOperationsPlugin`） |
| `registerFieldValidator(path, fn)` | 注册外部校验器（配合 `AsyncValidatorPlugin` 支持防抖异步校验） |
| `registerWidgets(record)` / `registerLayouts(record)` | 注册 UI 无关的组件实现 |
| `use(plugin)` | 注入插件（`onInit / onValidateField / onArrayOperation` 等钩子） |
| `destroy()` | 释放订阅与资源 |

### 联动与校验

- 简单联动：`required / disabled / readOnly / hidden` 支持字符串表达式，如 `required: "{{ formData.type === 'person' }}"`，Parser 自动转换为显式 reaction 进依赖图
- 计算字段：`reactions[].fulfill/otherwise.state.value` 支持 `{{ ... }}` 表达式，值变化后自动重校验并沿依赖图传播
- 上下文变量白名单：`$deps`、`$self`、`$form`、`$index`、`formData`、`rootValue`
- 校验触发：`change`（默认，实时）/ `blur` / `submit`（仅 `validate()` 时生效）
- 消息模板：`rule.message` 支持 `{title} / {min} / {max} / {len}` 占位符，可用 `new NexusEngine({ messages })` 全局覆盖

### 工具导出

- 类型：`NexusSchema`、`FieldState`、`Reaction`、`ValidationRule`、`RenderTreeNode` 等全部协议类型
- Schema 判定：`isDataArray` / `isDataField` / `isDataObject` / `isLayoutNode` / `getNestedValue` / `setNestedValue` 等
- 序列化：`serialize` / `deserialize` / `diff` / `compress` / `compressToBase64` 等
- 数据转换：`toFormData` / `toMultipart` / `toSearchParams` / `formatField`

## 关联包

| 包 | 说明 |
| :--- | :--- |
| `@xbeeant/form-engine-react` | React 渲染适配（NexusForm / useForm / Hooks） |
| `@xbeeant/form-engine-ui` | Ant Design 控件与布局库 |
| `@xbeeant/form-engine-designer` | Schema 可视化设计器 |