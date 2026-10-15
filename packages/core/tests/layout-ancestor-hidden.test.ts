import { beforeEach, describe, expect, it } from 'vitest';
import { NexusEngine } from '../src';
import type { NexusSchema } from '../src/types/schema';

/**
 * 布局容器（Key 不进入数据路径）隐藏时的子树语义：
 * 面板 hidden（表达式 / reaction / setFieldState）→ 子树整体隐藏，
 * 不参与校验与数据收集，并入 getHiddenValues。
 */
describe('布局容器祖先隐藏 → 子树不参与校验', () => {
  function buildSchema(): NexusSchema {
    return {
      type: 'object',
      properties: {
        source: { type: 'string', widget: 'input' },
        wrap: {
          type: 'collapse',
          properties: {
            panel: {
              type: 'collapsePanel',
              title: '需求待承接审视',
              hidden: "{{formData.source != 'ok'}}",
              properties: {
                content: {
                  type: 'string',
                  title: '需求分发建议',
                  required: true,
                },
              },
            },
          },
        },
      },
    } as unknown as NexusSchema;
  }

  let engine: NexusEngine;

  beforeEach(() => {
    engine = new NexusEngine();
    engine.init(buildSchema());
  });

  it('解析期：字段记录祖先布局容器链', () => {
    const state = engine.getFieldState('content');
    expect(state).toBeDefined();
    // 布局 Key 不进入数据路径
    expect(engine.getFieldState('wrap.panel.content')).toBeUndefined();
    // 祖先容器链（由外到内）
    expect(state?.meta.layoutChain).toEqual(['wrap', 'wrap.panel']);
  });

  it('面板隐藏时不校验子树必填', async () => {
    engine.setFieldValue('source', 'no');
    expect(engine.getFieldState('wrap.panel')?.hidden).toBe(true);
    expect(engine.isHidden('content')).toBe(true);

    const errors = await engine.validate();
    expect(errors.has('content')).toBe(false);
    expect(engine.getFieldError('content')).toHaveLength(0);
  });

  it('面板显示时正常校验子树必填', async () => {
    engine.setFieldValue('source', 'ok');
    expect(engine.getFieldState('wrap.panel')?.hidden).toBe(false);
    expect(engine.isHidden('content')).toBe(false);

    const errors = await engine.validate();
    expect(errors.has('content')).toBe(true);
  });

  it('隐藏面板的数据并入 getHiddenValues，不出现在 getFormData', () => {
    engine.setFieldValue('source', 'ok');
    engine.setFieldValue('content', '建议内容');
    expect(engine.getFormData().content).toBe('建议内容');

    // 面板隐藏 → 子树整体隐藏
    engine.setFieldValue('source', 'no');
    expect(engine.getFormData().content).toBeUndefined();
    expect(engine.getHiddenValues().content).toBe('建议内容');
    expect(engine.getAllFormData().content).toBe('建议内容');
  });

  it('面板由可见变隐藏时清理子树陈旧错误', async () => {
    engine.setFieldValue('source', 'ok');
    await engine.validate();
    expect(engine.getFieldError('content').length).toBeGreaterThan(0);

    engine.setFieldValue('source', 'no');
    expect(engine.getFieldError('content')).toHaveLength(0);
  });

  it('多级嵌套布局：任意祖先面板隐藏即跳过校验', async () => {
    const nested = {
      type: 'object',
      properties: {
        card: {
          type: 'card',
          properties: {
            tabs: {
              type: 'tabs',
              properties: {
                pane: {
                  type: 'tabPane',
                  hidden: true,
                  properties: {
                    deep: { type: 'string', required: true },
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as NexusSchema;
    // 注意：静态 hidden 的节点在解析期被过滤，这里用 reaction 动态隐藏
    const dynamic = {
      type: 'object',
      properties: {
        switcher: { type: 'string', widget: 'input' },
        card: {
          type: 'card',
          properties: {
            tabs: {
              type: 'tabs',
              properties: {
                pane: {
                  type: 'tabPane',
                  hidden: "{{formData.switcher != 'on'}}",
                  properties: {
                    deep: { type: 'string', required: true },
                  },
                },
              },
            },
          },
        },
      },
    } as unknown as NexusSchema;

    const e = new NexusEngine();
    e.init(dynamic);
    e.setFieldValue('switcher', 'off');
    expect(e.getFieldState('deep')?.meta.layoutChain).toEqual([
      'card',
      'card.tabs',
      'card.tabs.pane',
    ]);
    expect(e.isHidden('deep')).toBe(true);
    const errors = await e.validate();
    expect(errors.has('deep')).toBe(false);

    // 静态隐藏节点不进入解析（既有隐藏模型）
    const staticEngine = new NexusEngine();
    staticEngine.init(nested);
    expect(staticEngine.getFieldState('deep')).toBeUndefined();
  });
});
