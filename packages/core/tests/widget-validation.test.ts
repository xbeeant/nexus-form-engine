/**
 * Widget 级校验规则与状态联动测试
 * 验证 widget 通过 widgetMeta 声明校验规则/联动/默认 props，解析时正确合并进 FieldState
 * 以及组件内命令式注册校验器（registerFieldValidator / unregister / revalidateField）机制
 */

import { describe, expect, it } from 'vitest';
import { AsyncValidatorPlugin } from '../src/async-validator';
import { NexusEngine } from '../src/Engine';
import * as SchemaParser from '../src/SchemaParser';
import type { WidgetValidationDescriptor } from '../src/types/schema';

describe('widget validation & state linkage', () => {
  it('widget 声明级规则合并到字段状态（schema 规则优先）', () => {
    const widgetMeta: WidgetValidationDescriptor = {
      rules: [{ min: 5, message: 'widget 默认规则：长度需 5+' }],
    };

    const schema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          min: 3,
        },
      },
    };

    const result = SchemaParser.parse(schema, {}, { input: widgetMeta });

    const state = result.fieldStates.get('username');
    expect(state).toBeDefined();
    expect(state?.meta.rules).toHaveLength(1);
    expect(state?.meta.rules[0].min).toBe(3);
  });

  it('widget 声明级规则补缺（schema 未声明约束时应用）', () => {
    const widgetMeta: WidgetValidationDescriptor = {
      rules: [
        { min: 5, message: 'widget 默认规则：长度需 5+' },
        { pattern: /^\w+$/, message: 'widget 默认规则：仅字母数字' },
      ],
    };

    const schema = {
      type: 'object',
      properties: {
        username: { type: 'string', widget: 'input' },
      },
    };

    const result = SchemaParser.parse(schema, {}, { input: widgetMeta });
    const state = result.fieldStates.get('username');

    expect(state?.meta.rules).toHaveLength(2);
    expect(state?.meta.rules[0].min).toBe(5);
    expect(state?.meta.rules[1].pattern).toEqual(/^\w+$/);
  });

  it('widget 声明级联动规则合并到 reactions', () => {
    const widgetMeta: WidgetValidationDescriptor = {
      reactions: [
        {
          dependencies: ['password'],
          fulfill: { state: { required: true } },
        },
      ],
    };

    const schema = {
      type: 'object',
      properties: {
        username: { type: 'string', widget: 'input' },
        password: { type: 'string', widget: 'input' },
      },
    };

    const result = SchemaParser.parse(schema, {}, { input: widgetMeta });
    const usernameState = result.fieldStates.get('username');

    expect(usernameState?.reactions).toHaveLength(1);
    expect(usernameState?.reactions[0].dependencies).toEqual(['password']);
    expect(usernameState?.reactions[0].fulfill?.state?.required).toBe(true);
  });

  it('widget 声明级 props 合并（schema props 覆盖 widget props）', () => {
    const widgetMeta: WidgetValidationDescriptor = {
      props: { placeholder: 'Widget 默认占位符', disabled: true },
    };

    const schema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          props: { placeholder: 'Schema 覆盖占位符' },
        },
      },
    };

    const result = SchemaParser.parse(schema, {}, { input: widgetMeta });
    const state = result.fieldStates.get('username');

    expect(state?.props.placeholder).toBe('Schema 覆盖占位符');
    expect(state?.props.disabled).toBe(true);
  });

  it('数组字段应用 widget 声明级规则', () => {
    const widgetMeta: WidgetValidationDescriptor = {
      rules: [{ min: 3, message: '数组项数至少 3 个' }],
    };

    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          items: { type: 'string', widget: 'input' },
        },
      },
    };

    const result = SchemaParser.parse(schema, {}, { list: widgetMeta });
    const itemsState = result.fieldStates.get('items');

    expect(itemsState).toBeDefined();
    expect(itemsState?.meta.widget).toBe('list');
    expect(itemsState?.meta.rules).toHaveLength(1);
    expect(itemsState?.meta.rules[0].min).toBe(3);
  });

  it('数组项子字段应用 widget 声明级规则', () => {
    const inputWidgetMeta: WidgetValidationDescriptor = {
      rules: [{ pattern: /^\d+$/, message: 'widget 默认规则：仅数字' }],
    };

    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', widget: 'input' },
            },
          },
        },
      },
    };

    const result = SchemaParser.parse(
      schema,
      { items: [{ name: 'abc' }] },
      { input: inputWidgetMeta },
    );
    const item0NameState = result.fieldStates.get('items[0].name');

    expect(item0NameState).toBeDefined();
    expect(item0NameState?.meta.widget).toBe('input');
    expect(item0NameState?.meta.rules).toHaveLength(1);
    expect(item0NameState?.meta.rules[0].pattern).toEqual(/^\d+$/);
  });

  it('widget 声明级 validate 表达式依赖进入依赖图', () => {
    const widgetMeta: WidgetValidationDescriptor = {
      rules: [
        {
          _validateExpr: '{{ formData.password === $self.value }}',
          message: '两次输入的密码不一致',
          trigger: 'change',
        },
      ],
    };

    const schema = {
      type: 'object',
      properties: {
        password: { type: 'string', widget: 'input' },
        confirmPassword: { type: 'string', widget: 'input' },
      },
    };

    const result = SchemaParser.parse(schema, {}, { input: widgetMeta });

    const confirmState = result.fieldStates.get('confirmPassword');
    expect(confirmState?.meta.rules).toHaveLength(1);
    expect(confirmState?.meta.rules[0]._validateExpr).toBe(
      '{{ formData.password === $self.value }}',
    );
    expect(result.validateExprFields.has('confirmPassword')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 组件内命令式注册校验器（registerFieldValidator / unregister / revalidate）
// ────────────────────────────────────────────────────────────────────────────

describe('widget 组件内命令式注册校验器', () => {
  const baseSchema = {
    type: 'object',
    properties: {
      password: { type: 'string', widget: 'input' },
      confirmPassword: { type: 'string', widget: 'input' },
    },
  };

  function makeEngine() {
    const engine = new NexusEngine();
    engine.init(baseSchema);
    return engine;
  }

  it('registerFieldValidator 同一函数引用重复注册只生效一次（去重）', () => {
    const engine = makeEngine();
    const fn = (val: unknown, data: Record<string, unknown>) => {
      if (val && data.password && val !== data.password) {
        return ['两次输入的密码不一致'];
      }
      return [];
    };

    // 组件多次挂载反复注册同一函数 → 去重
    engine.registerFieldValidator('confirmPassword', fn);
    engine.registerFieldValidator('confirmPassword', fn);
    engine.registerFieldValidator('confirmPassword', fn);

    engine.setFieldValue('password', 'abc');
    engine.setFieldValue('confirmPassword', 'xyz');
    expect(engine.getFieldError('confirmPassword')).toEqual([
      '两次输入的密码不一致',
    ]);
  });

  it('unregisterFieldValidator 移除后校验器不再生效', () => {
    const engine = makeEngine();
    const fn = (val: unknown, data: Record<string, unknown>) => {
      if (val && data.password && val !== data.password) {
        return ['两次输入的密码不一致'];
      }
      return [];
    };

    engine.registerFieldValidator('confirmPassword', fn);
    // 组件卸载 → 注销
    engine.unregisterFieldValidator('confirmPassword', fn);

    engine.setFieldValue('password', 'abc');
    engine.setFieldValue('confirmPassword', 'xyz');
    expect(engine.getFieldError('confirmPassword')).toEqual([]);
  });

  it('revalidateField（validateField）触发已注册校验器实时刷新错误', () => {
    const engine = makeEngine();
    const fn = (val: unknown) => (val === 'forbidden' ? ['该值被禁用'] : []);

    engine.registerFieldValidator('confirmPassword', fn);
    engine.setFieldValue('confirmPassword', 'forbidden');
    expect(engine.getFieldError('confirmPassword')).toEqual(['该值被禁用']);

    // 组件内部 state 变化后重新校验 → 修正值清除错误
    engine.setFieldValue('confirmPassword', 'ok');
    expect(engine.getFieldError('confirmPassword')).toEqual([]);
  });

  it('validate() 提交时 await 异步校验器', async () => {
    const engine = makeEngine();
    engine.registerFieldValidator('confirmPassword', async (val) => {
      await new Promise((r) => setTimeout(r, 10));
      return val === 'taken' ? ['该值已被占用'] : [];
    });

    engine.setFieldValue('confirmPassword', 'taken');
    const errors = await engine.validate();
    expect(errors.get('confirmPassword')).toEqual(['该值已被占用']);
  });

  it('异步校验器随值变化被触发（AsyncValidatorPlugin 防抖调度，与默认 change trigger 对齐）', async () => {
    const engine = new NexusEngine();
    engine.use(new AsyncValidatorPlugin(engine, { debounce: 0 }));
    engine.init(baseSchema);
    let calls = 0;
    const fn = async (val: unknown) => {
      calls += 1;
      await new Promise((r) => setTimeout(r, 5));
      return val === 'taken' ? ['该值已被占用'] : [];
    };
    engine.registerFieldValidator('confirmPassword', fn);

    // 值变化 → 实时同步路径（Core）跳过 thenable，交给插件防抖调度
    engine.setFieldValue('confirmPassword', 'taken');
    // 防抖/异步完成前不产生错误
    expect(engine.getFieldError('confirmPassword')).toEqual([]);

    // 防抖 + 异步校验完成后，错误被写回字段
    await new Promise((r) => setTimeout(r, 40));
    expect(calls).toBeGreaterThan(0);
    expect(engine.getFieldError('confirmPassword')).toEqual(['该值已被占用']);

    // 值变化且校验通过 → 错误清除（插件合并最新同步 errors，不再残留）
    engine.setFieldValue('confirmPassword', 'ok');
    await new Promise((r) => setTimeout(r, 40));
    expect(engine.getFieldError('confirmPassword')).toEqual([]);
  });
});
