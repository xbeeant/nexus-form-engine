/**
 * ArrayList - 数组操作插件边缘场景测试
 * 验证 remove/move 边界条件、batch 中断逻辑、maxItems 约束等
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ArrayOperationsPlugin } from '../src/array-list';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

const makeSchema = (itemsSchema: Record<string, unknown>): NexusSchema => ({
  type: 'object',
  properties: { items: itemsSchema },
});

describe('ArrayOperationsPlugin - edge cases', () => {
  let engine: NexusEngine;
  let plugin: ArrayOperationsPlugin;

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    engine.destroy();
  });

  // ---- remove 边界条件 ----

  describe('remove', () => {
    it('移除负数索引返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.remove('items', -1);
      expect(result).toBeUndefined();
      expect(engine.getFieldValue('items')).toEqual(['a', 'b', 'c']);
    });

    it('移除超出长度的索引返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.remove('items', 5);
      expect(result).toBeUndefined();
    });

    it('移除最后项正常', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.remove('items', 2);
      expect(result).toEqual(['a', 'b']);
    });

    it('minItems 约束阻止移除', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      // 设置 minItems: 2
      const state = engine.getFieldState('items');
      if (state) {
        state.meta.min = 2;
      }
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.remove('items', 0);
      expect(result).toBeUndefined();
      expect(engine.getFieldValue('items')).toEqual(['a', 'b']);
    });
  });

  // ---- move 边界条件 ----

  describe('move', () => {
    it('index 为负数返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.move('items', -1, 2);
      expect(result).toBeUndefined();
    });

    it('toIndex 超出长度返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.move('items', 0, 10);
      expect(result).toBeUndefined();
    });

    it('move 到相同位置返回原数组', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.move('items', 1, 1);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('move 正常移动', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c', 'd']);

      const result = plugin.move('items', 0, 3);
      expect(result).toEqual(['b', 'c', 'd', 'a']);
    });

    it('move 向前移动', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.move('items', 2, 0);
      expect(result).toEqual(['c', 'a', 'b']);
    });
  });

  // ---- batch 中断逻辑 ----

  describe('batch', () => {
    it('push 达到 maxItems 后中止剩余操作', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      // 设置 maxItems: 3
      const state = engine.getFieldState('items');
      if (state) {
        state.meta.max = 3;
      }
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.batch('items', [
        { operation: 'push', value: 'c' },
        { operation: 'push', value: 'd' },
        { operation: 'push', value: 'e' },
      ]);

      // 第三次 push 被 maxItems 拦截，之前生效的返回
      expect(result).toEqual(['a', 'b', 'c']);
      expect(engine.getFieldValue('items')).toEqual(['a', 'b', 'c']);
    });

    it('pop 达到 minItems 后中止剩余操作', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      // 设置 minItems: 2
      const state = engine.getFieldState('items');
      if (state) {
        state.meta.min = 2;
      }
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.batch('items', [
        { operation: 'pop' },
        { operation: 'pop' },
      ]);

      expect(result).toEqual(['a', 'b']);
    });

    it('空操作数组返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.batch('items', []);
      expect(result).toBeUndefined();
    });

    it('所有操作都成功时返回最终数组', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a']);

      const result = plugin.batch('items', [
        { operation: 'push', value: 'b' },
        { operation: 'push', value: 'c' },
      ]);

      expect(result).toEqual(['a', 'b', 'c']);
    });
  });

  // ---- insert 边界条件 ----

  describe('insert', () => {
    it('index 超出长度（> length）返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.insert('items', 5, 'x');
      expect(result).toBeUndefined();
    });

    it('insert 到末尾（index === length）正常', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.insert('items', 2, 'c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('insert 到开头正常', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['b', 'c']);

      const result = plugin.insert('items', 0, 'a');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('insert 达到 maxItems 被阻止', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      const state = engine.getFieldState('items');
      if (state) {
        state.meta.max = 2;
      }
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.insert('items', 1, 'x');
      expect(result).toBeUndefined();
    });
  });

  // ---- push 边界条件 ----

  describe('push', () => {
    it('未传 value 返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a']);

      const result = plugin.apply('items', {
        operation: 'push',
        value: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('push 达到 maxItems 被阻止', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      const state = engine.getFieldState('items');
      if (state) {
        state.meta.max = 2;
      }
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.push('items', 'c');
      expect(result).toBeUndefined();
    });

    it('push value 为 null 允许', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a']);

      const result = plugin.push('items', null);
      expect(result).toEqual(['a', null]);
    });
  });

  // ---- pop 边界条件 ----

  describe('pop', () => {
    it('pop 达到 minItems 被阻止', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      const state = engine.getFieldState('items');
      if (state) {
        state.meta.min = 2;
      }
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.pop('items');
      expect(result).toBeUndefined();
    });

    it('pop 一项正常', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.pop('items');
      expect(result).toEqual(['a', 'b']);
    });
  });

  // ---- update 边界条件 ----

  describe('update', () => {
    it('未传 value 返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.apply('items', {
        operation: 'update',
        index: 0,
        value: undefined,
      });
      expect(result).toBeUndefined();
    });

    it('update 到对象项正常工作', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      };
      engine.init(schema);
      engine.setFieldValue('items', [{ name: 'a' }, { name: 'b' }]);

      const result = plugin.update('items', 0, { name: 'updated' });
      expect(result).toEqual([{ name: 'updated' }, { name: 'b' }]);
    });
  });

  // ---- copy ----

  describe('copy', () => {
    it('负数索引返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.copy('items', -1);
      expect(result).toBeUndefined();
    });

    it('index 超出长度返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.copy('items', 5);
      expect(result).toBeUndefined();
    });

    it('复制基本类型（不深拷贝）', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b']);

      const result = plugin.copy('items', 0);
      expect(result).toEqual(['a', 'a', 'b']);
    });

    it('复制对象项进行深拷贝', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'object', properties: { name: { type: 'string' } } },
          },
        },
      };
      engine.init(schema);
      engine.setFieldValue('items', [{ name: 'a' }]);

      const result = plugin.copy('items', 0);
      expect(result).toEqual([{ name: 'a' }, { name: 'a' }]);
      // 验证深拷贝：修改副本不影响原项
      result![1].name = 'modified';
      expect(result![0].name).toBe('a');
    });

    it('copy 到最后位置', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a', 'b', 'c']);

      const result = plugin.copy('items', 2);
      expect(result).toEqual(['a', 'b', 'c', 'c']);
    });
  });

  // ---- pushAll ----

  describe('pushAll', () => {
    it('批量 push 多个值', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a']);

      const result = plugin.pushAll('items', ['b', 'c', 'd']);
      expect(result).toEqual(['a', 'b', 'c', 'd']);
    });

    it('空数组 pushAll 返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a']);

      const result = plugin.pushAll('items', []);
      expect(result).toBeUndefined();
    });
  });

  // ---- 非数组字段 ----

  describe('非数组字段操作', () => {
    it('字符串字段返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(makeSchema({ type: 'string', widget: 'input' }));
      engine.setFieldValue('items', 'hello');

      const result = plugin.push('items', 'world');
      expect(result).toBeUndefined();
    });

    it('字段值为空数组时 push 成功', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string', widget: 'input' },
          },
        },
      };
      engine.init(schema);
      // 字段初始化时值为 []，push 成功
      const result = plugin.push('items', 'a');
      expect(result).toEqual(['a']);
    });
  });

  // ---- 未知操作 ----

  describe('未知操作', () => {
    it('unknown operation 返回 undefined', () => {
      engine = new NexusEngine();
      plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      engine.init(
        makeSchema({
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        }),
      );
      engine.setFieldValue('items', ['a']);

      // @ts-expect-error testing invalid operation
      const result = plugin.apply('items', { operation: 'unknown' });
      expect(result).toBeUndefined();
    });
  });
});
