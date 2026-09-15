import { describe, expect, it, vi } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { buildWidgetProps } from '../src/utils/build-widget-props';

// ── 测试辅助 ──────────────────────────────────────────────────────────────

function _mockForm(): FormController {
  return (
    new (globalThis as any).FormController() ??
    new (require('../src/components/form-controller').FormController)()
  );
}

function createMockForm(): FormController {
  const controller = {
    getValues: vi.fn(() => ({ name: 'test', email: 't@t.com' })),
    setValueByPath: vi.fn(),
    getValueByPath: vi.fn((p: string) => {
      if (p === 'parent') {
        return { child: 'val' };
      }
      return undefined;
    }),
    validateFields: vi.fn(async () => new Map()),
    submit: vi.fn(async () => {}),
    resetFields: vi.fn(),
    setSchema: vi.fn(),
    setSchemaByPath: vi.fn(),
    getSchema: vi.fn(() => ({ type: 'object' })),
    getHiddenValues: vi.fn(() => ({ hidden: 'val' })),
  } as unknown as FormController;
  return controller;
}

// ── buildWidgetProps base props ───────────────────────────────────────────

describe('buildWidgetProps base props', () => {
  const form = createMockForm();

  it('透传 schema/disabled/readOnly/required/loading/hidden', () => {
    const props = buildWidgetProps(
      {
        schema: { type: 'string' },
        disabled: true,
        readOnly: true,
        required: true,
        loading: true,
        hidden: true,
      },
      {
        dataPath: 'username',
        path: 'username',
        value: 'test',
        onChange: vi.fn(),
        form,
      },
    );
    expect(props.schema).toEqual({ type: 'string', dataPath: 'username' });
    expect(props.disabled).toBe(true);
    expect(props.readOnly).toBe(true);
    expect(props.required).toBe(true);
    expect(props.loading).toBe(true);
    expect(props.hidden).toBe(true);
  });

  it('透传 placeholder/options/dependValues/items/remoteVersion', () => {
    const props = buildWidgetProps(
      {
        placeholder: '请输入',
        options: [{ label: 'A', value: 1 }],
        dependValues: ['CN'],
        items: { type: 'string' },
        remoteVersion: 3,
      },
      {
        dataPath: 'city',
        value: 'Beijing',
        onChange: vi.fn(),
        form,
      },
    );
    expect(props.placeholder).toBe('请输入');
    expect(props.options).toEqual([{ label: 'A', value: 1 }]);
    expect(props.dependValues).toEqual(['CN']);
    expect(props.items).toEqual({ type: 'string' });
    expect(props.remoteVersion).toBe(3);
  });

  it('展开 base（schema.dataPath/path/value/onChange），dataPath 不透传', () => {
    const onChange = vi.fn();
    const props = buildWidgetProps(
      {},
      {
        dataPath: 'field-a',
        path: 'field-a',
        value: 42,
        onChange,
        form,
      },
    );
    // dataPath 不直接透传：widget 通过 schema.dataPath 读取
    expect(props.dataPath).toBeUndefined();
    expect(props.schema).toEqual({ dataPath: 'field-a' });
    expect(props.path).toBe('field-a');
    expect(props.value).toBe(42);
    expect(props.onChange).toBe(onChange);
  });

  it('dataPath 已声明于 schema 时以附加值为准', () => {
    const props = buildWidgetProps(
      { schema: { type: 'string', widget: 'input' } },
      { dataPath: 'dp', path: 'dp', value: 1, onChange: vi.fn(), form },
    );
    expect(props.schema).toEqual({
      type: 'string',
      widget: 'input',
      dataPath: 'dp',
    });
  });
});

// ── addons 构造 ──────────────────────────────────────────────────────────

describe('buildWidgetProps addons 构造', () => {
  const form = createMockForm();

  it('formData/rootValue 动态 getter 返回 form.getValues()', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    expect(props.addons.formData).toEqual({ name: 'test', email: 't@t.com' });
    expect(props.addons.rootValue).toEqual({ name: 'test', email: 't@t.com' });
  });

  it('value 优先 addonsValue，回退 base.value', () => {
    const props1 = buildWidgetProps(
      { addonsValue: 'override' },
      { dataPath: 'a', value: 'base', onChange: vi.fn(), form },
    );
    // addons.value 优先 addonsValue
    expect(props1.addons.value).toBe('override');
    // top-level value 来自 base.value（...base 展开）
    expect(props1.value).toBe('base');

    const props2 = buildWidgetProps(
      {},
      { dataPath: 'a', value: 'base', onChange: vi.fn(), form },
    );
    expect(props2.addons.value).toBe('base');
    expect(props2.value).toBe('base');
  });

  it('dataPath/path 正确传递', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a.b', path: 'a.b', value: 1, onChange: vi.fn(), form },
    );
    expect(props.addons.dataPath).toBe('a.b');
    expect(props.addons.path).toBe('a.b');
  });

  it('dataPath 为 undefined 时回退 path', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: undefined, path: 'alt', value: 1, onChange: vi.fn(), form },
    );
    expect(props.addons.dataPath).toBe('alt');
  });

  it('path 回退 addonsDataPath', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'dp', path: undefined, value: 1, onChange: vi.fn(), form },
    );
    expect(props.addons.path).toBe('dp');
  });

  it('parentValues：addonsItemOf 存在时获取父级值', () => {
    const mockForm2 = createMockForm();
    const props = buildWidgetProps(
      { addonsItemOf: 'parent' },
      {
        dataPath: 'parent.child',
        value: 'x',
        onChange: vi.fn(),
        form: mockForm2,
      },
    );
    expect(props.addons.parentValues).toEqual({ child: 'val' });
  });

  it('parentValues 不存在时 undefined', () => {
    const mockForm2 = createMockForm();
    const props = buildWidgetProps(
      { addonsItemOf: 'nonexistent' },
      { dataPath: 'root', value: 'x', onChange: vi.fn(), form: mockForm2 },
    );
    expect(props.addons.parentValues).toBeUndefined();
  });

  it('getValue/setValue 代理 form 对应方法', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.getValue('some.path');
    expect(form.getValueByPath).toHaveBeenCalledWith('some.path');

    props.addons.setValue('other', 'v');
    expect(form.setValueByPath).toHaveBeenCalledWith('other', 'v');
  });

  it('onItemChange 代理 setValueByPath', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.onItemChange('x', 'y');
    expect(form.setValueByPath).toHaveBeenCalledWith('x', 'y');
  });

  it('validate 代理 validateFields', async () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'target', value: 1, onChange: vi.fn(), form },
    );
    await props.addons.validate('specific');
    expect(form.validateFields).toHaveBeenCalledWith(['specific']);

    // 无参数时代理 addonsDataPath
    await props.addons.validate();
    expect(form.validateFields).toHaveBeenCalledWith(['target']);
  });

  it('validateFields 代理 form.validateFields', async () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    await props.addons.validateFields(['b', 'c']);
    expect(form.validateFields).toHaveBeenCalledWith(['b', 'c']);
  });

  it('getFieldsValue 代理 form.getValues', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.getFieldsValue(['x', 'y'], { omitNil: true });
    expect(form.getValues).toHaveBeenCalledWith(['x', 'y'], { omitNil: true });
  });

  it('getValues 代理 form.getValues', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.getValues(['p'], { omitNil: false });
    expect(form.getValues).toHaveBeenCalledWith(['p'], { omitNil: false });
  });

  it('getHiddenValues 代理 form.getHiddenValues', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    const hidden = props.addons.getHiddenValues();
    expect(hidden).toEqual({ hidden: 'val' });
  });

  it('submit 代理 form.submit', async () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    await props.addons.submit();
    expect(form.submit).toHaveBeenCalled();
  });

  it('resetFields 代理 form.resetFields', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.resetFields();
    expect(form.resetFields).toHaveBeenCalled();
  });

  it('setSchema 代理 form.setSchema', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.setSchema({ type: 'object', properties: {} });
    expect(form.setSchema).toHaveBeenCalled();
  });

  it('setSchemaByPath 代理 form.setSchemaByPath', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    props.addons.setSchemaByPath('path', { foo: 'bar' });
    expect(form.setSchemaByPath).toHaveBeenCalledWith('path', { foo: 'bar' });
  });

  it('getSchema 代理 form.getSchema', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    const schema = props.addons.getSchema();
    expect(schema).toEqual({ type: 'object' });
  });
});

// ── 数组字段 ──────────────────────────────────────────────────────────────

describe('buildWidgetProps 数组字段', () => {
  const form = createMockForm();

  it('addonsIndex 正确传递', () => {
    const props = buildWidgetProps(
      { addonsIndex: 3 },
      { dataPath: 'items[3].name', value: 'x', onChange: vi.fn(), form },
    );
    expect(props.addons.index).toBe(3);
  });

  it('addonsItemOf 正确传递', () => {
    const mockForm = createMockForm();
    // 覆盖 getValueByPath 返回 items 父级值
    mockForm.getValueByPath = vi.fn((p: string) => {
      if (p === 'items') {
        return { child: 'val' };
      }
      return undefined;
    });
    const props = buildWidgetProps(
      { addonsItemOf: 'items' },
      {
        dataPath: 'items[0].name',
        value: 'x',
        onChange: vi.fn(),
        form: mockForm,
      },
    );
    // addonsItemOf 用于构造 addons.parentValues
    expect(props.addons.parentValues).toEqual({ child: 'val' });
    // addonsIndex 透传
    const props2 = buildWidgetProps(
      { addonsIndex: 3 },
      {
        dataPath: 'items[3].name',
        value: 'x',
        onChange: vi.fn(),
        form: mockForm,
      },
    );
    expect(props2.addons.index).toBe(3);
  });
});

// ── 边界情况 ──────────────────────────────────────────────────────────────

describe('buildWidgetProps 边界情况', () => {
  const form = createMockForm();

  it('form 未提供 onChange 时仍返回 props', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'a', value: 1, onChange: vi.fn(), form },
    );
    expect(props.dataPath).toBeUndefined();
    expect(props.schema).toEqual({ dataPath: 'a' });
    expect(props.addons).toBeDefined();
  });

  it('所有 opts 参数均为 undefined 时不报错', () => {
    const props = buildWidgetProps(
      {},
      { dataPath: 'x', value: undefined, onChange: vi.fn(), form },
    );
    expect(props.dataPath).toBeUndefined();
    expect(props.schema).toEqual({ dataPath: 'x' });
    expect(props.disabled).toBeUndefined();
    expect(props.readOnly).toBeUndefined();
    expect(props.required).toBeUndefined();
    expect(props.loading).toBeUndefined();
    expect(props.hidden).toBeUndefined();
    expect(props.placeholder).toBeUndefined();
    expect(props.options).toBeUndefined();
    expect(props.dependValues).toBeUndefined();
    expect(props.items).toBeUndefined();
    expect(props.remoteVersion).toBeUndefined();
  });
});
