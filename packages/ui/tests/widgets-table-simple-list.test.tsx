import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { fireEvent, render as renderForm } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { registerAntdUI } from '../src';

// 只读 widget 标记组件，供 readOnlyWidget 渲染测试用
function StubReadOnlyWidget(props: { value?: unknown; path?: string }) {
  return (
    <span
      data-testid='stub-readonly-widget'
      data-nexus-field={props.path}
      data-readonly-widget-value={String(props.value ?? '')}
    >
      只读-{String(props.value ?? '')}
    </span>
  );
}

function renderWithForm(
  schema: unknown,
  props?: Record<string, unknown>,
  options?: { customWidgets?: Record<string, (props: any) => React.ReactNode> },
) {
  let holder: ReturnType<typeof useForm>[0] | undefined;
  function TestForm() {
    const [form] = useForm();
    holder = form;
    const engine = form._getEngine();
    registerAntdUI(engine);
    if (options?.customWidgets) {
      engine.registerWidgets(options.customWidgets);
    }
    return (
      <NexusForm
        form={form}
        schema={schema as never}
        footer={false}
        {...(props as never)}
      />
    );
  }
  const result = renderForm(<TestForm />);
  return { ...result, form: holder as ReturnType<typeof useForm>[0] };
}

describe('tableListWidget 集成测试', () => {
  it('渲染 antd Table 控件', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'tableList',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('隐藏添加按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'tableList',
          props: { hideAdd: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    // hideAdd 时不渲染「添加一行」按钮
    expect(container.textContent).not.toContain('添加一行');
    // 仍保留一行可录入的占位行（保证 hideAdd 场景也能填第一行数据）
    expect(container.querySelector('input')).not.toBeNull();
  });

  it('占位行不进数据，首次输入即落为第一行真实数据', () => {
    const { container, form } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'tableList',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
              age: { type: 'number', title: '年龄', widget: 'number' },
            },
          },
        },
      },
    });
    const engine = form._getEngine();

    // 占位行纯 UI：数组值仍为空，formData 不含 [{}] 脏行
    expect((engine.getFieldValue('items') as unknown[]) ?? []).toEqual([]);

    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'hello' },
    });

    // 首次输入把占位行升级为完整的第一行数据（其余子字段取 schema 默认值）
    expect(engine.getFieldValue('items')).toEqual([
      { name: 'hello', age: undefined },
    ]);
    expect(engine.getFormData().items).toEqual([
      { name: 'hello', age: undefined },
    ]);
  });

  it('占位行：schema 声明 readOnly 的字段只读展示，不渲染可编辑控件', () => {
    const { container, form } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'tableList',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
              code: {
                type: 'string',
                title: '编码',
                widget: 'input',
                readOnly: true,
              },
            },
          },
        },
      },
    });
    const engine = form._getEngine();

    // 仅可读字段不给输入框，渲染占位文本（空值格式化为 '-'）
    expect(container.querySelectorAll('input')).toHaveLength(1);
    expect(container.textContent).toContain('-');

    // 可编辑单元格仍能从占位行录入第一行
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'hello' },
    });
    expect(engine.getFieldValue('items')).toEqual([
      { name: 'hello', code: '' },
    ]);
  });
});

describe('simpleListWidget 集成测试', () => {
  it('简单类型：渲染输入行 + 添加按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'simpleList',
          items: { type: 'string', widget: 'input' },
        },
      },
    });
    expect(container.textContent).toContain('添加');
  });

  it('空数组时显示暂无数据', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'simpleList',
            items: { type: 'string', widget: 'input' },
          },
        },
      },
      { initialValues: { items: [] } },
    );
    expect(container.textContent).toContain('暂无数据');
  });

  it('隐藏添加按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'simpleList',
          props: { hideAdd: true },
          items: { type: 'string', widget: 'input' },
        },
      },
    });
    // hideAdd 时不应显示"添加"按钮
    expect(container.textContent).not.toContain('添加');
  });

  it('hideMove 时不显示上移/下移按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'simpleList',
          hideMove: true,
          items: { type: 'string', widget: 'input' },
        },
      },
    });
    expect(container.textContent).not.toContain('上移');
    expect(container.textContent).not.toContain('下移');
  });

  it('hideDelete 时不显示删除按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'simpleList',
          hideDelete: true,
          items: { type: 'string', widget: 'input' },
        },
      },
    });
    expect(container.textContent).not.toContain('删除');
  });
});

// ── readOnlyWidget 在列表项中生效（list/table-list/simple-list/card-list 共用 RenderItemReadOnly） ──

describe('列表 readOnlyWidget 渲染', () => {
  it('tableList: 字段配 readOnlyWidget 时，列表级 readOnly 切换到该 widget', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'tableList',
            props: { readOnly: true },
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  title: '名称',
                  widget: 'input',
                  readOnly: true,
                  readOnlyWidget: 'stubReadOnlyWidget',
                },
              },
            },
          },
        },
      },
      { initialValues: { items: [{ name: 'hello' }] } },
      { customWidgets: { stubReadOnlyWidget: StubReadOnlyWidget } },
    );
    expect(
      container.querySelector('[data-testid="stub-readonly-widget"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });

  it('tableList: 字段未配 readOnlyWidget 时，列表级 readOnly 兜底 formatFieldValue 纯文本', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'tableList',
          props: { readOnly: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
      initialValues: { items: [{ name: 'hello' }] },
    } as never);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.textContent).toContain('hello');
    expect(container.querySelector('.text-red-500')).toBeNull();
  });

  it('tableList: 字段配 readOnlyWidget 但未注册时，列表级 readOnly 兜底 formatFieldValue 纯文本', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'tableList',
          props: { readOnly: true },
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                title: '名称',
                widget: 'input',
                readOnly: true,
                readOnlyWidget: 'unRegisteredWidget',
              },
            },
          },
        },
      },
      initialValues: { items: [{ name: 'hello' }] },
    } as never);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.textContent).toContain('hello');
    expect(container.querySelector('.text-red-500')).toBeNull();
  });

  it('simpleList: 字段配 readOnlyWidget 时，列表级 readOnly 切换到该 widget', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'simpleList',
            props: { readOnly: true },
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  title: '名称',
                  widget: 'input',
                  readOnly: true,
                  readOnlyWidget: 'stubReadOnlyWidget',
                },
              },
            },
          },
        },
      },
      { initialValues: { items: [{ name: 'world' }] } },
      { customWidgets: { stubReadOnlyWidget: StubReadOnlyWidget } },
    );
    expect(
      container.querySelector('[data-testid="stub-readonly-widget"]'),
    ).not.toBeNull();
    expect(container.textContent).toContain('world');
  });

  it('simpleList: 简单类型项配 readOnlyWidget 时，列表级 readOnly 切换到该 widget', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'simpleList',
            props: { readOnly: true },
            items: {
              type: 'string',
              widget: 'input',
              readOnly: true,
              readOnlyWidget: 'stubReadOnlyWidget',
            },
          },
        },
      },
      { initialValues: { items: ['hello'] } },
      { customWidgets: { stubReadOnlyWidget: StubReadOnlyWidget } },
    );
    expect(
      container.querySelector('[data-testid="stub-readonly-widget"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });

  it('simpleList: 未配 readOnlyWidget 时列表级 readOnly 兜底纯文本', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'simpleList',
          props: { readOnly: true },
          items: { type: 'string', widget: 'input' },
        },
      },
      initialValues: { items: ['plain'] },
    } as never);
    expect(container.textContent).toContain('plain');
    expect(container.querySelector('.text-red-500')).toBeNull();
  });
});
