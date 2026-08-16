# 工程功能完善计划

> 基于 AGENTS.MD 的约束规范，系统性地完善 @xbeeant/form-engine 表单引擎

---

## 📊 现状评估

### ✅ 已实现
- ✅ Core层纯TypeScript实现，无UI依赖
- ✅ Schema协议统一（数据定义与布局定义）
- ✅ 布局透明（Layout节点Key不进入formData路径）
- ✅ 显式依赖图（DependencyGraph）
- ✅ reactions联动协议
- ✅ 表达式求值（{{ }}语法）
- ✅ 数据绑定协议
- ✅ 自定义插件系统

### ❌ 待完善功能
1. **ExpressionSandbox** - 表达式安全沙箱环境
2. **Async-Validator插件** - 异步校验器标准实现
3. **ArrayOperations插件** - 数组字段操作标准实现
4. **FormController** - React层统一控制器
5. **FormRender组件** - React层统一渲染器
6. **WatchEffect/Hooks** - 响应式订阅系统
7. **自动格式化/数据转换** - 多种数据格式支持
8. **错误边界处理** - 表达式求值失败降级
9. **性能优化** - 虚拟滚动、懒加载
10. **Schema导出/导入** - 设计器集成

---

## 🎯 功能完善任务列表

### 1️⃣ 表达式沙箱安全系统
**目标**: 实现 ExpressionSandbox.ts，确保表达式求值安全性

**约束**:
- 禁止直接访问 `window` / `document`
- 禁止调用外部API（fetch、axios等）
- 允许的上下文：`$deps`, `$self`, `$form`, `formData`, `rootValue`

**文件**: `packages/core/src/core/ExpressionSandbox.ts`

**实现要点**:
```typescript
class ExpressionSandbox {
  // 暴露的上下文对象
  createContext(context: ReactionContext): Record<string, unknown>

  // 安全求值
  evaluate(expression: string): unknown

  // 批量求值（性能优化）
  evaluateBatch(expressions: Record<string, string>): Record<string, unknown>
}
```

**检查点**:
- ✅ 黑名单机制：阻止 `window`, `document`, `eval`, `Function`
- ✅ 白名单机制：只允许上下文变量
- ✅ 错误隔离：单个表达式失败不影响其他表达式
- ✅ 性能监控：统计求值耗时

---

### 2️⃣ Async-Validator插件
**目标**: 实现异步校验器标准插件，支持网络请求校验

**文件**: `packages/plugins/async-validator.ts`

**功能**:
- 支持异步校验器注册
- 防抖机制（默认300ms）
- 取消pending校验（字段重新变更时）
- 错误消息格式化

**使用示例**:
```typescript
const asyncValidator = {
  validators: {
    'check-email': async (value, rule, formData, path) => {
      const isTaken = await fetchEmailAvailability(value);
      return isTaken ? ['邮箱已被使用'] : [];
    }
  }
};

engine.use(asyncValidator);
```

**检查点**:
- ✅ 防抖定时器管理（cleanup在destroy时清除）
- ✅ 并行校验支持
- ✅ 超时控制（可配置，默认5s）
- ✅ 内存泄漏防护

---

### 3️⃣ ArrayOperations插件
**目标**: 实现数组字段的标准操作插件（增删改查）

**文件**: `packages/plugins/array-list.ts`

**功能**:
- `push` - 添加数组项
- `pop` - 移除最后一项
- `remove` - 移除指定索引项
- `update` - 更新指定索引项
- `insert` - 在指定位置插入项
- `move` - 移动数组项

**类型定义**:
```typescript
type ArrayOperation = {
  operation: 'push' | 'pop' | 'remove' | 'update' | 'insert' | 'move';
  path: string;                    // 数组字段路径
  value?: unknown;                 // push/insert/update时需要
  index?: number;                  // remove/update/insert/move时需要
  afterIndex?: number;             // insert/move时需要
};

function applyArrayOperation(
  engine: NexusEngine,
  operation: ArrayOperation
): void;
```

**检查点**:
- ✅ 路径校验：只对数组字段有效
- ✅ 边界处理：越界索引自动处理
- ✅ 状态通知：操作后触发dependency graph通知
- ✅ 影响范围：只更新相关字段，避免全量校验

---

### 4️⃣ FormController (React层)
**目标**: 提供统一的React Hook，简化表单控制器使用

**文件**: `packages/react/src/react/useFormController.ts`

**功能**:
- 封装Engine实例
- 自动注册field-level validators
- 提供watch/reactive订阅
- 统一的reset/submit接口
- Schema变更管理

**使用示例**:
```typescript
const { engine, formFields, handleSubmit } = useFormController(schema, {
  initialValues,
  onSubmit: async (formData) => {
    // submit logic
  }
});
```

**检查点**:
- ✅ 自动销毁：组件卸载时清理Engine
- ✅ Schema响应：schema变更时自动re-init
- ✅ 错误处理：try-catch包装，错误传递给UI
- ✅ 性能优化：useMemo/useCallback优化渲染

---

### 5️⃣ FormRender组件 (React层)
**目标**: 提供统一渲染器，支持自定义Widget/Layout注册

**文件**: `packages/react/src/react/NexusFormRender.tsx`

**功能**:
- 渲染完整表单结构（renderTree递归）
- 支持hidden字段占位（layout: void）
- 布局节点特殊渲染
- 自定义组件动态加载

**API设计**:
```typescript
<NexusFormRender
  engine={engine}
  renderWidget={(widgetName, props) => customWidget(props)}
  renderLayout={(layoutName, props) => customLayout(props)}
  renderPlaceholder={(layoutKey) => <div />}
/>
```

**检查点**:
- ✅ 避免全量校验：只在需要时validate
- ✅ 订阅优化：按需订阅字段状态
- ✅ 性能监控：渲染耗时统计
- ✅ 错误边界：组件错误隔离

---

### 6️⃣ WatchEffect/Hooks
**目标**: 实现类似Vue的响应式订阅系统

**文件**: `packages/react/src/react/useWatch.ts`

**功能**:
```typescript
// 监听单个字段
const value = useWatch(engine, 'fieldA');

// 监听多个字段
const data = useWatch(engine, ['fieldA', 'fieldB']);

// 监听字段状态变化
const state = useWatchState(engine, 'fieldA');
```

**检查点**:
- ✅ 避免重复订阅：相同path使用缓存
- ✅ 手动管理：不自动unsubscribe（由调用方决定）
- ✅ 变更深度：支持字段值深度比较
- ✅ 性能监控：订阅变更频率统计

---

### 7️⃣ 自动格式化/数据转换
**目标**: 支持多种数据格式的自动转换（JSON/FormData/Multipart）

**文件**: `packages/core/src/utils/data-converters.ts`

**功能**:
```typescript
class DataConverter {
  // JSON → formData
  static toFormData(schema: NexusSchema, formData: Record<string, unknown>): FormData

  // JSON → Multipart (multipart/form-data)
  static toMultipart(schema: NexusSchema, formData: Record<string, unknown>): Map<string, File | string>

  // JSON → URLSearchParams
  static toSearchParams(schema: NexusSchema, formData: Record<string, unknown>): URLSearchParams

  // 根据字段format自动格式化（日期、金额等）
  static formatField(value: unknown, format?: string): unknown
}
```

**检查点**:
- ✅ 类型安全：严格的类型转换
- ✅ 格式校验：format不匹配时抛出错误
- ✅ 保留隐藏字段：可选参数控制
- ✅ 循环引用防护

---

### 8️⃣ 错误边界处理
**目标**: 表达式求值失败时的优雅降级

**文件**: `packages/core/src/core/ErrorBoundary.ts`

**功能**:
- 表达式求值失败时记录日志
- 返回默认值（而非undefined）
- 调用方提供的fallback机制
- 错误恢复建议

**错误策略**:
```typescript
// 策略1: 返回false（对布尔表达式友好）
// 策略2: 返回初始值（对显示表达式友好）
// 策略3: 抛出错误（开发环境）
```

**检查点**:
- ✅ 详细错误日志：包含expression、context、stack
- ✅ 错误统计：按expression分组统计失败次数
- ✅ 降级方案：provide default value
- ✅ 错误上报：可选集成监控工具

---

### 9️⃣ 性能优化
**目标**: 大型表单场景的性能优化

**文件**: `packages/core/src/performance/optimization.ts`

**优化策略**:
1. **虚拟滚动** - 对长列表字段（array）进行虚拟渲染
2. **懒加载** - 布局节点按需渲染（tab/step/collapse）
3. **增量校验** - 只校验visible且disabled=false的字段
4. **依赖图缓存** - 避免重复构建依赖关系
5. **渲染树diff** - React层减少不必要的re-render

**性能指标**:
- Schema解析耗时（<50ms）
- 字段值更新耗时（<1ms）
- 全量校验耗时（<100ms）
- 表单首次渲染（<500ms）

**检查点**:
- ✅ 性能监控：关键操作耗时统计
- ✅ 回归测试：性能基线保存
- ✅ 降级策略：性能不足时自动降级

---

### 🔟 Schema导出/导入
**目标**: 支持设计器场景下的Schema序列化/反序列化

**文件**: `packages/core/src/utils/schema-serializer.ts`

**功能**:
```typescript
class SchemaSerializer {
  // 序列化（压缩空值、注释）
  static serialize(schema: NexusSchema): string

  // 反序列化（支持base64压缩）
  static deserialize(serialized: string, options?: DeserializeOptions): NexusSchema

  // Schema差异检测（用于diff对比）
  static diff(oldSchema: NexusSchema, newSchema: NexusSchema): DiffResult
}
```

**检查点**:
- ✅ 顺序保持：properties中子元素顺序保留
- ✅ 循环引用检测：防止无限递归
- ✅ 变更追踪：记录字段新增/修改/删除
- ✅ 版本兼容：旧Schema向后兼容

---

## 📋 实施优先级

### P0 (必须)
1. ExpressionSandbox - 安全性基础
2. Async-Validator - 常见需求
3. FormController - React层统一入口
4. ErrorBoundary - 用户体验

### P1 (重要)
5. ArrayOperations - 数组字段常用操作
6. WatchEffect - 响应式编程支持
7. 自动格式化 - 数据提交标准化

### P2 (优化)
8. FormRender - UI层完善
9. 性能优化 - 大型表单场景
10. Schema序列化 - 设计器集成

---

## 🧪 测试策略

### 单元测试
- SchemaParser解析逻辑测试
- DependencyGraph依赖关系测试
- ExpressionSandbox安全测试
- 数据转换器格式测试

### 集成测试
- Engine生命周期测试
- 插件系统集成测试
- React层完整表单测试

### 性能测试
- 大Schema（100+字段）解析
- 频繁更新场景（1000+次/秒）
- 长数组（100+项）渲染

---

## 📊 质量指标

### 代码质量
- ✅ TypeScript严格模式（noImplicitAny）
- ✅ 代码覆盖率（>80%）
- ✅ 代码重复率（<10%）
- ✅ 单元测试通过率（100%）

### 性能指标
- ✅ Schema解析时间（<50ms）
- ✅ 字段更新时间（<1ms）
- ✅ 全量校验时间（<100ms）
- ✅ 首次渲染时间（<500ms）

### 用户体验
- ✅ 表达式求值失败降级率（100%）
- ✅ 错误提示友好度（用户易懂）
- ✅ 表单响应流畅度（60fps）

---

## 🔄 迭代计划

### Phase 1 (Week 1-2): 核心安全与控制
- [ ] ExpressionSandbox
- [ ] FormController
- [ ] ErrorBoundary

### Phase 2 (Week 3-4): 功能完善
- [ ] Async-Validator
- [ ] ArrayOperations
- [ ] WatchEffect

### Phase 3 (Week 5-6): UI层与优化
- [ ] FormRender
- [ ] 自动格式化
- [ ] 性能优化

### Phase 4 (Week 7-8): 高级功能
- [ ] Schema序列化
- [ ] 设计器集成测试
- [ ] 文档与示例

---

## 📝 附录

### A. 调试工具
- ExpressionSandbox调试日志
- 性能监控面板
- 依赖关系可视化

### B. 示例代码
- 基础表单示例
- 复杂联动示例
- 数据转换示例
- 插件使用示例

### C. 最佳实践
- Schema设计规范
- 插件开发指南
- React层使用指南
- 性能优化指南

---

**最后更新**: 2026-08-09
**维护者**: Claude Fable 5
**版本**: 1.0.0
