/**
 * 表达式求值 → UI widget 的值传递（表达式字符串防泄漏）
 *
 * AGENTS.md/用户要求：涉及 `{{ }}` 表达式计算的值，必须把**计算后的值**传给 widget，
 * 不得把 `{{ }}` 表达式字面量直接透传到 UI 层。
 *
 * 覆盖：
 * 1. schema props.* 直写表达式 → 自动转 reaction，init 求值 + 依赖变化更新
 * 2. placeholder/title/description/extra/tooltip 直写表达式 → 自动求值写 meta
 * 3. 静态文本（非表达式）原样保留，不进 reaction
 * 4. setFieldState 传入 props 表达式 → 求值后合并（runtime 防泄漏）
 * 5. 数组 items 子字段 props 表达式 → 同样求值
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';

describe('表达式求值后传递给 UI widget（防泄漏）', () => {
  it('props.* 直写表达式：init 求值 + 依赖变化更新（widget 收到计算后的值）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        limit: { type: 'number', widget: 'number', default: 10 },
        name: {
          type: 'string',
          widget: 'input',
          props: {
            maxLength: '{{ formData.limit }}',
            placeholder: "{{ formData.limit > 5 ? '长文本' : '短文本' }}",
          },
        },
      },
    });

    const state0 = engine.getFieldState('name')!;
    // 初始：表达式已被求值写入 props，而非保留 "{{ ... }}" 字符串
    // （值类型为 number，天然不是表达式字符串）
    expect(state0.props.maxLength).toBe(10);
    expect(state0.props.placeholder).toBe('长文本');
    expect(typeof state0.props.maxLength).toBe('number');

    engine.setFieldValue('limit', 3);
    const state1 = engine.getFieldState('name')!;
    expect(state1.props.maxLength).toBe(3);
    expect(state1.props.placeholder).toBe('短文本');
    expect(typeof state1.props.maxLength).toBe('number');
  });

  it('placeholder/title/description/extra/tooltip 直写表达式：自动求值写 meta', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'select', default: 'rich' },
        content: {
          type: 'string',
          widget: 'textarea',
          placeholder:
            "{{ formData.mode === 'rich' ? '输入富文本' : '输入纯文本' }}",
          title: "{{ formData.mode === 'rich' ? '富文本标题' : '纯文本标题' }}",
          description:
            "{{ formData.mode === 'rich' ? '富文本描述' : '纯文本描述' }}",
          extra: "{{ formData.mode === 'rich' ? '富文本额外' : '纯文本额外' }}",
          tooltip:
            "{{ formData.mode === 'rich' ? '富文本提示' : '纯文本提示' }}",
        },
      },
    });

    const state0 = engine.getFieldState('content')!;
    expect(state0.meta.placeholder).toBe('输入富文本');
    expect(state0.meta.title).toBe('富文本标题');
    expect(state0.meta.description).toBe('富文本描述');
    expect(state0.meta.extra).toBe('富文本额外');
    expect(state0.meta.tooltip).toBe('富文本提示');
    // widget 消费的透传字段均已求值（meta.schema 保留原始声明属预期，非透传路径）
    expect(state0.meta.title).not.toContain('{{');
    expect(state0.meta.placeholder).not.toContain('{{');
    expect(state0.meta.tooltip).not.toContain('{{');

    engine.setFieldValue('mode', 'plain');
    const state1 = engine.getFieldState('content')!;
    expect(state1.meta.placeholder).toBe('输入纯文本');
    expect(state1.meta.title).toBe('纯文本标题');
    expect(state1.meta.tooltip).toBe('纯文本提示');
  });

  it('静态文本 placeholder/title/props 原样保留，不生成 _autoExpr reaction', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: {
          type: 'string',
          widget: 'input',
          placeholder: '请输入',
          title: '标题',
          props: { maxLength: 20 },
        },
      },
    });

    const state = engine.getFieldState('a')!;
    expect(state.meta.placeholder).toBe('请输入');
    expect(state.meta.title).toBe('标题');
    expect(state.props.maxLength).toBe(20);
    expect(state.reactions?.some((r) => r._autoExpr)).toBe(false);
  });

  it('setFieldState 传入 props 表达式：runtime 求值后合并（防泄漏）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        factor: { type: 'number', widget: 'number', default: 3 },
        cost: { type: 'number', widget: 'number' },
      },
    });

    engine.setFieldState('cost', {
      props: { max: '{{ formData.factor * 100 }}', min: 1 },
    });
    const state = engine.getFieldState('cost')!;
    expect(state.props.max).toBe(300);
    expect(state.props.min).toBe(1);
    expect(typeof state.props.max).toBe('number');
  });

  it('数组 items 子字段 props/placeholder 表达式：同样求值（list item 不会收到字面量）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        checked: { type: 'boolean', widget: 'switch', default: true },
        items: {
          type: 'array',
          widget: 'list',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                widget: 'input',
                placeholder:
                  "{{ formData.checked ? '已启用输入' : '未启用输入' }}",
                props: {
                  maxLength: '{{ formData.checked ? 50 : 20 }}',
                },
              },
            },
          },
        },
      },
    });

    engine.setFieldValue('items', [{ name: 'a' }]);
    const item = engine.getFieldState('items[0].name')!;
    expect(item.meta.placeholder).toBe('已启用输入');
    expect(item.props.maxLength).toBe(50);
    // 透传给 widget 的 props / meta 中不残留表达式字面量
    expect(item.meta.placeholder).not.toContain('{{');
    expect(item.props.maxLength).toBe(50);

    engine.setFieldValue('checked', false);
    const item1 = engine.getFieldState('items[0].name')!;
    expect(item1.meta.placeholder).toBe('未启用输入');
    expect(item1.props.maxLength).toBe(20);
  });

  it('enum 表达式计算结果通过 meta.enum 传递（回归：不泄露表达式给 options）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        type: { type: 'string', widget: 'select', default: 'a' },
        option: {
          type: 'string',
          widget: 'select',
          enum: "{{ $deps[0] === 'a' ? ['x', 'y'] : ['z'] }}",
          dependencies: ['type'],
        },
      },
    });

    const state = engine.getFieldState('option')!;
    expect(state.meta.enum).toEqual(['x', 'y']);
    expect(Array.isArray(state.meta.enum)).toBe(true);
  });
});
