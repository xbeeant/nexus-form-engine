/**
 * hidden 统一隐藏模型
 *
 * 覆盖：
 * 1. 默认 hidden=false，正常渲染与收集
 * 2. hidden: true → 不渲染且不参与数据收集（getHiddenValues 收集）
 * 3. 表达式 hidden（{{ }}）经 _autoExpr reaction 动态联动
 * 4. 声明式 reaction `fulfill.state.hidden` 动态切换
 * 5. setFieldState patch 支持 hidden
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('hidden 统一隐藏模型', () => {
  it('默认 hidden=false：渲染并收集', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', default: 'x' },
      },
    });
    expect(engine.getFieldState('name')!.hidden).toBe(false);
    expect(engine.getFormData()).toEqual({ name: 'x' });
  });

  it('hidden: true → 不收集（值进入 getHiddenValues）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        visible: { type: 'string', widget: 'input', default: 'shown' },
        ghost: {
          type: 'string',
          widget: 'input',
          default: 'removed',
          hidden: true,
        },
      },
    });
    const state = engine.getFieldState('ghost')!;
    expect(state.hidden).toBe(true);
    // 不参与 formData 收集
    expect(engine.getFormData()).toEqual({ visible: 'shown' });
    // 进入 hidden 值
    expect(engine.getHiddenValues()).toEqual({ ghost: 'removed' });
  });

  it('hidden: false 显式声明 → 正常收集', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', default: 'x', hidden: false },
      },
    });
    expect(engine.getFieldState('a')!.hidden).toBe(false);
    expect(engine.getFormData()).toEqual({ a: 'x' });
    expect(engine.getHiddenValues()).toEqual({});
  });

  it('hidden 表达式（{{ }}）经 _autoExpr reaction 动态联动', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'select', default: 'advanced' },
        detail: {
          type: 'string',
          widget: 'input',
          default: 'keep',
          hidden: "{{ $deps[0] === 'advanced' ? false : true }}",
          dependencies: ['mode'],
        },
      },
    };
    engine.init(schema);
    // 初始 mode='advanced' → detail 显示并收集
    expect(engine.getFieldState('detail')!.hidden).toBe(false);
    expect(engine.getFormData().detail).toBe('keep');

    engine.setFieldValue('mode', 'simple');
    expect(engine.getFieldState('detail')!.hidden).toBe(true);
    expect(engine.getFormData().detail).toBeUndefined();
    expect(engine.getHiddenValues().detail).toBe('keep');
  });

  it('声明式 reaction `fulfill.state.hidden` 动态切换', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        type: { type: 'string', widget: 'select' },
        token: {
          type: 'string',
          widget: 'input',
          default: 's3cr3t',
          reactions: [
            {
              dependencies: ['type'],
              fulfill: {
                state: {
                  hidden: "{{ $deps[0] !== 'secret' }}",
                },
              },
            },
          ],
        },
      },
    };
    engine.init(schema, { type: 'secret' });
    // 初始 type='secret' → token 显示并收集
    expect(engine.getFieldState('token')!.hidden).toBe(false);
    expect(engine.getFormData().token).toBe('s3cr3t');

    engine.setFieldValue('type', 'public');
    expect(engine.getFieldState('token')!.hidden).toBe(true);
    expect(engine.getFormData().token).toBeUndefined();
    expect(engine.getHiddenValues().token).toBe('s3cr3t');
  });

  it('setFieldState patch 支持 hidden', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', default: 'x' },
      },
    });
    expect(engine.getFieldState('a')!.hidden).toBe(false);

    engine.setFieldState('a', { hidden: true });
    expect(engine.getFieldState('a')!.hidden).toBe(true);
    expect(engine.getFormData().a).toBeUndefined();
    expect(engine.getHiddenValues().a).toBe('x');

    engine.setFieldState('a', { hidden: false });
    expect(engine.getFieldState('a')!.hidden).toBe(false);
    expect(engine.getFormData().a).toBe('x');
  });
});