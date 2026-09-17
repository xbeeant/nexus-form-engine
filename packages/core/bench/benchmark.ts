/**
 * Core 层性能基准（@nexus/form-engine）
 *
 * 运行：bun packages/core/bench/benchmark.ts
 * 导入构建产物（dist），反映真实使用场景。
 */

import type { NexusSchema, RenderTreeNode } from '@nexus/form-engine';
import {
  ArrayOperationsPlugin,
  createExpressionSandbox,
  getNestedValue,
  NexusEngine,
  parse,
  setNestedValue,
} from '@nexus/form-engine';

// ────────────────────────────────────────────────────────────────────────────
// 基准工具
// ────────────────────────────────────────────────────────────────────────────

function stats(times: number[]): {
  min: number;
  median: number;
  mean: number;
  p95: number;
} {
  const sorted = [...times].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const p95 =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return { min: sorted[0], median, mean, p95 };
}

const fmt = (ms: number): string =>
  ms >= 1 ? `${ms.toFixed(2)} ms` : `${(ms * 1000).toFixed(1)} µs`;

/** opsPerIteration：每次迭代包含的操作数，用于归一化 ops/s 与单次耗时 */
function report(
  name: string,
  times: number[],
  opsPerIteration = 1,
  detail?: string,
): void {
  const s = stats(times);
  const perOpMs = s.median / opsPerIteration;
  const opsSec = perOpMs > 0 ? Math.round(1000 / perOpMs) : Infinity;
  console.log(
    `  ${name.padEnd(46)} ${fmt(perOpMs).padStart(12)}  min=${fmt(s.min / opsPerIteration).padStart(10)}  ` +
      `p95=${fmt(s.p95 / opsPerIteration).padStart(10)}  ~${Number.isFinite(opsSec) ? opsSec.toLocaleString() : '∞'} ops/s${detail ? `  ${detail}` : ''}`,
  );
}

/** 通用测量：warmup + N 次采样，支持 async；times 单位为 ms */
async function measure(
  name: string,
  warmup: number,
  iterations: number,
  fn: () => void | Promise<void>,
  opsPerIteration = 1,
  detail?: string,
): Promise<void> {
  for (let i = 0; i < warmup; i++) {
    await fn();
  }
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  report(name, times, opsPerIteration, detail);
}

// ────────────────────────────────────────────────────────────────────────────
// Schema 生成器
// ────────────────────────────────────────────────────────────────────────────

/** 大型表单：N 个字段分布在 4 个 card + 嵌套 object，混合规则 */
function buildLargeSchema(n: number): NexusSchema {
  const properties: Record<string, any> = {};
  const cardNames = ['basic', 'contact', 'address', 'misc'];
  for (let i = 0; i < n; i++) {
    const card = cardNames[i % cardNames.length];
    if (!properties[card]) {
      properties[card] = { type: 'card', title: card, properties: {} };
    }
    const f = `field_${i}`;
    const node: Record<string, any> = {
      type: 'string',
      widget: 'input',
      title: `Field ${i}`,
    };
    if (i % 10 === 0) {
      node.rules = [{ pattern: '^[a-z]+$', message: 'must be lower-case' }];
    }
    if (i % 7 === 0) {
      node.required = true;
    }
    if (i % 3 === 0) {
      node.props = {
        maxLength: 32,
        allowClear: true,
        placeholder: `hint-${i}`,
      };
    }
    (properties[card].properties as Record<string, unknown>)[f] = node;
  }
  properties.user = {
    type: 'object',
    properties: {
      name: { type: 'string', widget: 'input', title: 'Name', required: true },
      age: { type: 'number', widget: 'number', title: 'Age' },
    },
  };
  return { type: 'object', properties };
}

/** 联动扇出：1 个 master + N 个 required 依赖字段 */
function buildFanOutSchema(n: number): NexusSchema {
  const properties: Record<string, any> = {
    master: {
      type: 'string',
      widget: 'radio',
      title: 'Master',
      enum: ['yes', 'no'],
    },
  };
  for (let i = 0; i < n; i++) {
    properties[`dep_${i}`] = {
      type: 'string',
      widget: 'input',
      title: `Dep ${i}`,
      required: `{{ formData.master === 'yes' }}`,
    };
  }
  return { type: 'object', properties };
}

// ────────────────────────────────────────────────────────────────────────────
// 场景 1：Schema 解析（纯 Parser）
// ────────────────────────────────────────────────────────────────────────────
const LARGE_N = 200;
const FANOUT_N = 100;

console.log(
  `\n=== Core 性能基准 (Node ${process.version}, ${navigator.hardwareConcurrency ?? '?'} cores) ===`,
);
console.log(`场景：${LARGE_N} 字段大型表单 / ${FANOUT_N} 字段联动扇出`);

const largeSchema = buildLargeSchema(LARGE_N);
const fanoutSchema = buildFanOutSchema(FANOUT_N);

// parse 200 字段
let _pr: ReturnType<typeof parse>;
await measure('SchemaParser.parse (200 fields, 4 cards)', 5, 50, () => {
  _pr = parse(largeSchema);
});

// 无布局扁平 schema 对照
const flatSchema: NexusSchema = {
  type: 'object',
  properties: { ...largeSchema.properties },
};
await measure('SchemaParser.parse (200 fields, flat)', 5, 50, () => {
  parse(flatSchema);
});

// ────────────────────────────────────────────────────────────────────────────
// 场景 2：Engine.init（解析 + 依赖图 + 状态初始化 + 初始 reactions）
// ────────────────────────────────────────────────────────────────────────────
await measure('engine.init (200 fields)', 5, 50, () => {
  const engine = new NexusEngine();
  engine.init(largeSchema);
});

await measure('engine.init (fanout 1→100)', 5, 50, () => {
  const engine = new NexusEngine();
  engine.init(fanoutSchema);
});

// ────────────────────────────────────────────────────────────────────────────
// 场景 3：字段值操作
// ────────────────────────────────────────────────────────────────────────────
const engine = new NexusEngine();
engine.init(largeSchema);
const single = 'user.name'; // 无依赖、有 required 规则的叶子字段
engine.setFieldValue(single, '');
await measure('setFieldValue (单字段, 含实时校验+通知)', 10, 200, () => {
  engine.setFieldValue(single, 'alice');
  engine.setFieldValue(single, '');
});

const noRule = 'user.age'; // 无规则字段
await measure('setFieldValue (无规则字段)', 10, 500, () => {
  engine.setFieldValue(noRule, 30);
  engine.setFieldValue(noRule, 31);
});

// ────────────────────────────────────────────────────────────────────────────
// 场景 4：联动扇出（reaction O(k) 传播）
// ────────────────────────────────────────────────────────────────────────────
const fanEngine = new NexusEngine();
fanEngine.init(fanoutSchema);
await measure(
  'setFieldValue(master) 联动 100 个 required 字段',
  10,
  100,
  () => {
    fanEngine.setFieldValue('master', 'yes');
    fanEngine.setFieldValue('master', 'no');
  },
  2,
);

// 放大扇出到 500
const fan500 = new NexusEngine();
fan500.init(buildFanOutSchema(500));
await measure(
  'setFieldValue(master) 联动 500 个字段',
  5,
  30,
  () => {
    fan500.setFieldValue('master', 'yes');
    fan500.setFieldValue('master', 'no');
  },
  2,
);

// 依赖图 O(1) 查询
const depGraph = fanEngine.dependencyGraph;
await measure('DependencyGraph.getDependents(master)', 10, 1000, () => {
  depGraph.getDependents('master');
});

// ────────────────────────────────────────────────────────────────────────────
// 场景 5：全量校验 validate()
// ────────────────────────────────────────────────────────────────────────────
await measure('validate() 全量 (200 fields)', 5, 30, async () => {
  await engine.validate();
});

// ────────────────────────────────────────────────────────────────────────────
// 场景 6：数据收集 / 渲染树快照
// ────────────────────────────────────────────────────────────────────────────
await measure('getFormData() (200 fields)', 10, 1000, () => {
  engine.getFormData();
});

let _tree: RenderTreeNode[];
await measure('getRenderTree() 快照 (200 fields)', 10, 1000, () => {
  _tree = engine.getRenderTree();
});

// ────────────────────────────────────────────────────────────────────────────
// 场景 7：订阅与通知（按路径精准订阅）
// ────────────────────────────────────────────────────────────────────────────
{
  const subEngine = new NexusEngine();
  subEngine.init(buildLargeSchema(200));
  let calls = 0;
  for (let i = 0; i < 200; i++) {
    subEngine.subscribeField(`field_${i}`, () => {
      calls++;
    });
  }
  const fieldKeys = Array.from({ length: 200 }, (_, i) => `field_${i}`);
  let iter = 0;
  await measure(
    '批量 setFieldValue×200 (含通知 200 订阅)',
    3,
    20,
    () => {
      const base = iter++ % 2 ? 'v' : 'w';
      for (let i = 0; i < 200; i++) {
        subEngine.setFieldValue(fieldKeys[i], `${base}${i}`);
      }
    },
    200,
  );
  void calls;
}

// ────────────────────────────────────────────────────────────────────────────
// 场景 8：批量 set 与 bind 转换
// ────────────────────────────────────────────────────────────────────────────
{
  const bEngine = new NexusEngine();
  bEngine.init(largeSchema);
  const values: Record<string, unknown> = {};
  for (let i = 0; i < 200; i++) {
    values[`field_${i}`] = `val-${i}`;
  }
  values['user.name'] = 'alice';
  values['user.age'] = 30;
  let iter = 0;
  await measure(
    'setFieldValues (202 键, bind 解析)',
    5,
    50,
    () => {
      const prefix = iter++ % 2 ? 'val' : 'alt';
      for (let i = 0; i < 200; i++) {
        values[`field_${i}`] = `${prefix}-${i}`;
      }
      bEngine.setFieldValues(values);
    },
    202,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 场景 9：数组操作（ArrayOperationsPlugin）
// ────────────────────────────────────────────────────────────────────────────
{
  const arrEngine = new NexusEngine();
  arrEngine.use(new ArrayOperationsPlugin(arrEngine));
  const arrSchema: NexusSchema = {
    type: 'object',
    properties: {
      list: {
        type: 'array',
        widget: 'list',
        items: { type: 'object', properties: { name: { type: 'string' } } },
      },
    },
  };
  arrEngine.init(arrSchema);
  await measure(
    'arrayOperation push (数组重建+项状态重建)',
    3,
    30,
    () => {
      for (let i = 0; i < 50; i++) {
        arrEngine.arrayOperation({
          path: 'list',
          operation: 'push',
          value: { name: `n${i}` },
        });
      }
    },
    50,
  );
  await measure(
    'arrayOperation remove(0)',
    3,
    30,
    () => {
      for (let i = 0; i < 50; i++) {
        arrEngine.arrayOperation({
          path: 'list',
          operation: 'remove',
          index: 0,
        });
      }
    },
    50,
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 场景 10：表达式求值（ExpressionSandbox）
// ────────────────────────────────────────────────────────────────────────────
{
  const sandbox = createExpressionSandbox();
  const ctx = {
    $deps: [2, 3],
    $self: { path: 'a', value: 5 },
    formData: { a: 10, b: 4 },
    rootValue: { a: 10, b: 4 },
    $form: null as unknown,
    $index: 0,
  } as never;
  const expr = 'formData.a + formData.b * 2 + $deps[0]';
  await measure('ExpressionSandbox.evaluate ×1', 10, 2000, () => {
    sandbox.evaluate(expr, ctx);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 场景 11：嵌套路径工具
// ────────────────────────────────────────────────────────────────────────────
{
  const data: Record<string, unknown> = {
    user: { profile: { tags: ['a', 'b'] } },
  };
  await measure('getNestedValue(user.profile.tags)', 10, 2000, () => {
    getNestedValue(data, 'user.profile.tags');
  });
  const mutable: Record<string, unknown> = {};
  await measure('setNestedValue(user.profile.name)', 10, 2000, () => {
    setNestedValue(mutable, 'user.profile.name', 'x');
  });
}

console.log('');
console.log('Core 基准完成.');
