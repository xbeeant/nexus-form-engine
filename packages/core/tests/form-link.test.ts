/**
 * 多表单实例 + 跨表单联动测试
 *
 * 覆盖：
 * 1. 多实例隔离：同页多个引擎互不影响
 * 2. FormRegistry：注册/查询/跨表单读数据/注销
 * 3. Schema 声明式 crossForm reaction（值同步 / when 条件）
 * 4. 乱序初始化：目标表单先 init，源表单后注册 → 延迟建立联动
 * 5. linkForm 编程式联动（transform + 取消）
 * 6. 防环守护：双向同步安全终止
 * 7. 跨表单 reaction 不污染本表单依赖图
 * 8. destroy 注销与订阅清理
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/Engine';
import { createFormRegistry, FormRegistry } from '../src/FormRegistry';
import type { NexusSchema } from '../src/types/schema';

function baseSchema(fields: Record<string, unknown>): NexusSchema {
  return {
    type: 'object',
    properties: fields as NexusSchema['properties'],
  };
}

describe('多表单实例', () => {
  it('同页多个引擎实例相互独立（数据/状态不共享）', () => {
    const engineA = new NexusEngine();
    const engineB = new NexusEngine();

    engineA.init(baseSchema({ name: { type: 'string', widget: 'input' } }));
    engineB.init(baseSchema({ name: { type: 'string', widget: 'input' } }));

    engineA.setFieldValue('name', 'from-A');
    expect(engineA.getFieldValue('name')).toBe('from-A');
    expect(engineB.getFieldValue('name')).toBe('');
    expect(engineB.getFormData()).toEqual({ name: '' });

    engineB.setFieldValue('name', 'from-B');
    expect(engineA.getFormData()).toEqual({ name: 'from-A' });
    expect(engineB.getFormData()).toEqual({ name: 'from-B' });
  });
});

describe('FormRegistry', () => {
  it('register / get / has / getAll / getFormData', () => {
    const registry = createFormRegistry();
    const engine = new NexusEngine({ formId: 'order', registry });
    engine.init(baseSchema({ amount: { type: 'number' } }));
    engine.setFieldValue('amount', 100);

    expect(registry.has('order')).toBe(true);
    expect(registry.get('order')).toBe(engine);
    expect(registry.getAll().size).toBe(1);
    expect(registry.getFormData('order')).toEqual({ amount: 100 });
    expect(registry.getFormData('missing')).toBeUndefined();
  });

  it('unregister 后无法再按 formId 寻址', () => {
    const registry = createFormRegistry();
    const engine = new NexusEngine({ formId: 'a', registry });
    engine.init(baseSchema({ x: { type: 'string' } }));

    registry.unregister('a');
    expect(registry.has('a')).toBe(false);
    expect(registry.get('a')).toBeUndefined();
  });

  it('formId 未配置的引擎不会自动注册', () => {
    const registry = createFormRegistry();
    const engine = new NexusEngine({ registry });
    engine.init(baseSchema({ x: { type: 'string' } }));
    expect(registry.getAll().size).toBe(0);
  });
});

describe('Schema 声明式跨表单联动（crossForm reaction）', () => {
  it('源表单字段变化 → 目标表单计算字段同步（值联动）', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(
      baseSchema({
        price: { type: 'number' },
        count: { type: 'number' },
      }),
    );
    // 源表单先有值，目标表单 init 时初始同步一次
    engineA.setFieldValue('price', 10);
    engineA.setFieldValue('count', 2);
    engineB.init(
      baseSchema({
        total: {
          type: 'number',
          title: '总额',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['price', 'count'],
              fulfill: {
                state: { value: '{{ $deps[0] * $deps[1] }}' },
              },
            },
          ],
        },
      }),
    );

    // 初始同步：源表单当前值已写入（price=10, count=2 → total=20）
    expect(engineB.getFieldValue('total')).toBe(20);

    engineA.setFieldValue('price', 5);
    expect(engineB.getFieldValue('total')).toBe(10);

    engineA.setFieldValue('count', 4);
    expect(engineB.getFieldValue('total')).toBe(20);
  });

  it('when 条件 + fulfill/otherwise 控制目标字段状态', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ country: { type: 'string', widget: 'select' } }));
    engineB.init(
      baseSchema({
        province: {
          type: 'string',
          widget: 'select',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['country'],
              when: "{{ $deps[0] === 'CN' }}",
              fulfill: { state: { visible: true } },
              otherwise: { state: { visible: false } },
            },
          ],
        },
      }),
    );

    // 初始：country 未选择 → otherwise
    expect(engineB.getFieldState('province')!.visible).toBe(false);

    engineA.setFieldValue('country', 'CN');
    expect(engineB.getFieldState('province')!.visible).toBe(true);

    engineA.setFieldValue('country', 'US');
    expect(engineB.getFieldState('province')!.visible).toBe(false);
  });

  it('when 条件可同时引用源表单 $deps 与本表单 formData', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ mode: { type: 'string' } }));
    engineB.init(
      baseSchema({
        kind: { type: 'string', widget: 'input' },
        tips: {
          type: 'string',
          title: '提示',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['mode'],
              when: "{{ $deps[0] === 'strict' && formData.kind !== '' }}",
              fulfill: { state: { disabled: true } },
              otherwise: { state: { disabled: false } },
            },
          ],
        },
      }),
    );

    engineA.setFieldValue('mode', 'strict');
    // formData.kind 为空 → when 不满足
    expect(engineB.getFieldState('tips')!.disabled).toBe(false);

    engineB.setFieldValue('kind', 'x');
    // 本表单 kind 变化不触发跨表单 reaction（依赖在源表单）……
    // ……但目标字段自身状态变化后，源表单值满足条件时已正确求值
    expect(engineB.getFieldState('tips')!.disabled).toBe(false);

    // 再次变更源表单 → 条件同时满足
    engineA.setFieldValue('mode', 'strict');
    engineA.setFieldValue('mode', 'loose');
    engineA.setFieldValue('mode', 'strict');
    expect(engineB.getFieldState('tips')!.disabled).toBe(true);
  });

  it('乱序初始化：目标先 init，源表单后注册 → 延迟建立联动', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    // 目标表单先 init（此时 formA 未注册，联动未建立）
    engineB.init(
      baseSchema({
        copy: {
          type: 'string',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['username'],
              fulfill: { state: { value: '{{ $deps[0] }}' } },
            },
          ],
        },
      }),
    );
    expect(engineB.getFieldValue('copy')).toBe('');

    // 源表单后注册并 init → 自动建立联动并初始同步
    engineA.init(
      baseSchema({ username: { type: 'string', widget: 'input' } }),
      { username: 'amy' },
    );
    expect(engineB.getFieldValue('copy')).toBe('amy');

    engineA.setFieldValue('username', 'bob');
    expect(engineB.getFieldValue('copy')).toBe('bob');
  });

  it('跨表单 reaction 不进入本表单依赖图（getDependents 不含源表单路径）', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ country: { type: 'string' } }));
    engineB.init(
      baseSchema({
        local: { type: 'string' },
        province: {
          type: 'string',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['country'],
              fulfill: { state: {} },
            },
            {
              dependencies: ['local'],
              fulfill: { state: {} },
            },
          ],
        },
      }),
    );

    // 本表单依赖图只有 local → province；country 属于源表单
    expect(engineB.getDependents('local')).toEqual(new Set(['province']));
    expect(engineB.getDependents('country')).toEqual(new Set());
  });
});

describe('linkForm 编程式跨表单联动', () => {
  it('值同步 + transform 转换', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ username: { type: 'string', widget: 'input' } }));
    engineB.init(
      baseSchema({
        greeting: { type: 'string', widget: 'input' },
      }),
    );

    const unlink = engineB.linkForm(engineA, 'username', 'greeting', {
      transform: (v) => `Hello, ${String(v)}`,
    });

    engineA.setFieldValue('username', 'amy');
    expect(engineB.getFieldValue('greeting')).toBe('Hello, amy');

    // 取消联动后不再同步
    unlink();
    engineA.setFieldValue('username', 'bob');
    expect(engineB.getFieldValue('greeting')).toBe('Hello, amy');
  });

  it('支持按 formId 字符串寻址源表单', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ code: { type: 'string' } }), { code: 'A1' });
    engineB.init(baseSchema({ codeCopy: { type: 'string' } }));

    engineB.linkForm('formA', 'code', 'codeCopy');
    // 初始同步源表单已有值
    expect(engineB.getFieldValue('codeCopy')).toBe('A1');

    engineA.setFieldValue('code', 'A2');
    expect(engineB.getFieldValue('codeCopy')).toBe('A2');
  });

  it('源表单未注册 / 目标字段不存在时告警并返回空函数', () => {
    const registry = createFormRegistry();
    const engineB = new NexusEngine({ formId: 'formB', registry });
    engineB.init(baseSchema({ x: { type: 'string' } }));

    const unlink1 = engineB.linkForm('missingForm', 'a', 'x');
    expect(typeof unlink1).toBe('function');
    unlink1();

    const unlink2 = engineB.linkForm(new NexusEngine(), 'a', 'nope');
    expect(typeof unlink2).toBe('function');
    unlink2();
  });
});

describe('防环守护与生命周期', () => {
  it('双向值同步（A→B 且 B→A）安全终止', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ value: { type: 'string', widget: 'input' } }), {
      value: 'init',
    });
    engineB.init(baseSchema({ value: { type: 'string', widget: 'input' } }));

    engineA.linkForm(engineB, 'value', 'value');
    engineB.linkForm(engineA, 'value', 'value');

    // 双向联动后两端一致
    expect(engineA.getFieldValue('value')).toBe('init');
    expect(engineB.getFieldValue('value')).toBe('init');

    // 触发一次变更：同步一次后由防环守护终止，不无限循环
    engineA.setFieldValue('value', 'changed');
    expect(engineB.getFieldValue('value')).toBe('changed');
    expect(engineA.getFieldValue('value')).toBe('changed');
  });

  it('destroy 后：注册表注销 + 跨表单订阅清理', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ value: { type: 'string' } }), { value: 'v0' });
    engineB.init(
      baseSchema({
        copy: {
          type: 'string',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['value'],
              fulfill: { state: { value: '{{ $deps[0] }}' } },
            },
          ],
        },
      }),
    );
    expect(engineB.getFieldValue('copy')).toBe('v0');

    engineB.destroy();
    expect(registry.has('formB')).toBe(false);
    expect(registry.has('formA')).toBe(true);

    // 订阅已清理：源表单再变化不会写回已销毁的表单（不抛错）
    engineA.setFieldValue('value', 'v1');
  });

  it('init 重新解析后跨表单联动重建（setSchema 场景）', () => {
    const registry = createFormRegistry();
    const engineA = new NexusEngine({ formId: 'formA', registry });
    const engineB = new NexusEngine({ formId: 'formB', registry });

    engineA.init(baseSchema({ mode: { type: 'string' } }), { mode: 'on' });
    engineB.init(
      baseSchema({
        switchState: {
          type: 'string',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['mode'],
              fulfill: { state: { value: '{{ $deps[0] }}' } },
            },
          ],
        },
      }),
    );
    expect(engineB.getFieldValue('switchState')).toBe('on');

    // 替换 schema（保留数据）→ 联动重建后仍生效
    engineB.setSchema(
      baseSchema({
        switchState: {
          type: 'string',
          reactions: [
            {
              crossForm: 'formA',
              dependencies: ['mode'],
              fulfill: { state: { value: '{{ $deps[0] }}' } },
            },
          ],
        },
      }),
    );
    engineA.setFieldValue('mode', 'off');
    expect(engineB.getFieldValue('switchState')).toBe('off');
  });
});

describe('FormRegistry clear 隔离', () => {
  it('clear 后表单不可寻址（测试场景隔离）', () => {
    const registry = new FormRegistry();
    const engine = new NexusEngine({ formId: 'a', registry });
    engine.init(baseSchema({ x: { type: 'string' } }));
    registry.clear();
    expect(registry.has('a')).toBe(false);
  });
});
