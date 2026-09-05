/**
 * 函数式 reactions（P2-A，formily `x-reactions` as function 对齐）
 *
 * 覆盖：
 * 1. run 函数替代声明式 fulfill/otherwise，依赖字段变化即触发
 * 2. run 上下文：state / deps / formData / getValue / setValue / setState / form
 * 3. setValue 写回目标字段（含实时校验与传播）
 * 4. setState 联动其他字段（visible/required）
 * 5. dependencies 参与依赖图（仅声明依赖的字段变化触发）
 * 6. 跨字段分支联动（复杂计算场景）
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('函数式 reactions（run）', () => {
  it('run 函数随依赖字段变化触发，替代声明式补丁', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', widget: 'select' },
        remark: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['type'],
              run: ({ setState, deps }) => {
                const isOther = deps[0] === 'other';
                setState('remark', {
                  visible: isOther,
                  required: isOther,
                });
              },
            },
          ],
        },
      },
    };

    engine.init(schema);
    expect(engine.getFieldState('remark')!.visible).toBe(false);
    expect(engine.getFieldState('remark')!.required).toBe(false);

    engine.setFieldValue('type', 'other');
    expect(engine.getFieldState('remark')!.visible).toBe(true);
    expect(engine.getFieldState('remark')!.required).toBe(true);

    engine.setFieldValue('type', 'common');
    expect(engine.getFieldState('remark')!.visible).toBe(false);
  });

  it('run 上下文提供 state/deps/formData/getValue/setValue/setState/form', () => {
    const engine = new NexusEngine();
    const captured: Record<string, unknown> = {};
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        base: { type: 'number', widget: 'number', default: 10 },
        total: {
          type: 'number',
          widget: 'number',
          default: 0,
          reactions: [
            {
              dependencies: ['base', 'count'],
              run: (ctx) => {
                captured.propCount = Object.keys(ctx).length;
                captured.statePath = ctx.state.path;
                captured.deps = ctx.deps;
                captured.formData = ctx.formData;
                captured.getValue = ctx.getValue('base');
                const count = (ctx.deps[1] as number) || 1;
                ctx.setValue('total', (ctx.deps[0] as number) * count);
              },
            },
          ],
        },
        count: { type: 'number', widget: 'number', default: 2 },
      },
    };

    engine.init(schema, { base: 10, count: 2 });
    // 初始 reactions 已执行
    expect(engine.getFieldValue('total')).toBe(20);
    expect(captured.statePath).toBe('total');
    expect(captured.getValue).toBe(10);

    engine.setFieldValue('base', 5);
    expect(engine.getFieldValue('total')).toBe(10);

    engine.setFieldValue('count', 4);
    expect(engine.getFieldValue('total')).toBe(20);
  });

  it('setValue 链式传播：sum→double 沿依赖图逐级联动', () => {
    const engine = new NexusEngine();
    const chainSchema: NexusSchema = {
      type: 'object',
      properties: {
        a: { type: 'number', widget: 'number', default: 1 },
        b: { type: 'number', widget: 'number', default: 2 },
        sum: {
          type: 'number',
          widget: 'number',
          default: 0,
          reactions: [
            {
              dependencies: ['a', 'b'],
              run: ({ setValue, deps }) => {
                setValue('sum', (deps[0] as number) + (deps[1] as number));
              },
            },
          ],
        },
        double: {
          type: 'number',
          widget: 'number',
          default: 0,
          reactions: [
            {
              dependencies: ['sum'],
              run: ({ setValue, deps }) => {
                setValue('double', (deps[0] as number) * 2);
              },
            },
          ],
        },
      },
    };

    engine.init(chainSchema);
    // 初始：sum = 1+2 = 3, double = 6
    expect(engine.getFieldValue('sum')).toBe(3);
    expect(engine.getFieldValue('double')).toBe(6);
    // 修改 b → sum=1+3=4 → double=8（链条沿依赖图传播）
    engine.setFieldValue('b', 3);
    expect(engine.getFieldValue('sum')).toBe(4);
    expect(engine.getFieldValue('double')).toBe(8);
  });

  it('dependencies 参与依赖图：仅声明依赖的字段变化触发 run', () => {
    const engine = new NexusEngine();
    const calls: string[] = [];
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input' },
        b: { type: 'string', widget: 'input' },
        target: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['a'], // 只依赖 a
              run: ({ deps, setValue }) => {
                calls.push(String(deps[0]));
                setValue('target', `a=${deps[0]}`);
              },
            },
          ],
        },
      },
    };
    engine.init(schema);
    const initialCalls = calls.length;

    engine.setFieldValue('b', 'bbb'); // 变化 b 不触发
    expect(calls.length).toBe(initialCalls);

    engine.setFieldValue('a', 'aaa'); // 变化 a 触发
    expect(calls.length).toBe(initialCalls + 1);
    expect(engine.getFieldValue('target')).toBe('a=aaa');
  });

  it('run 与声明式 when/fulfill/otherwise 可共存（run 存在时优先）', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'select' },
        target: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['mode'],
              when: "{{ $deps[0] === 'on' }}",
              fulfill: { state: { disabled: true } },
              otherwise: { state: { disabled: false } },
              // run 存在时优先走 run，忽略声明式补丁
              run: ({ deps, setState }) => {
                setState('target', {
                  disabled: deps[0] === 'forceOn',
                  readOnly: deps[0] === 'forceReadonly',
                });
              },
            },
          ],
        },
      },
    };

    engine.init(schema);
    engine.setFieldValue('mode', 'on');
    // run 接管：disabled 由 run 决定（'on' ≠ 'forceOn' → false）
    expect(engine.getFieldState('target')!.disabled).toBe(false);

    engine.setFieldValue('mode', 'forceOn');
    expect(engine.getFieldState('target')!.disabled).toBe(true);
    expect(engine.getFieldState('target')!.readOnly).toBe(false);

    engine.setFieldValue('mode', 'forceReadonly');
    expect(engine.getFieldState('target')!.readOnly).toBe(true);
  });
});
