/**
 * 数据对象容器（NexusObject 继承）测试
 *
 * 覆盖：
 * 1. 对象容器创建 containerOnly 状态（仅 UI 状态，无值，不参与数据收集）
 * 2. 静态 disabled/readOnly/hidden 布尔 → 容器状态
 * 3. disabled/hidden 表达式 → 自动转 reaction 并联动容器状态
 * 4. setFieldState / 订阅按路径精准作用对象容器
 * 5. 隐藏对象子树：不参与 getFormData、并入 getHiddenValues
 * 6. 容器路径写入值被拒绝
 */

import { describe, expect, it } from 'vitest';
import type { NexusSchema } from '../src';
import { NexusEngine } from '../src';
import * as SchemaParser from '../src/SchemaParser';

describe('数据对象容器（NexusObject 继承）', () => {
  it('对象容器创建 containerOnly 状态：仅 UI 状态，无值，不参与数据收集', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input' },
            profile: {
              type: 'object',
              properties: {
                age: { type: 'number', widget: 'number' },
              },
            },
          },
        },
        company: { type: 'string', widget: 'input' },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, { user: { name: 'amy', profile: { age: 30 } } });

    // 每个数据对象都有容器状态
    const user = engine.getFieldState('user');
    expect(user).toBeDefined();
    expect(user!.meta.containerOnly).toBe(true);
    expect(user!.value).toBeUndefined();
    expect(engine.getFieldState('user.profile')!.meta.containerOnly).toBe(true);

    // 容器状态不参与数据收集（子字段正常收集，无默认值的字符串字段为 ''）
    expect(engine.getFormData()).toEqual({
      user: { name: 'amy', profile: { age: 30 } },
      company: '',
    });
  });

  it('静态布尔 disabled/readOnly/hidden 落在容器状态上', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          disabled: true,
          readOnly: true,
          hidden: true,
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema);

    const user = engine.getFieldState('user');
    expect(user!.disabled).toBe(true);
    expect(user!.readOnly).toBe(true);
    expect(user!.visible).toBe(false);

    // 子字段自身状态不受影响（继承由 Renderer 层合并）
    const name = engine.getFieldState('user.name');
    expect(name!.disabled).toBe(false);
    expect(name!.readOnly).toBe(false);
    expect(name!.visible).toBe(true);
  });

  it('disabled/hidden 表达式自动转 reaction，随依赖字段实时联动容器状态', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        locked: { type: 'boolean', widget: 'switch' },
        user: {
          type: 'object',
          disabled: '{{ formData.locked === true }}',
          hidden: '{{ formData.locked === true }}',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema);

    expect(engine.getFieldState('user')!.disabled).toBe(false);
    expect(engine.getFieldState('user')!.visible).toBe(true);
    expect(engine.getFieldState('user')!.reactions?.[0]?._autoExpr).toBe(true);

    engine.setFieldValue('locked', true);
    expect(engine.getFieldState('user')!.disabled).toBe(true);
    expect(engine.getFieldState('user')!.visible).toBe(false);
  });

  it('setFieldState 动态控制容器状态并按路径精准通知订阅者', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema);

    let notified = 0;
    engine.subscribeField('user', () => notified++);
    const before = engine.getFieldVersion('user');

    engine.setFieldState('user', { disabled: true, readOnly: true });
    expect(engine.getFieldState('user')!.disabled).toBe(true);
    expect(engine.getFieldState('user')!.readOnly).toBe(true);
    expect(engine.getFieldVersion('user')).toBe(before + 1);
    expect(notified).toBe(1);
  });

  it('隐藏对象容器：子树不参与 getFormData，并入 getHiddenValues', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          hidden: true,
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
        visibleField: { type: 'string', widget: 'input' },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, {
      user: { name: 'amy' },
      visibleField: 'ok',
    });

    // 隐藏对象子树不参与提交
    expect(engine.getFormData()).toEqual({ visibleField: 'ok' });
    // 子树并入隐藏值
    expect(engine.getHiddenValues().user).toEqual({ name: 'amy' });
    // getAllFormData 仍包含全部值
    expect(engine.getAllFormData().user).toEqual({ name: 'amy' });
  });

  it('隐藏容器可经表达式联动动态切换，数据收集随之变化', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        toggle: { type: 'boolean', widget: 'switch' },
        user: {
          type: 'object',
          hidden: '{{ formData.toggle === true }}',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema, { user: { name: 'amy' } });

    expect(engine.getFormData().user).toEqual({ name: 'amy' });

    engine.setFieldValue('toggle', true);
    expect(engine.getFormData()).not.toHaveProperty('user');
    expect(engine.getHiddenValues().user).toEqual({ name: 'amy' });
  });

  it('setFieldValues 跳过容器路径，容器路径不可写入值', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema);

    // setFieldValues：容器路径自身被跳过，子字段仍正常从嵌套路径读取
    engine.setFieldValues({ user: { name: 'bad' } });
    expect(engine.getFieldValue('user.name')).toBe('bad');
    engine.setFieldValues({ user: { name: 'good' } });
    expect(engine.getFieldValue('user.name')).toBe('good');
    // 容器状态本身无值
    expect(engine.getFieldValue('user')).toBeUndefined();

    // setFieldValue：对容器路径直接写入值被拒绝（保持 undefined）
    engine.setFieldValue('user', { name: 'x' });
    expect(engine.getFieldValue('user')).toBeUndefined();
  });

  it('布局节点内的对象容器同样生效（布局 key 不进路径）', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        panel: {
          type: 'card',
          properties: {
            user: {
              type: 'object',
              disabled: true,
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            },
          },
        },
      },
    };

    const { fieldStates } = SchemaParser.parse(schema);

    // 布局 key 被丢弃，对象路径仍为根级 user
    const user = fieldStates.get('user');
    expect(user?.meta.containerOnly).toBe(true);
    expect(user?.disabled).toBe(true);
    expect(fieldStates.has('panel.user')).toBe(false);
  });
});
