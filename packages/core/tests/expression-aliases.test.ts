import { describe, expect, it } from 'vitest';

import { NexusEngine } from '../src/Engine';

describe('简单联动正向别名（requiredOn/disabledOn/readOnlyOn/visibleOn）', () => {
  it('requiredOn：条件成立 → 字段必填，且依赖边进入依赖图', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        country: { type: 'string', widget: 'input' },
        province: {
          type: 'string',
          widget: 'input',
          requiredOn: "{{ formData.country === 'CN' }}",
        },
      },
    } as never);

    expect(engine.getFieldState('province').required).toBe(false);
    expect(engine.getDependencies('province')).toEqual(new Set(['country']));
    expect(engine.getDependents('country')).toEqual(new Set(['province']));

    engine.setFieldValue('country', 'CN');
    expect(engine.getFieldState('province').required).toBe(true);

    engine.setFieldValue('country', 'US');
    expect(engine.getFieldState('province').required).toBe(false);
  });

  it('disabledOn：条件成立 → 字段禁用', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        mode: { type: 'string', widget: 'input' },
        field: {
          type: 'string',
          widget: 'input',
          disabledOn: "{{ formData.mode === 'locked' }}",
        },
      },
    } as never);

    expect(engine.getFieldState('field').disabled).toBe(false);
    engine.setFieldValue('mode', 'locked');
    expect(engine.getFieldState('field').disabled).toBe(true);
  });

  it('readOnlyOn：条件成立 → 字段只读', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        stage: { type: 'string', widget: 'input' },
        note: {
          type: 'string',
          widget: 'input',
          readOnlyOn: "{{ formData.stage === 'done' }}",
        },
      },
    } as never);

    expect(engine.getFieldState('note').readOnly).toBe(false);
    engine.setFieldValue('stage', 'done');
    expect(engine.getFieldState('note').readOnly).toBe(true);
  });

  it('visibleOn：条件成立 → 可见（表达式取反映射到 hidden）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        show: { type: 'string', widget: 'input' },
        target: {
          type: 'string',
          widget: 'input',
          visibleOn: "{{ formData.show === 'yes' }}",
        },
      },
    } as never);

    // 初始：表达式为 false → hidden = !(false) = true → 隐藏
    expect(engine.getFieldState('target').visible).toBe(false);

    engine.setFieldValue('show', 'yes');
    expect(engine.getFieldState('target').visible).toBe(true);

    engine.setFieldValue('show', 'no');
    expect(engine.getFieldState('target').visible).toBe(false);
  });

  it('别名与负向同用同一字段时互不干扰（静态布尔值不生成 reaction）', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        flag: { type: 'string', widget: 'input' },
        a: {
          type: 'string',
          widget: 'input',
          requiredOn: "{{ formData.flag === 'x' }}",
        },
        b: { type: 'string', widget: 'input', required: true },
        c: { type: 'string', widget: 'input', hidden: true },
      },
    } as never);

    // 静态布尔值：初始状态直接应用，不生成 _autoExpr reaction
    expect(engine.getFieldState('b').required).toBe(true);
    expect(engine.getFieldState('c').visible).toBe(false);
    expect(engine.getDependents('flag')).toEqual(new Set(['a']));
    expect(engine.getDependents('flag').has('b')).toBe(false);
    expect(engine.getDependents('flag').has('c')).toBe(false);
  });

  it('visibleOn 依赖提取不受取反包裹影响', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        region: { type: 'string', widget: 'input' },
        city: {
          type: 'string',
          widget: 'input',
          visibleOn: "{{ formData.region !== '' }}",
        },
      },
    } as never);
    expect(engine.getDependencies('city')).toEqual(new Set(['region']));
  });
});