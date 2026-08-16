# @xbeeant/form-engine-designer

`@xbeeant/form-engine` 的 Schema 可视化设计器。

提供组件面板（Palette）、画布（Canvas）与属性面板（PropertyPanel），拖拽生成符合协议规范的 Schema——布局节点（card / tabs / grid 等）的 Key 不会进入数据路径。内置 antd 控件目录与属性编辑器，开箱即用。

## 安装

```bash
npm install @xbeeant/form-engine-designer @xbeeant/form-engine @xbeeant/form-engine-ui
```

peerDependencies：`antd >= 5`、`react >= 18`、`react-dom >= 18`、`dayjs >= 1.11`。

## 快速开始

```tsx
import { Designer } from '@xbeeant/form-engine-designer';
import { useRef } from 'react';

function App() {
  return (
    <Designer
      schema={initialSchema}
      onSchemaChange={(schema) => console.log(schema)}
    />
  );
}
```

`Designer` 默认使用 `@xbeeant/form-engine-ui` 的 `registerAntdUI` 注册控件、`widgetSchemas` 提供属性描述符；传入自定义 `registerUI` / `propertySchemaMap` 即可接入其它 UI 库。

## Designer Props

| Prop | 类型 | 说明 |
| :--- | :--- | :--- |
| `schema` | `NexusSchema` | 初始 Schema |
| `onSchemaChange` | `(schema: NexusSchema) => void` | Schema 变更回调 |
| `propertySchemaMap` | `PropertySchemaMap` | widget 名 → 属性描述符映射（默认 `widgetSchemas`，可按 widget 名覆盖） |
| `registerUI` | `(engine: NexusEngine) => void` | UI 注册函数（默认 `registerAntdUI`） |
| `fields` | `FieldDef[]` | 外部字段列表（palette 增加「字段列表」分组） |
| `widgetCatalog` | `CatalogItem[]` | 额外 widget 目录项（同名覆盖内置） |
| `layoutCatalog` | `CatalogItem[]` | 额外 layout 目录项（同名覆盖内置） |

## 导出

### 组件与上下文

- `Designer` — 设计器主组件
- `DesignerProvider` / `useDesigner` / `DesignerContextValue` — 设计器上下文
- `Palette` / `Canvas` / `PropertyPanel` — 三大面板

### Schema 工具（schemaUtils）

| 函数 | 说明 |
| :--- | :--- |
| `addChildToSchema` | 向指定节点添加子节点 |
| `removeNodeFromSchema` | 移除节点 |
| `updateNodeInSchema` / `updateNodeWithNesting` | 更新节点（支持嵌套结构） |
| `getNodeAtProperties` | 按路径获取节点 |
| `flattenNodeForPropertyEditor` | 展平节点供属性编辑器使用 |
| `collectDataFieldPaths` / `collectDataFieldOptions` | 收集数据字段路径 / 选项 |

### 目录

- `widgetCatalog` / `layoutCatalog` — 内置控件与布局目录项

### 类型

- `CatalogItem`、`DesignerMode`、`FieldDef`、`SchemaPath`、`DesignerProps`、`DesignerContextValue`

## 关联包

| 包 | 说明 |
| :--- | :--- |
| `@xbeeant/form-engine` | 表单引擎核心（纯 TypeScript） |
| `@xbeeant/form-engine-react` | React 渲染适配 |
| `@xbeeant/form-engine-ui` | Ant Design 控件与布局库（设计器默认 UI） |