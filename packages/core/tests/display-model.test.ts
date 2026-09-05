/**
 * display 三态模型（P2-B，formily `display` three-state 对齐）
 *
 * 覆盖：
 * 1. 默认 display='visible'，正常渲染与收集
 * 2. display: 'none' → 不渲染但仍参与数据收集与校验
 * 3. display: 'hidden' → 不渲染且不参与数据收集（等同 hidden:true）
 * 4. 表达式 display（{{ }}）经 _autoExpr reaction 动态联动
 * 5. 声明式 reaction `fulfill.state.display` 动态切换
 * 6. setFieldState / setFieldValue patch 支持 display
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('display 三态', () => {
  it('默认 visible：渲染并收集', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', default: 'x' },
      },
    });
    expect(engine.getFieldState('name')!.display).toBe('visible');
    expect(engine.getFieldState('name')!.visible).toBe(true);
    expect(engine.getFormData()).toEqual({ name: 'x' });
  });

  it("display: 'none' → 不收集？否——值仍保留在 formData，且 visible=true", () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        visible: { type: 'string', widget: 'input', default: 'shown' },
        ghost: {
          type: 'string',
          widget: 'input',
          default: 'hidden-but-kept',
          display: 'none',
        },
      },
    });
    const state = engine.getFieldState('ghost')!;
    // 'none'：仍收集（value 保留在 formData）
    expect(state.display).toBe('none');
    expect(state.visible).toBe(true);
    expect(engine.getFormData()).toEqual({
      visible: 'shown',
      ghost: 'hidden-but-kept',
    });
    expect(engine.getHiddenValues()).toEqual({});
  });

  it("display: 'hidden' → 不收集（等同 hidden:true）", () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        visible: { type: 'string', widget: 'input', default: 'shown' },
        ghost: {
          type: 'string',
          widget: 'input',
          default: 'removed',
          display: 'hidden',
        },
      },
    });
    const state = engine.getFieldState('ghost')!;
    expect(state.display).toBe('hidden');
    expect(state.visible).toBe(false);
    // 不参与 formData 收集
    expect(engine.getFormData()).toEqual({ visible: 'shown' });
    // 进入 hidden 值
    expect(engine.getHiddenValues()).toEqual({ ghost: 'removed' });
  });

  it('display 表达式（{{ }}）经 _autoExpr reaction 动态联动', () => {
    const engine = new NexusEngine();
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'select', default: 'simple' },
        detail: {
          type: 'string',
          widget: 'input',
          default: 'keep',
          display: "{{ $deps[0] === 'advanced' ? 'visible' : 'none' }}",
          dependencies: ['mode'],
        },
      },
    };
    engine.init(schema);
    // 初始 mode='simple' → detail display='none'，但值保留
    expect(engine.getFieldState('detail')!.display).toBe('none');
    expect(engine.getFormData().detail).toBe('keep');

    engine.setFieldValue('mode', 'advanced');
    expect(engine.getFieldState('detail')!.display).toBe('visible');
    expect(engine.getFormData().detail).toBe('keep');
  });

  it('声明式 reaction `fulfill.state.display` 动态切换，值始终保留', () => {
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
                  display: "{{ $deps[0] === 'secret' ? 'visible' : 'none' }}",
                },
              },
            },
          ],
        },
      },
    };
    engine.init(schema, { type: 'secret' });
    // 初始 type='secret' → display visible
    expect(engine.getFieldState('token')!.display).toBe('visible');
    // 值始终保留在 formData（即使后面变 none）
    expect(engine.getFormData().token).toBe('s3cr3t');

    engine.setFieldValue('type', 'public');
    expect(engine.getFieldState('token')!.display).toBe('none');
    expect(engine.getFieldState('token')!.visible).toBe(true);
    // none 仍收集
    expect(engine.getFormData().token).toBe('s3cr3t');
  });

  it('setFieldState patch 支持 display', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', default: 'x' },
      },
    });
    engine.setFieldState('a', { display: 'none' });
    expect(engine.getFieldState('a')!.display).toBe('none');
    expect(engine.getFieldState('a')!.visible).toBe(true);
    expect(engine.getFormData().a).toBe('x');

    engine.setFieldState('a', { display: 'hidden' });
    expect(engine.getFieldState('a')!.visible).toBe(false);
    expect(engine.getFormData().a).toBeUndefined();
  });

  it('hidden:true 隐含 display=hidden，二者等价', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input', default: 'x', hidden: true },
      },
    });
    expect(engine.getFieldState('a')!.display).toBe('hidden');
    expect(engine.getFieldState('a')!.visible).toBe(false);
    expect(engine.getFormData().a).toBeUndefined();
  });
});
