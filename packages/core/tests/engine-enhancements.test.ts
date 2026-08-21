/**
 * 引擎增强功能测试（2026-08 补全计划）
 *
 * 覆盖：
 * 1. 数组操作 minItems/maxItems 约束（push/insert/pop/remove/batch）
 * 2. reloadRemoteData 远程选项重载（定向 / 全局版本语义）
 * 3. validateFirst 校验短路
 * 4. 字段级 tooltip（静态 meta + reaction 动态联动）
 */

import { describe, expect, it, vi } from 'vitest';
import { ArrayOperationsPlugin } from '../src/array-list';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

function makeEngine(schema: NexusSchema): {
  engine: NexusEngine;
  plugin: ArrayOperationsPlugin;
} {
  const engine = new NexusEngine();
  engine.init(schema);
  const plugin = new ArrayOperationsPlugin(engine);
  engine.use(plugin);
  return { engine, plugin };
}

describe('数组操作 minItems/maxItems 约束（rjsf / formily 对齐）', () => {
  const listSchema = (min?: number, max?: number): NexusSchema => ({
    type: 'object',
    properties: {
      items: {
        type: 'array',
        widget: 'list',
        min,
        max,
        items: { type: 'string' },
      },
    },
  });

  it('push 达到 maxItems 后被阻止', () => {
    const { engine, plugin } = makeEngine(listSchema(undefined, 2));
    engine.setFieldValue('items', ['a']);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    plugin.push('items', 'b');
    expect(engine.getFieldValue('items')).toEqual(['a', 'b']);

    const blocked = plugin.push('items', 'c');
    expect(blocked).toBeUndefined();
    expect(engine.getFieldValue('items')).toEqual(['a', 'b']);

    warn.mockRestore();
  });

  it('insert 达到 maxItems 后被阻止', () => {
    const { engine, plugin } = makeEngine(listSchema(undefined, 2));
    engine.setFieldValue('items', ['a', 'b']);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const blocked = plugin.insert('items', 1, 'x');
    expect(blocked).toBeUndefined();
    expect(engine.getFieldValue('items')).toEqual(['a', 'b']);

    warn.mockRestore();
  });

  it('pop / remove 低于 minItems 后被阻止', () => {
    const { engine, plugin } = makeEngine(listSchema(1));
    engine.setFieldValue('items', ['a']);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(plugin.pop('items')).toBeUndefined();
    expect(plugin.remove('items', 0)).toBeUndefined();
    expect(engine.getFieldValue('items')).toEqual(['a']);

    warn.mockRestore();
  });

  it('未配置 min/max 时操作不受限制', () => {
    const { engine, plugin } = makeEngine(listSchema());
    engine.setFieldValue('items', ['a']);
    plugin.push('items', 'b');
    expect(engine.getFieldValue('items')).toEqual(['a', 'b']);
    plugin.pop('items');
    expect(engine.getFieldValue('items')).toEqual(['a']);
  });

  it('batch 遇到约束拦截时中止并返回已生效结果', () => {
    const { engine, plugin } = makeEngine(listSchema(undefined, 2));
    engine.setFieldValue('items', ['a']);

    const result = plugin.batch('items', [
      { operation: 'push', value: 'b' },
      { operation: 'push', value: 'c' },
    ]);
    // 第一个 push 生效后触顶，第二个被拦截，返回第一个生效后的数组
    expect(result).toEqual(['a', 'b']);
    expect(engine.getFieldValue('items')).toEqual(['a', 'b']);
  });
});

describe('reloadRemoteData 远程选项重载（x-render 对齐）', () => {
  it('定向重载：仅目标字段版本 +1，值不变化', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'select' },
        b: { type: 'string', widget: 'input' },
      },
    });
    engine.setFieldValue('a', 'x');

    expect(engine.getRemoteDataVersion('a')).toBe(0);
    expect(engine.getRemoteDataVersion('b')).toBe(0);

    let aCalls = 0;
    let bCalls = 0;
    const unA = engine.subscribeField('a', () => aCalls++);
    const unB = engine.subscribeField('b', () => bCalls++);

    engine.reloadRemoteData('a');
    expect(engine.getRemoteDataVersion('a')).toBe(1);
    expect(engine.getRemoteDataVersion('b')).toBe(0);
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(0);
    // 值不受影响
    expect(engine.getFieldValue('a')).toBe('x');

    unA();
    unB();
  });

  it('全局重载：无参时全部字段版本 +1（回退到全局版本）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'select' },
        b: { type: 'string', widget: 'input' },
      },
    });

    engine.reloadRemoteData();
    expect(engine.getRemoteDataVersion('a')).toBe(1);
    expect(engine.getRemoteDataVersion('b')).toBe(1);

    // 定向重载后该字段版本在全局基础上再 +1
    engine.reloadRemoteData('a');
    expect(engine.getRemoteDataVersion('a')).toBe(2);
    expect(engine.getRemoteDataVersion('b')).toBe(1);
  });
});

describe('validateFirst 校验短路（formily 对齐）', () => {
  it('validateFirst 时首个失败字段即停止，未校验字段不报错', async () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', required: true },
        b: { type: 'string', widget: 'input', required: true },
      },
    });

    const errors = await engine.validate(undefined, { validateFirst: true });
    expect(errors.size).toBe(1);
    // a 报错、b 未校验（无错误状态）
    expect(errors.has('a')).toBe(true);
    expect(errors.has('b')).toBe(false);
    expect(engine.getFieldError('b')).toEqual([]);
  });

  it('不传 validateFirst 时全量校验全部失败字段', async () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', required: true },
        b: { type: 'string', widget: 'input', required: true },
      },
    });

    const errors = await engine.validate();
    expect(errors.size).toBe(2);
    expect(errors.has('a')).toBe(true);
    expect(errors.has('b')).toBe(true);
  });
});

describe('字段级 tooltip（ProForm / Formily 对齐）', () => {
  it('静态 tooltip 进入 FieldState.meta', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        name: {
          type: 'string',
          widget: 'input',
          tooltip: '仅支持中文与字母',
        },
      },
    });
    expect(engine.getFieldState('name')?.meta.tooltip).toBe('仅支持中文与字母');
  });

  it('reaction 的 fulfill.state.tooltip 可动态联动', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'select' },
        code: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['mode'],
              fulfill: {
                state: {
                  tooltip:
                    "{{ $deps[0] === 'vip' ? 'VIP 专属提示' : '普通提示' }}",
                },
              },
            },
          ],
        },
      },
    });

    expect(engine.getFieldState('code')?.meta.tooltip).toBe('普通提示');
    engine.setFieldValue('mode', 'vip');
    expect(engine.getFieldState('code')?.meta.tooltip).toBe('VIP 专属提示');
  });

  it('布局节点（对象容器）也透传 tooltip', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          tooltip: '个人信息分组',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    });
    expect(engine.getFieldState('profile')?.meta.tooltip).toBe('个人信息分组');
  });
});
