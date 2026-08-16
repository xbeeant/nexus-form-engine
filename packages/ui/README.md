# @xbeeant/form-engine-ui

`@xbeeant/form-engine` 的 Ant Design 内置控件与布局库。

基于 antd 实现 30+ 表单控件与 9 种布局容器，通过 `registerAntdUI(engine)` 或 `antdPreset` 插件一键注入引擎。组件均为 UI 无关的 `NexusComponent` 签名（`(props) => ReactNode`），可被任意渲染层复用。

## 安装

```bash
npm install @xbeeant/form-engine-ui @xbeeant/form-engine
```

peerDependencies：`antd >= 5`、`react >= 18`、`react-dom >= 18`、`dayjs >= 1.11`。

## 快速开始

```ts
import { NexusEngine } from '@xbeeant/form-engine';
import { registerAntdUI, antdPreset } from '@xbeeant/form-engine-ui';

const engine = new NexusEngine();

// 方式一：注册函数
registerAntdUI(engine);

// 方式二：作为插件注入（推荐，可与其它插件统一管理）
engine.use(antdPreset);
```

配合 React 渲染层：

```tsx
import { useForm, NexusForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';
import { NexusEngine } from '@xbeeant/form-engine';

const engine = new NexusEngine();
registerAntdUI(engine);

function App() {
  const [form] = useForm(engine);
  return (
    <NexusForm
      form={form}
      schema={{
        type: 'object',
        properties: {
          name: { type: 'string', widget: 'input', title: '名称' },
          city: {
            type: 'string',
            widget: 'select',
            title: '城市',
            enum: ['北京', '上海', '广州'],
          },
          tag: {
            type: 'array',
            widget: 'checkboxes',
            title: '标签',
            enum: ['A', 'B', 'C'],
          },
        },
      }}
    />
  );
}
```

## 内置控件（widgets）

`input` `password` `textArea` `number` `inputNumber` `select` `multiSelect` `radio` `checkboxes` `checkbox` `switch` `slider` `rate` `segmented` `datePicker` `dateRange` `timePicker` `timeRange` `treeSelect` `cascader` `autoComplete` `mentions` `color` `transfer` `file` `imageInput` `html` `urlInput` `voidTitle` `list` `simpleList` `tableList`

每个控件均可单独导入（如 `inputWidget`、`selectWidget`），并导出对应的 `xxxWidgetProps` 类型（如 `SelectWidgetProps`）。

## 内置布局（layouts）

| 类型 | 说明 |
| :--- | :--- |
| `card` | 卡片容器（Key 不进入数据路径） |
| `tabs` / `tabPane` | 标签页 |
| `steps` / `step` | 步骤条 |
| `collapse` / `collapsePanel` | 折叠面板 |
| `grid` | 栅格容器 |
| `flex` | Flex 容器 |
| `divider` | 分割线 |
| `space` | 间距容器 |
| `passThrough` / `void` | 透传 / 占位容器 |

## Schema 定义（widgetSchemas）

`widgetSchemas` 聚合了各控件的 Schema 属性描述符（`widget 名 → 属性描述`），供设计器 PropertyPanel 展示「组件属性」分区；每个控件也有独立的 `xxxSchema` 导出（如 `inputSchema`、`selectSchema`）。可作为设计器 `propertySchemaMap` 默认值，或按 widget 名覆盖扩展。

## 工具导出

| 导出 | 说明 |
| :--- | :--- |
| `withFormItem` | 包装组件以支持表单校验（value / onChange / errors 绑定） |
| `ReadOnlyDisplay` | 只读展示组件（readOnly 状态时渲染为文本） |
| `useFormItemProps` | 获取 Ant Design FormItem 属性 |
| `mapOptions` | 将选项数据映射为 Select/Option 格式 |

## 自定义控件

控件实现 `NexusComponent` 签名后通过 `engine.registerWidgets({ myWidget })` 注册，Schema 中 `widget: 'myWidget'` 即可使用；同时可用 `xxxSchema` 提供属性描述符供设计器编辑。

## 关联包

| 包 | 说明 |
| :--- | :--- |
| `@xbeeant/form-engine` | 表单引擎核心（纯 TypeScript） |
| `@xbeeant/form-engine-react` | React 渲染适配 |
| `@xbeeant/form-engine-designer` | Schema 可视化设计器 |