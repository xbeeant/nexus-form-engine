import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src';
import type { NexusSchema } from '../src/types/schema';

describe('父 hidden 子必 hidden', () => {
  it('data object hidden → 子字段不参与 getFormData', () => {
    // 注：使用 `hidden: "{{ true }}"` 表达式形式（而非静态 `hidden: true`）
    //   是有意为之——静态 true 会被 isSkipNode 整节点跳过（声明期），
    //   表达式形式走运行时 FieldState.hidden，能验证 hidden 传染 / 收集。
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          hidden: '{{ true }}',
          properties: {
            name: {
              widget: 'input',
            },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, { profile: { name: 'test' } });

    const formData = engine.getFormData();
    expect(formData).not.toHaveProperty('name');

    const hiddenValues = engine.getHiddenValues();
    expect(hiddenValues).toHaveProperty('profile');
    expect(hiddenValues.profile).toEqual({ name: 'test' });
  });

  it('data object visible → 子字段正常', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            name: {
              widget: 'input',
            },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, { profile: { name: 'test' } });

    const formData = engine.getFormData();
    expect(formData).toHaveProperty('profile');
    expect(formData.profile).toEqual({ name: 'test' });
  });

  it('多级嵌套 hidden', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        a: {
          type: 'object',
          properties: {
            b: {
              type: 'object',
              hidden: true,
              properties: {
                c: {
                  widget: 'input',
                },
              },
            },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, { a: { b: { c: 'deep-value' } } });

    const formData = engine.getFormData();
    expect(formData).not.toHaveProperty('c');

    const hiddenValues = engine.getHiddenValues();
    // 父 hidden → 子字段不再被 getHiddenValues 收集
    expect(hiddenValues.a?.b).not.toBeDefined();
  });

  it('isHidden 方法验证', () => {
    // 注：使用 `hidden: "{{ true }}"` 表达式（而非静态 `hidden: true`）
    //   是有意为之——验证运行时 hidden 容器对子字段的传染。
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        visible: {
          widget: 'input',
        },
        profile: {
          type: 'object',
          hidden: '{{ true }}',
          properties: {
            name: {
              widget: 'input',
            },
          },
        },
        nested: {
          type: 'object',
          properties: {
            inner: {
              type: 'object',
              hidden: '{{ true }}',
              properties: {
                deep: {
                  widget: 'input',
                },
              },
            },
          },
        },
      },
    };

    const engine = new NexusEngine({ schema });
    engine.init(schema);

    expect(engine.isHidden('visible')).toBe(false);
    expect(engine.isHidden('profile')).toBe(true);
    expect(engine.isHidden('profile.name')).toBe(true);
    expect(engine.isHidden('nested.inner.deep')).toBe(true);
  });

  it('验证校验跳过 hidden 祖先的子字段', async () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          hidden: true,
          properties: {
            name: {
              widget: 'input',
              rules: [
                {
                  required: true,
                  message: 'name 是必填项',
                },
              ],
            },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, { profile: { name: '' } });

    const errors = await engine.validate();
    expect(errors.has('name')).toBe(false);
  });
});
