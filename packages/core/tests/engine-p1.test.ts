/**
 * P1 核心功能测试
 *
 * 覆盖：
 * 1. reactions 的 fulfill.schema / otherwise.schema
 * 2. $form / $index 上下文变量注入
 * 3. 跨字段 validate 表达式依赖进入 DependencyGraph 并实时重校验
 * 4. setFieldValues 复用 setFieldValue 的插件钩子与实时校验
 * 5. 数组项（items 子字段）独立 FieldState
 * 6. arrayOperation 不可变更新 + 数组项状态重建
 * 7. 精准订阅（subscribeField / getFieldVersion）
 * 8. reset() 依据 Schema 重建初始状态
 */

import { describe, expect, it } from 'vitest';
import { ArrayOperationsPlugin } from '../src/array-list';
import { NexusEngine } from '../src/Engine';
import type { NexusSchema } from '../src/types/schema';

describe('NexusEngine P1', () => {
  describe('reactions fulfill.schema / otherwise.schema', () => {
    it('when 命中时执行 fulfill.schema，未命中时执行 otherwise.schema', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          mode: { type: 'string', widget: 'select' },
          target: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['mode'],
                when: "{{ $deps[0] === 'a' }}",
                fulfill: { schema: { 'props.options': ['x', 'y'] } },
                otherwise: { schema: { 'props.options': ['z'] } },
              },
            ],
          },
        },
      };

      engine.init(schema);
      engine.setFieldValue('mode', 'a');
      expect(engine.getFieldState('target')!.props.options).toEqual(['x', 'y']);

      engine.setFieldValue('mode', 'b');
      expect(engine.getFieldState('target')!.props.options).toEqual(['z']);
    });

    it('schema patch 支持多级 props 路径与状态字段（disabled/required）', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          mode: { type: 'string', widget: 'select' },
          target: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['mode'],
                fulfill: {
                  when: undefined,
                  schema: {
                    disabled: "{{ $deps[0] === 'locked' }}",
                    required: "{{ $deps[0] === 'needed' }}",
                    'props.meta.placeholder': "{{ '请先选择' }}",
                  },
                } as never,
              },
            ],
          },
        },
      };

      engine.init(schema);
      engine.setFieldValue('mode', 'locked');
      const state = engine.getFieldState('target')!;
      expect(state.disabled).toBe(true);
      expect(state.props.meta?.placeholder).toBe('请先选择');

      engine.setFieldValue('mode', 'needed');
      expect(engine.getFieldState('target')!.required).toBe(true);
    });
  });

  describe('$form / $index 上下文变量', () => {
    it('reaction 表达式中可使用 $form 访问引擎', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          mode: { type: 'string', widget: 'select' },
          target: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['mode'],
                when: "{{ $form.getFieldValue('mode') === 'a' }}",
                fulfill: { state: { disabled: true } },
                otherwise: { state: { disabled: false } },
              },
            ],
          },
        },
      };

      engine.init(schema);
      engine.setFieldValue('mode', 'a');
      expect(engine.getFieldState('target')!.disabled).toBe(true);

      engine.setFieldValue('mode', 'b');
      expect(engine.getFieldState('target')!.disabled).toBe(false);
    });

    it('数组项字段的 reaction 上下文中注入 $index', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            widget: 'list',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  widget: 'input',
                  readOnly: '{{ $index > 0 }}',
                },
              },
            },
          },
        },
      };

      engine.init(schema, { list: [{ name: 'a' }, { name: 'b' }] });
      // 第 0 项可编辑
      expect(engine.getFieldState('list[0].name')!.readOnly).toBe(false);
      // 第 1 项只读（$index = 1）
      expect(engine.getFieldState('list[1].name')!.readOnly).toBe(true);
    });
  });

  describe('跨字段 validate 表达式依赖', () => {
    it('validate 表达式的 formData.xxx 依赖进入依赖图', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          password: { type: 'string', widget: 'input' },
          confirm: {
            type: 'string',
            widget: 'input',
            validate: {
              same: '{{ formData.password === $self.value }}',
            },
          },
        },
      };

      engine.init(schema);
      expect(engine.getDependents('password').has('confirm')).toBe(true);
    });

    it('依赖字段变化时实时重校验目标字段', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          password: { type: 'string', widget: 'input' },
          confirm: {
            type: 'string',
            widget: 'input',
            title: '确认密码',
            validate: {
              same: '{{ formData.password === $self.value }}',
            },
          },
        },
      };

      engine.init(schema);
      // 初始一致：无错误
      expect(engine.getFieldError('confirm')).toEqual([]);

      // password 变化导致不一致 → confirm 立即出现错误
      engine.setFieldValue('password', '123');
      expect(engine.getFieldError('confirm')).toContain('确认密码 校验未通过');

      // 重新一致 → 错误清除
      engine.setFieldValue('confirm', '123');
      expect(engine.getFieldError('confirm')).toEqual([]);
    });
  });

  describe('setFieldValues 复用插件钩子与实时校验', () => {
    it('逐字段触发 onBefore/onAfter 插件钩子', () => {
      const engine = new NexusEngine();
      const calls: string[] = [];
      engine.use({
        name: 'test',
        hooks: {
          onBeforeFieldValueChange: (path) => {
            calls.push(`before:${path}`);
          },
          onFieldValueChange: (path) => {
            calls.push(`after:${path}`);
          },
        },
      } as never);

      engine.init({
        type: 'object',
        properties: {
          a: { type: 'string', widget: 'input' },
          b: { type: 'string', widget: 'input' },
        },
      });
      engine.setFieldValues({ a: '1', b: '2' });

      expect(calls).toEqual(['before:a', 'after:a', 'before:b', 'after:b']);
    });

    it('触发实时校验（必填为空立即报错）', () => {
      const engine = new NexusEngine();
      engine.init({
        type: 'object',
        properties: {
          c: { type: 'string', widget: 'input', required: true },
        },
      });
      engine.setFieldValues({ c: '' });
      expect(engine.getFieldError('c')).toContain('c 为必填项');
    });
  });

  describe('数组项（items 子字段）独立 FieldState', () => {
    it('解析时创建数组项子字段状态，且不参与 formData 收集', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            widget: 'list',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input' },
                age: { type: 'number', widget: 'number' },
              },
            },
          },
        },
      };

      engine.init(schema, { list: [{ name: 'a', age: 1 }] });

      expect(engine.getFieldState('list[0].name')!.value).toBe('a');
      expect(engine.getFieldState('list[0].age')!.value).toBe(1);
      // 数组项子字段不单独进入 formData
      expect(engine.getFormData()).toEqual({ list: [{ name: 'a', age: 1 }] });
    });

    it('数组项子字段可被校验（required 为空报错）', async () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            widget: 'list',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  widget: 'input',
                  title: '姓名',
                  required: true,
                },
              },
            },
          },
        },
      };

      engine.init(schema, { list: [{ name: '' }] });
      const errors = await engine.validate();
      expect(errors.get('list[0].name')).toContain('姓名 为必填项');
    });

    it('数组操作后同步重建数组项子字段状态', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            widget: 'list',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            },
          },
        },
      };
      engine.init(schema, { list: [{ name: 'a' }] });
      engine.use(new ArrayOperationsPlugin(engine));

      const plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);

      plugin.push('list', { name: 'b' });
      expect(engine.getFieldState('list[1].name')!.value).toBe('b');

      plugin.remove('list', 0);
      expect(engine.getFieldState('list[0].name')!.value).toBe('b');
      expect(engine.getFieldState('list[1].name')).toBeUndefined();
    });
  });

  describe('arrayOperation 不可变更新', () => {
    it('move 操作不原地修改原始数组', () => {
      const engine = new NexusEngine();
      engine.init({
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: { type: 'string' },
          },
        },
      });
      engine.setFieldValue('items', ['a', 'b', 'c']);
      engine.use(new ArrayOperationsPlugin(engine));

      const original = engine.getFieldValue('items') as unknown[];
      const plugin = new ArrayOperationsPlugin(engine);
      engine.use(plugin);
      plugin.move('items', 0, 2);

      // 移到末尾以外的位置（不可变数组会改变引用）
      expect(engine.getFieldValue('items')).not.toBe(original);
      expect(engine.getFieldValue('items')).toEqual(['b', 'c', 'a']);
    });
  });

  describe('精准订阅（subscribeField / getFieldVersion）', () => {
    it('只通知目标字段的监听器', () => {
      const engine = new NexusEngine();
      engine.init({
        type: 'object',
        properties: {
          a: { type: 'string', widget: 'input' },
          b: { type: 'string', widget: 'input' },
        },
      });

      let aCalls = 0;
      let bCalls = 0;
      const unA = engine.subscribeField('a', () => aCalls++);
      const unB = engine.subscribeField('b', () => bCalls++);

      engine.setFieldValue('a', 'x');
      expect(aCalls).toBe(1);
      expect(bCalls).toBe(0);
      expect(engine.getFieldVersion('a')).toBeGreaterThanOrEqual(2);

      unA();
      unB();
    });

    it('init 时递增所有已存在字段的版本号', () => {
      const engine = new NexusEngine();
      engine.init({
        type: 'object',
        properties: {
          a: { type: 'string', widget: 'input' },
        },
      });
      expect(engine.getFieldVersion('a')).toBeGreaterThan(0);
      expect(engine.getFieldVersion('unknown')).toBe(0);
    });
  });

  describe('reset() 依据 Schema 重建初始状态', () => {
    it('恢复 schema 级 hidden/disabled/props 默认值', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          a: {
            type: 'string',
            widget: 'input',
            default: 'hello',
            hidden: true,
            props: { placeholder: 'hi' },
          },
          b: { type: 'string', widget: 'input' },
        },
      };

      engine.init(schema);
      expect(engine.getFieldState('a')!.visible).toBe(false);
      expect(engine.getFieldState('a')!.value).toBe('hello');

      // 运行中改变状态
      engine.setFieldState('a', {
        visible: true,
        value: 'changed',
        props: { placeholder: 'changed' },
      });
      engine.setFieldValue('b', 'user-input');
      engine.reset();

      expect(engine.getFieldState('a')!.visible).toBe(false);
      expect(engine.getFieldState('a')!.value).toBe('hello');
      expect(engine.getFieldState('a')!.props.placeholder).toBe('hi');
      expect(engine.getFieldState('b')!.value).toBe('');
    });

    it('隐藏字段参与 reset（hidden:false 正常显示）', () => {
      const engine = new NexusEngine();
      engine.init({
        type: 'object',
        properties: {
          a: { type: 'string', widget: 'input', hidden: false },
        },
      });
      expect(engine.getFieldState('a')!.visible).toBe(true);
    });
  });
});

describe('插件 onSubmit 钩子（提交拦截）', () => {
  it('onSubmit 分发表单数据，任一插件返回 false 阻止提交', async () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        name: { type: 'string', widget: 'input', title: '姓名' },
      },
    } as never);

    const calls: Array<Record<string, unknown>> = [];
    engine.use({
      name: 'submit-spy',
      hooks: {
        onSubmit: (formData) => {
          calls.push(formData);
          return undefined;
        },
      },
    });
    engine.setFieldValue('name', '张三');

    expect(await engine.submit({ name: '张三' })).toBe(true);
    expect(calls).toEqual([{ name: '张三' }]);

    engine.use({
      name: 'submit-blocker',
      hooks: {
        onSubmit: () => false,
      },
    });
    expect(await engine.submit({ name: '张三' })).toBe(false);
    // 两个插件都被调用（阻塞不短路）
    expect(calls).toHaveLength(2);
  });
});
