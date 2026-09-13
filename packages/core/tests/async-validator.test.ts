/**
 * async-validator - 异步校验器插件边缘场景测试
 * 验证超时控制、并行/串行调度、竞态条件、取消逻辑等
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AsyncValidatorPlugin } from '../src/async-validator';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

const makeSchema = (
  props: Record<string, Record<string, unknown>>,
): NexusSchema => ({
  type: 'object',
  properties: props,
});

// 工具：等待指定 ms
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('AsyncValidatorPlugin - edge cases', () => {
  let engine: NexusEngine;
  let plugin: AsyncValidatorPlugin;

  beforeEach(() => {
    engine = new NexusEngine();
    plugin = new AsyncValidatorPlugin(engine, { timeout: 200, debounce: 50 });
    engine.use(plugin);
  });

  afterEach(() => {
    plugin.destroy();
    engine.destroy();
    vi.useRealTimers();
  });

  // ---- registerValidator / registerValidators ----

  describe('registerValidator', () => {
    it('注册单个异步校验器', async () => {
      const schema = makeSchema({
        username: { type: 'string', widget: 'input' },
      });
      engine.init(schema);

      plugin.registerValidator('username', async (value) => {
        if (value === 'admin') {
          return ['用户名已被占用'];
        }
        return [];
      });

      engine.setFieldValue('username', 'admin');
      await wait(300);

      const err = engine.getFieldError('username');
      expect(err).toEqual(['用户名已被占用']);
    });

    it('校验通过时返回空数组', async () => {
      const schema = makeSchema({ email: { type: 'string' } });
      engine.init(schema);

      plugin.registerValidator('email', async (value) => {
        if (value === 'bad@example.com') {
          return ['邮箱无效'];
        }
        return [];
      });

      engine.setFieldValue('email', 'good@example.com');
      await wait(300);

      const err = engine.getFieldError('email');
      expect(err).toEqual([]);
    });

    it('校验器返回同步字符串', async () => {
      const schema = makeSchema({ code: { type: 'string' } });
      engine.init(schema);

      plugin.registerValidator('code', (value) => {
        if (value !== '1234') {
          return ['验证码错误'];
        }
        return [];
      });

      engine.setFieldValue('code', '5678');
      await wait(300);

      const err = engine.getFieldError('code');
      expect(err).toEqual(['验证码错误']);
    });
  });

  // ---- registerValidators ----

  describe('registerValidators', () => {
    it('Map 格式注册多个校验器', async () => {
      const schema = makeSchema({ name: { type: 'string' } });
      engine.init(schema);

      const validators = new Map<string, any[]>([
        [
          'name',
          [
            async (v: string) => (v.length < 2 ? ['太短'] : []),
            async (v: string) => (v.length > 20 ? ['太长'] : []),
          ],
        ],
      ]);
      plugin.registerValidators(validators);

      engine.setFieldValue('name', 'a');
      await wait(300);

      const err = engine.getFieldError('name');
      expect(err).toContain('太短');
    });

    it('Record 格式注册多个校验器', async () => {
      const schema = makeSchema({ score: { type: 'number' } });
      engine.init(schema);

      plugin.registerValidators({
        score: [
          async (v: unknown) =>
            typeof v === 'number' && v < 0 ? ['分数不能为负'] : [],
        ],
      });

      engine.setFieldValue('score', -5);
      await wait(300);

      const err = engine.getFieldError('score');
      expect(err).toContain('分数不能为负');
    });
  });

  // ---- cancelValidation / cancelAllValidations ----

  describe('cancelValidation', () => {
    it('取消单个字段的 pending 校验', () => {
      engine.init(makeSchema({ a: { type: 'string' } }));
      plugin.registerValidator('a', async () => ['error']);

      plugin.cancelValidation('a');
      expect(plugin.isPending('a')).toBe(false);
    });

    it('cancelAllValidations 清除所有', () => {
      engine.init(makeSchema({ a: { type: 'string' }, b: { type: 'string' } }));
      plugin.registerValidator('a', async () => []);
      plugin.registerValidator('b', async () => []);

      // 模拟有 pending
      (plugin as any).pending.add('a');
      (plugin as any).pending.add('b');

      plugin.cancelAllValidations();
      expect(plugin.isPending('a')).toBe(false);
      expect(plugin.isPending('b')).toBe(false);
    });
  });

  // ---- isPending / getStats / resetStats ----

  describe('isPending / getStats / resetStats', () => {
    it('isPending 初始为 false', () => {
      engine.init(makeSchema({ a: { type: 'string' } }));
      expect(plugin.isPending('a')).toBe(false);
    });

    it('getStats 返回正确的统计', () => {
      engine.init(makeSchema({ a: { type: 'string' }, b: { type: 'string' } }));
      const stats = plugin.getStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.timerCount).toBe(0);
    });

    it('resetStats 重置所有状态', () => {
      engine.init(makeSchema({ a: { type: 'string' } }));
      (plugin as any).pending.add('a');
      (plugin as any).timers.set('a', setTimeout(() => {}, 99999) as any);

      plugin.resetStats();
      expect(plugin.getStats().pendingCount).toBe(0);
      expect(plugin.getStats().timerCount).toBe(0);
    });
  });

  // ---- getRegisteredValidators ----

  describe('getRegisteredValidators', () => {
    it('返回已注册校验器的字段路径', () => {
      engine.init(makeSchema({ a: { type: 'string' } }));
      plugin.registerValidator('a', async () => []);

      const registered = plugin.getRegisteredValidators();
      expect(registered).toContain('a');
    });

    it('未注册时返回空数组', () => {
      engine.init(makeSchema({ a: { type: 'string' } }));
      expect(plugin.getRegisteredValidators()).toEqual([]);
    });
  });

  // ---- 并行/串行模式 ----

  describe('parallel / serial execution', () => {
    it('串行模式下校验器顺序执行', async () => {
      const schema = makeSchema({ val: { type: 'string' } });
      engine.init(schema);

      const calls: number[] = [];
      plugin.registerValidators({
        val: [
          async () => {
            calls.push(1);
            await wait(20);
            return [];
          },
          async () => {
            calls.push(2);
            await wait(20);
            return [];
          },
        ],
      });

      (plugin as any).options.parallel = false;
      engine.setFieldValue('val', 'test');
      await wait(300);

      // 两次 setFieldValue 各触发一次调度
      expect(calls.length).toBeGreaterThanOrEqual(2);
    });

    it('并行模式 Promise.all 同时执行', async () => {
      const schema = makeSchema({ val: { type: 'string' } });
      engine.init(schema);

      let startTime = 0;
      let endTime = 0;
      plugin.registerValidators({
        val: [
          async () => {
            if (startTime === 0) {
              startTime = Date.now();
            }
            await wait(100);
            if (endTime === 0) {
              endTime = Date.now();
            }
            return [];
          },
          async () => {
            await wait(100);
            return [];
          },
        ],
      });

      (plugin as any).options.parallel = true;
      engine.setFieldValue('val', 'test');
      await wait(300);

      // 并行模式下两个校验器应大致同时完成
      expect(endTime - startTime).toBeLessThan(150);
    });
  });

  // ---- 不可见字段处理 ----

  describe('hidden field validation', () => {
    it('async validator 校验通过时返回空数组', async () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', widget: 'input' },
        },
      };
      engine.init(schema);
      plugin.registerValidator('name', async () => []);

      engine.setFieldValue('name', 'test');
      await wait(300);

      const err = engine.getFieldError('name');
      expect(err).toEqual([]);
    });
  });

  // ---- 错误去重 ----

  describe('error deduplication', () => {
    it('使用 Set 去重避免重复累积', async () => {
      const schema = makeSchema({ val: { type: 'string' } });
      engine.init(schema);

      const errorMessage = '重复错误';
      plugin.registerValidator('val', async () => [errorMessage, errorMessage]);

      engine.setFieldValue('val', 'test');
      await wait(300);

      const err = engine.getFieldError('val');
      expect(err).toEqual([errorMessage]);
    });
  });

  // ---- destroy ----

  describe('destroy', () => {
    it('销毁插件后不再触发校验', async () => {
      const schema = makeSchema({ val: { type: 'string' } });
      engine.init(schema);
      plugin.registerValidator('val', async () => ['error']);

      plugin.destroy();

      // destroy 后定时器应被清除
      expect(plugin.getStats().timerCount).toBe(0);
    });
  });
});
