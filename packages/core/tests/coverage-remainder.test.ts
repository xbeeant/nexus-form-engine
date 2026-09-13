/**
 * 补充测试 — 覆盖其余零/低覆盖率边缘路径
 * 包括：async-validator 工厂函数、array-list hooks、engine getter/setter
 */

import { describe, expect, it } from 'vitest';
import { ArrayOperationsPlugin } from '../src/array-list';
import {
  AsyncValidatorPlugin,
  createAsyncValidatorPlugin,
} from '../src/async-validator';
import { NexusEngine } from '../src/engine';
import type { NexusSchema, Reaction } from '../src/types/schema';

const makeSchema = (
  props: Record<string, Record<string, unknown>>,
): NexusSchema => ({
  type: 'object',
  properties: props,
});

// ============================================================================
// createAsyncValidatorPlugin 工厂函数
// ============================================================================

describe('createAsyncValidatorPlugin', () => {
  it('应返回 AsyncValidatorPlugin 实例', () => {
    const engine = new NexusEngine();
    const plugin = createAsyncValidatorPlugin(engine);

    expect(plugin).toBeInstanceOf(AsyncValidatorPlugin);
    expect(plugin.name).toBe('async-validator');
    plugin.destroy();
    engine.destroy();
  });

  it('应支持传入自定义选项', () => {
    const engine = new NexusEngine();
    const plugin = createAsyncValidatorPlugin(engine, {
      timeout: 1000,
      debounce: 50,
    });

    expect(plugin).toBeInstanceOf(AsyncValidatorPlugin);
    plugin.destroy();
    engine.destroy();
  });
});

// ============================================================================
// ArrayOperationsPlugin hooks（onInit / onArrayOperation）
// ============================================================================

describe('ArrayOperationsPlugin hooks', () => {
  it('onInit 注入引擎实例', () => {
    const engine = new NexusEngine();
    const plugin = new ArrayOperationsPlugin(engine);

    // onInit 通过 engine.use() 自动调用
    engine.use(plugin);

    // 通过私有字段验证注入成功
    expect((plugin as any).engine).toBe(engine);
    engine.destroy();
  });

  it('onArrayOperation 钩子通过 engine.arrayOperation 触发', () => {
    const engine = new NexusEngine();
    const plugin = new ArrayOperationsPlugin(engine);
    engine.use(plugin);

    engine.init(
      makeSchema({
        items: { type: 'array', widget: 'list', items: { type: 'string' } },
      }),
    );
    engine.setFieldValue('items', ['a', 'b']);

    const result = engine.arrayOperation({
      path: 'items',
      operation: 'push',
      value: 'c',
    });
    expect(result).toEqual(['a', 'b', 'c']);
    engine.destroy();
  });

  it('未注册插件时 arrayOperation 返回 undefined', () => {
    const engine = new NexusEngine();
    engine.init(
      makeSchema({
        items: { type: 'array', widget: 'list', items: { type: 'string' } },
      }),
    );
    engine.setFieldValue('items', ['a']);

    const result = engine.arrayOperation({
      path: 'items',
      operation: 'push',
      value: 'b',
    });
    expect(result).toBeUndefined();
    engine.destroy();
  });
});

// ============================================================================
// Engine.getLocale
// ============================================================================

describe('Engine.getLocale', () => {
  it('默认返回 "zh-CN"', () => {
    const engine = new NexusEngine();
    expect(engine.getLocale()).toBe('zh-CN');
    engine.destroy();
  });

  it('自定义 locale 时返回对应值', () => {
    const engine = new NexusEngine({ locale: 'en-US' });
    expect(engine.getLocale()).toBe('en-US');
    engine.destroy();
  });
});

// ============================================================================
// Engine.getAllFieldStates
// ============================================================================

describe('Engine.getAllFieldStates', () => {
  it('返回所有字段状态的 Map 副本', () => {
    const engine = new NexusEngine();
    engine.init(
      makeSchema({
        name: { type: 'string' },
        age: { type: 'number' },
      }),
    );

    const states = engine.getAllFieldStates();
    expect(states.size).toBeGreaterThan(0);
    expect(states.has('name')).toBe(true);
    expect(states.has('age')).toBe(true);
  });

  it('返回的是副本，修改不影响内部状态', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    const states = engine.getAllFieldStates();
    states.delete('name');

    // 内部状态不受影响
    const states2 = engine.getAllFieldStates();
    expect(states2.has('name')).toBe(true);
  });
});

// ============================================================================
// Engine.getFieldsError / setErrorFields / removeErrorField
// ============================================================================

describe('Engine error management API', () => {
  it('getFieldsError 收集所有错误字段', () => {
    const engine = new NexusEngine();
    engine.init(
      makeSchema({
        name: { type: 'string', widget: 'input', rules: [{ required: true }] },
        email: { type: 'string', widget: 'input' },
      }),
    );

    engine.setFieldValue('name', '');
    engine.validate();

    const errors = engine.getFieldsError();
    expect(errors.has('name')).toBe(true);
    expect(errors.has('email')).toBe(false);
    engine.destroy();
  });

  it('getFieldsError 全部通过时返回空 Map', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    const errors = engine.getFieldsError();
    expect(errors.size).toBe(0);
    engine.destroy();
  });

  it('setErrorFields 批量设置错误', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    engine.setErrorFields([{ path: 'name', errors: ['必填'] }]);

    expect(engine.getFieldError('name')).toEqual(['必填']);
    engine.destroy();
  });

  it('setErrorFields 对不存在的字段静默处理', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    engine.setErrorFields([{ path: 'nonexistent', errors: ['错误'] }]);
    // 不抛错，静默跳过
    engine.destroy();
  });

  it('removeErrorField 清除指定字段错误', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    engine.setErrorFields([{ path: 'name', errors: ['错误'] }]);
    expect(engine.getFieldError('name')).toEqual(['错误']);

    engine.removeErrorField('name');
    expect(engine.getFieldError('name')).toEqual([]);
    engine.destroy();
  });

  it('removeErrorField 对无错误字段静默处理', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    expect(() => engine.removeErrorField('name')).not.toThrow();
    engine.destroy();
  });
});

// ============================================================================
// Engine.getDependencies
// ============================================================================

describe('Engine.getDependencies', () => {
  it('返回字段的依赖字段集合', () => {
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        fieldA: {
          type: 'string',
          widget: 'input',
          reactions: [
            {
              dependencies: ['fieldB'],
              fulfill: { state: { hidden: false } },
            } as Reaction,
          ],
        },
        fieldB: { type: 'string' },
      },
    });

    const deps = engine.getDependencies('fieldA');
    expect(deps.has('fieldB')).toBe(true);
    engine.destroy();
  });

  it('无依赖时返回空 Set', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    const deps = engine.getDependencies('name');
    expect(deps.size).toBe(0);
    engine.destroy();
  });
});

// ============================================================================
// Engine.subscribeAll
// ============================================================================

describe('Engine.subscribeAll', () => {
  it('数据变化时触发回调', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    let received: Record<string, unknown> | undefined;
    const unsub = engine.subscribeAll((data) => {
      received = data;
    });

    engine.setFieldValue('name', 'John');
    expect(received).toBeDefined();
    expect(received?.name).toBe('John');

    unsub();
    engine.destroy();
  });

  it('取消订阅后不再触发', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    let count = 0;
    const unsub = engine.subscribeAll(() => {
      count++;
    });
    unsub();

    engine.setFieldValue('name', 'John');
    expect(count).toBe(0);
    engine.destroy();
  });
});

// ============================================================================
// Engine.getRenderTree
// ============================================================================

describe('Engine.getRenderTree', () => {
  it('返回渲染树节点数组', () => {
    const engine = new NexusEngine();
    engine.init(
      makeSchema({
        name: { type: 'string', widget: 'input' },
      }),
    );

    const tree = engine.getRenderTree();
    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
    engine.destroy();
  });
});

// ============================================================================
// Engine.registerOnFieldValueChange
// ============================================================================

describe('Engine.registerOnFieldValueChange', () => {
  it('注册后字段值变化时触发回调', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    const calls: Array<[string, unknown]> = [];
    engine.registerOnFieldValueChange((path, value) => {
      calls.push([path, value]);
    });

    engine.setFieldValue('name', 'John');
    expect(calls.length).toBe(1);
    expect(calls[0][0]).toBe('name');
    expect(calls[0][1]).toBe('John');
    engine.destroy();
  });
});

// ============================================================================
// Engine.registerWidgets / registerLayouts
// ============================================================================

describe('Engine registerWidgets / registerLayouts', () => {
  it('registerWidgets 注册自定义组件', () => {
    const engine = new NexusEngine();
    const widget = () => null;
    engine.registerWidgets({ myWidget: widget });

    const retrieved = engine.getWidget('myWidget');
    expect(retrieved).toBe(widget);
    engine.destroy();
  });

  it('getWidget 未注册返回 undefined', () => {
    const engine = new NexusEngine();
    expect(engine.getWidget('nonexistent')).toBeUndefined();
    engine.destroy();
  });

  it('registerLayouts 注册布局组件', () => {
    const engine = new NexusEngine();
    const layout = () => null;
    engine.registerLayouts({ myLayout: layout });

    const retrieved = engine.getLayout('myLayout');
    expect(retrieved).toBe(layout);
    engine.destroy();
  });

  it('getLayout 未注册返回 undefined', () => {
    const engine = new NexusEngine();
    expect(engine.getLayout('nonexistent')).toBeUndefined();
    engine.destroy();
  });
});

// ============================================================================
// Engine.registerFieldWrapper / getFieldWrapper
// ============================================================================

describe('Engine registerFieldWrapper', () => {
  it('注册字段包裹组件', () => {
    const engine = new NexusEngine();
    const wrapper = () => null;
    engine.registerFieldWrapper(wrapper);

    expect(engine.getFieldWrapper()).toBe(wrapper);
    engine.destroy();
  });

  it('未注册时返回 undefined', () => {
    const engine = new NexusEngine();
    expect(engine.getFieldWrapper()).toBeUndefined();
    engine.destroy();
  });
});

// ============================================================================
// Engine.arrayOperation 完整分发流程
// ============================================================================

describe('Engine.arrayOperation 分发', () => {
  it('有 ArrayOperationsPlugin 时正常返回结果', () => {
    const engine = new NexusEngine();
    const plugin = new ArrayOperationsPlugin(engine);
    engine.use(plugin);
    engine.init(
      makeSchema({
        items: { type: 'array', widget: 'list', items: { type: 'string' } },
      }),
    );
    engine.setFieldValue('items', ['a']);

    const result = engine.arrayOperation({
      path: 'items',
      operation: 'push',
      value: 'b',
    });
    expect(result).toEqual(['a', 'b']);
    engine.destroy();
  });

  it('无 ArrayOperationsPlugin 时返回 undefined 并告警', () => {
    const engine = new NexusEngine();
    engine.init(
      makeSchema({
        items: { type: 'array', widget: 'list', items: { type: 'string' } },
      }),
    );
    engine.setFieldValue('items', ['a']);

    // 捕获 console.warn 输出
    let warnMsg = '';
    const origWarn = console.warn;
    console.warn = (msg: string) => {
      warnMsg = msg;
    };

    const result = engine.arrayOperation({
      path: 'items',
      operation: 'push',
      value: 'b',
    });

    console.warn = origWarn;
    expect(result).toBeUndefined();
    expect(warnMsg).toContain('No plugin handles arrayOperation');
    engine.destroy();
  });
});

// ============================================================================
// Engine.getFormId / setFormId
// ============================================================================

describe('Engine.getFormId / setFormId', () => {
  it('getFormId 默认返回 undefined', () => {
    const engine = new NexusEngine();
    expect(engine.getFormId()).toBeUndefined();
    engine.destroy();
  });

  it('setFormId 设置并注册表单 ID', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    engine.setFormId('my-form');
    expect(engine.getFormId()).toBe('my-form');
    engine.destroy();
  });

  it('setFormId 切换 ID 时注销旧 ID', () => {
    const engine = new NexusEngine();
    engine.init(makeSchema({ name: { type: 'string' } }));

    engine.setFormId('form-a');
    expect(engine.getFormId()).toBe('form-a');

    engine.setFormId('form-b');
    expect(engine.getFormId()).toBe('form-b');
    engine.destroy();
  });
});
