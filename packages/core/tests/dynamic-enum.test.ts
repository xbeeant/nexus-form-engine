/**
 * 依赖驱动的动态 enum（P2-C，ProForm / x-render 对齐）
 *
 * `enum` / `enumNames` 声明为 `{{ }}` 表达式时，自动转 `_autoExpr` reaction，
 * 经依赖图按 `$deps` 动态重算选项（写入 meta.enum / meta.enumNames）。
 *
 * 覆盖：
 * 1. 表达式 enum 依赖声明字段，init 时同步求值
 * 2. 依赖字段变化 → 选项动态切换（含 enumNames 文案联动）
 * 3. formData 形式引用依赖（不依赖显式 dependencies 声明）
 * 4. 静态 enum（数组）不受影响，不生成 reaction
 * 5. 动态 enum 不改变字段值 / 数据收集
 * 6. 声明式 reaction fulfill.state.enum 动态切换
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('动态 enum（依赖驱动）', () => {
  it('表达式 enum：init 时同步求值，写入 meta.enum', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        country: { type: 'string', widget: 'select', default: 'CN' },
        city: {
          type: 'string',
          widget: 'select',
          enum: "{{ $deps[0] === 'CN' ? ['北京', '上海'] : ['New York', 'LA'] }}",
          dependencies: ['country'],
        },
      },
    });
    expect(engine.getFieldState('city')!.meta.enum).toEqual(['北京', '上海']);

    engine.setFieldValue('country', 'US');
    expect(engine.getFieldState('city')!.meta.enum).toEqual(['New York', 'LA']);
  });

  it('enum + enumNames 联动：文案随依赖切换', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        region: { type: 'string', widget: 'select', default: 'us' },
        country: {
          type: 'string',
          widget: 'select',
          enum: "{{ $deps[0] === 'us' ? ['us', 'cn'] : ['de', 'fr'] }}",
          enumNames:
            "{{ $deps[0] === 'us' ? ['America', 'China'] : ['Germany', 'France'] }}",
          dependencies: ['region'],
        },
      },
    });
    const state0 = engine.getFieldState('country')!;
    expect(state0.meta.enum).toEqual(['us', 'cn']);
    expect(state0.meta.enumNames).toEqual(['America', 'China']);

    engine.setFieldValue('region', 'eu');
    const state1 = engine.getFieldState('country')!;
    expect(state1.meta.enum).toEqual(['de', 'fr']);
    expect(state1.meta.enumNames).toEqual(['Germany', 'France']);
  });

  it('formData 形式引用：不依赖显式 dependencies 声明', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        level: { type: 'string', widget: 'select', default: 'basic' },
        plan: {
          type: 'string',
          widget: 'select',
          enum: "{{ formData.level === 'pro' ? ['p1', 'p2'] : ['b1'] }}",
        },
      },
    });
    expect(engine.getFieldState('plan')!.meta.enum).toEqual(['b1']);

    engine.setFieldValue('level', 'pro');
    expect(engine.getFieldState('plan')!.meta.enum).toEqual(['p1', 'p2']);
  });

  it('静态 enum（数组）不生成动态 reaction，选项保持不变', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'select', enum: ['x1', 'x2'] },
      },
    });
    const state = engine.getFieldState('a')!;
    expect(state.meta.enum).toEqual(['x1', 'x2']);
    // 静态数组不触发 _autoExpr reaction（无 _autoExpr 标记）
    expect(state.reactions?.some((r) => r._autoExpr)).toBe(false);
  });

  it('动态 enum 不改变字段值 / 数据收集语义', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'select', default: 'a' },
        status: {
          type: 'string',
          widget: 'select',
          default: 's1',
          enum: "{{ formData.mode === 'b' ? ['s2', 's3'] : ['s1'] }}",
        },
      },
    });
    expect(engine.getFormData()).toEqual({ mode: 'a', status: 's1' });

    engine.setFieldValue('mode', 'b');
    // 选项切换，值保留
    expect(engine.getFieldState('status')!.meta.enum).toEqual(['s2', 's3']);
    expect(engine.getFormData().status).toBe('s1');
  });

  it('声明式 reaction fulfill.state.enum 动态切换选项', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', widget: 'select' },
        duration: {
          type: 'string',
          widget: 'select',
          default: '1m',
          reactions: [
            {
              dependencies: ['type'],
              fulfill: {
                state: {
                  enum: "{{ $deps[0] === 'video' ? ['1m', '5m', '10m'] : ['1m'] }}",
                  enumNames:
                    "{{ $deps[0] === 'video' ? ['1 分钟', '5 分钟', '10 分钟'] : ['1 分钟'] }}",
                },
              },
            },
          ],
        },
      },
    };
    engine.init(schema, { type: 'video' });
    const state0 = engine.getFieldState('duration')!;
    expect(state0.meta.enum).toEqual(['1m', '5m', '10m']);
    expect(state0.meta.enumNames).toEqual(['1 分钟', '5 分钟', '10 分钟']);

    engine.setFieldValue('type', 'image');
    const state1 = engine.getFieldState('duration')!;
    expect(state1.meta.enum).toEqual(['1m']);
    expect(state1.meta.enumNames).toEqual(['1 分钟']);
    // 值保留
    expect(engine.getFormData().duration).toBe('1m');
  });
});
