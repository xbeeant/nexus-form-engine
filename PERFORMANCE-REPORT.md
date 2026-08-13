# Nexus Form Engine — Core & UI 性能测试报告

> 日期：2026-08-13 ｜ 运行环境：Bun 1.3.11 / Node v24.3.0，16 核，Windows
> 依赖：antd 6.6.0、dayjs 1.11.21、@ant-design/pro-components 2.8.10、React 19.2.8

## 一、测试方法

| 项目 | 说明 |
| :--- | :--- |
| 测量工具 | 自写基准脚本（`performance.now()`，warmup + 多次采样，取 median / min / p95） |
| Core 口径 | `packages/core/bench/benchmark.ts`，直接运行 Bun，导入构建产物（dist） |
| UI 口径 | `packages/ui/bench/bench.tsx`，经 `vite build -c bench/vite.bench.config.ts` 打包（workspace 依赖 alias 到 src，保证单一模块实例，与 dev 一致），产物交给 Bun 执行，用 `renderToString` 测真实 antd 控件渲染成本 |
| 说明 | 子微秒级操作在 Bun 上存在约 2 倍抖动，请以量级判断，勿过度解读精确值 |

复现命令：

```bash
bun packages/core/bench/benchmark.ts
cd packages/ui && bunx vite build -c bench/vite.bench.config.ts && bun bench/dist/bench.js
```

## 二、Core 基准结果

场景：200 字段大型表单（4 张 card + 嵌套 object，混合 required/pattern/props 规则）；联动扇出 1→100 / 1→500。

| 场景 | median | min | p95 | 吞吐 |
| :--- | ---: | ---: | ---: | ---: |
| SchemaParser.parse（200 字段，4 cards） | 322.9 µs | 272.9 µs | 495.8 µs | ~3,096 次/s |
| SchemaParser.parse（200 字段，扁平） | 279.9 µs | 165.0 µs | 325.1 µs | ~3,573 次/s |
| engine.init（200 字段） | 336.9 µs | 293.2 µs | 456.7 µs | ~2,968 次/s |
| engine.init（联动扇出 1→100） | 693.4 µs | 600.3 µs | 874.7 µs | ~1,442 次/s |
| setFieldValue（单字段，含实时校验+通知） | 2.5 µs | 2.0 µs | 16.5 µs | ~400k ops/s |
| setFieldValue（无规则字段） | 1.3 µs | 1.0 µs | 2.3 µs | ~769k ops/s |
| setFieldValue(master) 联动 100 个 required 字段 | 365.7 µs | 330.9 µs | 435.4 µs | ~2,735 次/s |
| setFieldValue(master) 联动 500 个字段 | 2.01 ms | 1.92 ms | 2.99 ms | ~497 次/s |
| DependencyGraph.getDependents(master) | 2.5 µs | 1.5 µs | 10.5 µs | ~400k ops/s |
| validate() 全量（200 字段） | 10.16 ms | 9.65 ms | 11.80 ms | ~98 次/s |
| getFormData()（200 字段） | 46.3 µs | 43.5 µs | 56.1 µs | ~21.6k ops/s |
| getRenderTree() 快照（200 字段） | 0.1 µs | 0.1 µs | 0.4 µs | ~千万级 |
| 批量 setFieldValue×200（含 200 个按路径订阅） | 0.5 µs/op | 0.3 µs/op | 0.9 µs/op | ~205 万 ops/s |
| setFieldValues（202 键，bind 解析） | 0.7 µs/op | 0.5 µs/op | 1.1 µs/op | ~143 万 ops/s |
| arrayOperation push（数组重建 + 项状态重建） | 1.14 ms | 166.4 µs | 2.03 ms | ~879 次/s |
| arrayOperation remove(0) | 936.8 µs | 23.3 µs | 1.81 ms | ~1,067 次/s |
| ExpressionSandbox.evaluate | 1.8 µs | 1.6 µs | 2.7 µs | ~556k ops/s |
| getNestedValue / setNestedValue | 0.2 / 0.1 µs | — | — | ~500 万 ops/s |

结论：
- **联动传播符合 O(k)**：100 个依赖字段约 3.7 µs/字段，500 个约 4 µs/字段，接近线性。
- **getRenderTree 为 O(1) 缓存引用**（返回缓存的 renderTree，配合版本号通知），快照成本可忽略。
- **热点：数组操作**。每次 push/remove 都会 `syncArrayItemStates` 重建全部数组项子状态，构建 N 项列表为 O(N²)。push 约 1.1ms、remove 约 0.9ms（随列表增长而变慢）。

## 三、UI 基准结果（antd 6.6.0 真实渲染，SSR renderToString）

场景：20 / 100 字段，8 种 widget 轮换（input/select/number/switch/radio/textarea/password/slider）；另加 100 字段 10 张 card 布局。

| 场景 | median | min | p95 |
| :--- | ---: | ---: | ---: |
| 原生 antd Form（20 字段，Input） | 5.64 ms | 4.61 ms | 11.10 ms |
| NexusForm 全管线（20 字段，8 种 widget） | 12.46 ms | 8.92 ms | 25.40 ms |
| NexusForm 全管线（100 字段） | 48.22 ms | 41.11 ms | 55.93 ms |
| 原生 antd Form（100 字段，Input） | 30.57 ms | 26.02 ms | 40.43 ms |
| NexusForm（100 字段，10 张 card 布局） | 48.97 ms | 42.60 ms | 66.86 ms |
| NexusForm（100 字段，值变更后重渲染） | 53.13 ms | 41.49 ms | 62.97 ms |

说明：原生基线全部用 `Input`，而 Nexus 场景含 select/switch/radio/slider 等较重控件，故相对倍数是上界（渲染管线本身的开销更小）。卡片布局与扁平布局几乎持平（布局容器开销可忽略）。

## 四、测试过程中发现并修复的问题

1. **`requiredOn/disabledOn/readOnlyOn/visibleOn` 别名未实现（Bug）**
   - AGENTS.md §2.4 声明这些正向别名支持 `"{{ ... }}"` 表达式联动，但 `SchemaParser.REACTION_EXPR_FIELDS` 只有 `required/disabled/readOnly/hidden`，别名写在 Schema 上会被静默忽略（依赖图为空、无反应）。类型定义也未提供。
   - **处理**：本次未修复（超出性能测试范围），已定位到 `packages/core/src/SchemaParser.ts:92`，建议补入别名并加测试。

2. **`runAllReactions` 每个 reaction 重复构建 formData（性能 Bug，已修复）**
   - `Engine.runAllReactions` 调 `executeReaction` 未传快照，内部 `formData ?? this.getFormData()` 对每个表达式字段全量重建 formData（100 字段 ≈ 100 次全量收集）。
   - 修复：`Engine.ts:1727` 复用单份快照（与 `runReactionsForSource` 一致）。**`engine.init`（扇出 1→100）2.75ms → 665µs，约 4.1 倍提升**。
   - 103 个单测全部通过。

3. **`useSyncExternalStore` 缺少 `getServerSnapshot`（SSR Bug，已修复）**
   - `react/NexusField.tsx:24` 只传 2 参，React 19 SSR 直接抛错「Missing getServerSnapshot」，会退回客户端渲染，影响 Next.js 等 SSR 场景。
   - 修复：补第三参 `() => engine.getFieldVersion(dataPath)`。`NexusForm.tsx` 原本已带，无需改。

4. **UI 包未声明 `@nexus/form-engine-react` 依赖**
   - `ui/src/widgets/_shared.tsx` import 了 react 包，但 `packages/ui/package.json` 未声明，已补 `devDependencies`。

5. **构建把 workspace 依赖内联进 dist（打包架构问题）**
   - vite 配置把 `@nexus/form-engine*` alias 到 src，`external` 对已 alias 的 id 失效，导致每个包的 dist 内联一份 core/react 源码。跨包共享 React Context 时会出现「双实例」→ `[NexusField] Must be used within <NexusFormProvider>`。
   - 本次基准通过「三包全部 alias 到 src」规避；建议单独处理（外部化 workspace 依赖），否则直接消费构建产物时存在 context 分裂风险。

6. **withFormItem 把 `dataPath`/`dependValues` 透传到 DOM（小问题）**
   - 渲染时 React 警告「does not recognize the dataPath prop」。`_shared.tsx` 的 WidgetProps 含索引签名 `[key: string]: unknown`，透传未剥除内部 props。

## 五、后续优化建议（按性价比排序）

| 优先级 | 建议 | 预期收益 |
| :--- | :--- | :--- |
| P0 | arrayOperation 增量更新项状态：push/remove 只重建受影响 index 的 item 子状态（`syncArrayItemStates` 改为增量），构建 N 项列表由 O(N²) 降为 O(N) | push 从 ~1ms 降至 ~50µs 量级 |
| P1 | 实现 `requiredOn` 等别名（补 `REACTION_EXPR_FIELDS` + `BaseSchemaNode` 类型），避免 Schema 静默失效 | 协议完备性 |
| P1 | 外部化 workspace 依赖，消除 dist 内联导致的 context 双实例 | 构建产物可被直接消费 |
| P2 | validate() 全量 200 字段约 10ms，超大表单（1000+ 字段）建议按需/分片校验 | 大表单提交延迟 |
| P2 | withFormItem 透传时剥除 `dataPath/dependValues/...` 内部 props | 消除 React warning |
