/**
 * UI 层性能基准（@nexus/form-engine-ui 真实 antd 渲染）
 *
 * 通过 vite 打包（alias 到 src，单一模块实例），产物交给 bun 执行。
 * 构建：vite build -c bench/vite.bench.config.ts
 * 运行：bun packages/ui/bench/dist/bench.js
 */

import { NexusEngine } from '@nexus/form-engine';
import { FormController, NexusForm } from '@nexus/form-engine-react';
import { antdPreset } from '@nexus/form-engine-ui';
import { Form, Input } from 'antd';
import React from 'react';
import { renderToString } from 'react-dom/server';

// ── 工具 ──────────────────────────────────────────────────────────────────
const fmt = (ms: number): string =>
  ms >= 1 ? `${ms.toFixed(2)} ms` : `${(ms * 1000).toFixed(1)} µs`;

function stats(times: number[]) {
  const s = [...times].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return {
    min: s[0],
    median: s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2,
    p95: s[Math.min(s.length - 1, Math.floor(s.length * 0.95))],
  };
}

function report(name: string, times: number[], extra = ''): void {
  const s = stats(times);
  console.log(
    `  ${name.padEnd(48)} ${fmt(s.median).padStart(12)}  min=${fmt(s.min).padStart(10)}  p95=${fmt(s.p95).padStart(10)}${extra ? `  ${extra}` : ''}`,
  );
}

async function measure(
  name: string,
  warmup: number,
  iterations: number,
  fn: () => unknown,
  extra = '',
): Promise<void> {
  for (let i = 0; i < warmup; i++) {
    fn();
  }
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  report(name, times, extra);
}

// ── Schema 生成 ──────────────────────────────────────────────────────────
function buildSchema(n: number, useLayout: boolean) {
  const widgetCycle = [
    'input',
    'select',
    'number',
    'switch',
    'radio',
    'textarea',
    'password',
    'slider',
  ];
  const properties: Record<string, any> = {};
  if (useLayout) {
    for (let c = 0; c < Math.ceil(n / 10); c++) {
      const cardProps: Record<string, any> = {};
      for (let i = c * 10; i < Math.min(n, (c + 1) * 10); i++) {
        const w = widgetCycle[i % widgetCycle.length];
        cardProps[`f${i}`] = {
          type: w === 'number' || w === 'slider' ? 'number' : 'string',
          widget: w,
          title: `Field ${i}`,
          ...(w === 'select'
            ? { enum: ['a', 'b', 'c'], enumNames: ['A', 'B', 'C'] }
            : {}),
          ...(w === 'radio' ? { enum: ['x', 'y'], enumNames: ['X', 'Y'] } : {}),
        };
      }
      properties[`card_${c}`] = {
        type: 'card',
        title: `Card ${c}`,
        properties: cardProps,
      };
    }
  } else {
    for (let i = 0; i < n; i++) {
      const w = widgetCycle[i % widgetCycle.length];
      properties[`f${i}`] = {
        type: w === 'number' || w === 'slider' ? 'number' : 'string',
        widget: w,
        title: `Field ${i}`,
        ...(w === 'select'
          ? { enum: ['a', 'b', 'c'], enumNames: ['A', 'B', 'C'] }
          : {}),
        ...(w === 'radio' ? { enum: ['x', 'y'], enumNames: ['X', 'Y'] } : {}),
      };
    }
  }
  return { type: 'object', properties };
}

// ── 基准 ─────────────────────────────────────────────────────────────────
const N = 20;
const M = 100;
const schema20 = buildSchema(N, false) as any;
const schema100 = buildSchema(M, false) as any;
const schema100Card = buildSchema(M, true) as any;

console.log(
  `\n=== UI 性能基准（antd ${require('antd/package.json').version} 真实渲染, SSR renderToString）===`,
);
console.log(`场景：${N} / ${M} 字段（8 种 widget 轮换）+ ${M} 字段 card 布局`);

// 引擎 + 控制器（引擎预 init，模拟 SSR/首屏）
function makeEngine(schema: any) {
  const engine = new NexusEngine();
  engine.use(antdPreset);
  engine.init(schema);
  return engine;
}

// ── 基线：原生 antd Form（等量字段）──
function rawForm(schema: any) {
  return React.createElement(
    Form,
    { layout: 'vertical' },
    Object.values(schema.properties).map((node: any, i: number) => {
      if (node.type === 'card') {
        return React.createElement(
          Form.Item,
          { key: `c${i}`, label: node.title },
          Object.entries(node.properties).map(
            ([k, f]: [string, any], _j: number) =>
              React.createElement(
                Form.Item,
                { key: k, label: f.title },
                React.createElement(Input, { placeholder: f.title }),
              ),
          ),
        );
      }
      return React.createElement(
        Form.Item,
        { key: `f${i}`, label: node.title },
        React.createElement(Input, { placeholder: node.title }),
      );
    }),
  );
}

// 1. 原生 antd 基线
const raw20 = rawForm(schema20);
const raw100 = rawForm(schema100);
await measure(
  `原生 antd Form ${N} 字段 (Input)`,
  5,
  100,
  () => {
    renderToString(raw20);
  },
  `HTML ${renderToString(raw20).length} B`,
);

// 2. Nexus 全管线（NexusForm + NexusField + withFormItem + 引擎订阅）
{
  const e20 = makeEngine(schema20);
  const form20 = new FormController(e20);
  const tree20 = React.createElement(NexusForm, {
    form: form20,
    schema: schema20,
  });
  await measure(
    `NexusForm 全管线 ${N} 字段`,
    5,
    100,
    () => {
      renderToString(tree20);
    },
    `HTML ${renderToString(tree20).length} B`,
  );
}

// 3. 100 字段：原生 vs Nexus
{
  const e100 = makeEngine(schema100);
  const form100 = new FormController(e100);
  const tree100 = React.createElement(NexusForm, {
    form: form100,
    schema: schema100,
  });
  await measure(`NexusForm 全管线 ${M} 字段`, 3, 30, () => {
    renderToString(tree100);
  });
  await measure(`原生 antd Form ${M} 字段 (Input)`, 3, 30, () => {
    renderToString(raw100);
  });
}

// 4. 100 字段 card 布局（布局容器 + 嵌套）
{
  const eCard = makeEngine(schema100Card);
  const formCard = new FormController(eCard);
  const treeCard = React.createElement(NexusForm, {
    form: formCard,
    schema: schema100Card,
  });
  await measure(`NexusForm ${M} 字段 (10 张 card 布局)`, 3, 30, () => {
    renderToString(treeCard);
  });
}

// 5. 值变更后重渲染（近似更新路径的渲染成本）
{
  const e100 = makeEngine(schema100);
  const form100 = new FormController(e100);
  const tree100 = React.createElement(NexusForm, {
    form: form100,
    schema: schema100,
  });
  renderToString(tree100); // 首次渲染建立基线
  let toggle = 0;
  await measure(`NexusForm ${M} 字段 值变更后重渲染`, 3, 30, () => {
    const values: Record<string, unknown> = {};
    for (let i = 0; i < M; i++) {
      values[`f${i}`] = `${toggle}${i}`;
    }
    e100.setFieldValues(values);
    toggle ^= 1;
    renderToString(tree100);
  });
}

console.log('');
console.log('UI 基准完成.');
