# @xbeeant/form-engine-react

`@xbeeant/form-engine` 的 React 渲染适配层。

通过 `useSyncExternalStore` + 按路径精准版本订阅渲染字段，联动更新只重渲染受影响的组件；Schema 解析与路径计算全部在 Core 完成，本包直接消费渲染树。

## 安装

```bash
npm install @xbeeant/form-engine-react @xbeeant/form-engine
```

peerDependencies：`react >= 18`、`react-dom >= 18`。

## 快速开始

```tsx
import { useForm, NexusForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '@xbeeant/form-engine-ui';

const schema = {
  type: 'object',
  displayType: 'row',
  properties: {
    username: {
      type: 'string',
      widget: 'input',
      title: '用户名',
      required: true,
    },
    age: { type: 'integer', widget: 'number', title: '年龄' },
  },
};

function App() {
  const [form] = useForm();
  return (
    <NexusForm
      form={form}
      schema={schema}
      initialValues={{ username: 'alice' }}
      onFinish={(values) => console.log(values)}
      onFinishFailed={(errors) => console.log(errors)}
      footer
    />
  );
}
```

> 需要先注册 UI 组件：`registerAntdUI(engine)`（engine 由 `useForm()` 内部创建）或 `engine.use(antdPreset)` 注入 `@xbeeant/form-engine-ui`。未注册 widget 的字段会优雅降级渲染。

## API

### NexusForm

| Prop | 类型 | 说明 |
| :--- | :--- | :--- |
| `form` | `FormController` | 由 `useForm()` 创建的表单实例 |
| `schema` | `NexusSchema` | Schema 定义（缺省则渲染 children） |
| `initialValues` | `Record<string, unknown>` | 初始值 |
| `widgets` / `layouts` | `Record<string, (props) => ReactNode>` | 额外注册的组件 |
| `onFinish` | `(formData) => void \| Promise` | 提交成功回调 |
| `onFinishFailed` | `(errors: Map<string, string[]>) => void` | 校验失败回调 |
| `footer` | `boolean \| ReactNode` | 是否显示默认提交/重置按钮，或自定义 |
| `displayType` / `labelWidth` / `label` / `colon` / `column` / `readOnly` | — | 表单布局配置，优先级：组件 props > Schema 顶层 > 默认值 |
| `className` / `style` / `children` | — | 常规属性 |

### useForm

```ts
const [form] = useForm(); // 返回 [FormController]，可选 useForm(engine) 复用已有实例
```

`FormController` 常用方法：`submit()`、`resetFields()`、`setValues(values)`、`setValueByPath(path, value)`、`getValues(paths?)`、`getAllValues()`、`getHiddenValues()`、`validateFields(paths?)`、`getFieldError(path)`、`setSchema(schema)`、`setSchemaByPath(path, patch)`、`registerValidator(path, fn)`、`scrollToPath(path)` 等。`submit` 失败时自动滚动聚焦第一个错误字段。

### Hooks

| Hook | 说明 |
| :--- | :--- |
| `useFormData()` | 订阅完整 formData（全局快照） |
| `useFieldValue(path)` | 订阅单字段值（精准版本订阅，仅该字段重渲染） |
| `useFieldState(path)` | 订阅单字段完整状态（value / errors / visible / required ...） |
| `useWatch(path)` | 监听字段值变化（`(value, oldValue) => void`） |
| `useWatchState(path)` | 监听字段状态变化 |
| `useWatchMultiple(paths)` | 同时监听多个字段 |
| `useWatchAll()` | 监听所有字段值变化 |
| `useEngine()` | 获取当前引擎实例 |
| `useFieldValidator(path, validator)` | 为字段注册校验器 |
| `useFormConfig()` | 获取表单布局配置（displayType / labelWidth / column ...） |

## 关联包

| 包 | 说明 |
| :--- | :--- |
| `@xbeeant/form-engine` | 表单引擎核心（纯 TypeScript） |
| `@xbeeant/form-engine-ui` | Ant Design 控件与布局库 |
| `@xbeeant/form-engine-designer` | Schema 可视化设计器 |