import { render as renderForm } from '@testing-library/react';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { describe, expect, it } from 'vitest';
import { registerAntdUI } from '../src';

// list / cardList 共用的只读 widget 标记组件
function StubReadOnlyWidget(props: {
  value?: unknown;
  path?: string;
}) {
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
  function TestForm() {
    const [form] = useForm();
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
  return renderForm(<TestForm />);
}

describe('listWidget 集成测试', () => {
  it('渲染 Collapse 容器 + 添加按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          props: { hideDelete: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('collapsible=false 时不渲染 Collapse', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            props: { collapsible: false, hideDelete: true },
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', title: '名称', widget: 'input' },
              },
            },
          },
        },
      },
      { initialValues: { items: [{ name: 'A' }] } },
    );
    expect(container.querySelector('.ant-collapse')).toBeNull();
    // 非折叠模式仍应渲染卡片式列表项
    expect(container.querySelector('.ant-space')).not.toBeNull();
  });

  it('dragSort=true 时渲染拖拽手柄', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          props: { dragSort: true, hideDelete: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.querySelector('.ant-collapse')).not.toBeNull();
  });

  it('hideAdd 时不显示添加按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
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
    expect(container.textContent).not.toContain('添加');
  });

  it('hideDelete 时不显示删除按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          props: { hideDelete: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.textContent).not.toContain('删除');
  });

  it('hideMove 时不显示上移/下移按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          props: { hideMove: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.textContent).not.toContain('上移');
    expect(container.textContent).not.toContain('下移');
  });

  it('hideCopy 时不显示复制按钮', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          props: { hideCopy: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.textContent).not.toContain('复制');
  });

  it('空数组时显示暂无数据', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            props: { hideDelete: true },
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', title: '名称', widget: 'input' },
              },
            },
          },
        },
      },
      { initialValues: { items: [] } },
    );
    expect(container.textContent).toContain('暂无数据');
  });

  it('自定义 addText', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'list',
          props: { hideDelete: true, addText: '新增条目' },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
    });
    expect(container.textContent).toContain('新增条目');
  });

  it('字段配 readOnlyWidget 时，列表级 readOnly 切换到该 widget（折叠模式）', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            props: { readOnly: true, hideDelete: true },
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

  it('字段配 readOnlyWidget 时，collapsible=false 列表级 readOnly 切换到该 widget', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            props: { collapsible: false, readOnly: true, hideDelete: true },
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

  it('未配 readOnlyWidget 时列表级 readOnly 兜底为纯文本（折叠模式）', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            props: { readOnly: true, hideDelete: true },
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', title: '名称', widget: 'input' },
              },
            },
          },
        },
      },
      { initialValues: { items: [{ name: 'plain' }] } },
    );
    expect(container.textContent).toContain('plain');
    expect(container.querySelector('.text-red-500')).toBeNull();
  });
});

describe('cardListWidget 集成测试', () => {
  it('字段配 readOnlyWidget 时，列表级 readOnly 切换到该 widget（默认 card 主题）', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'cardList',
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

  it('未配 readOnlyWidget 时列表级 readOnly 兜底为纯文本（card 主题）', () => {
    const { container } = renderWithForm({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          widget: 'cardList',
          props: { readOnly: true },
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', title: '名称', widget: 'input' },
            },
          },
        },
      },
      initialValues: { items: [{ name: 'plain' }] },
    } as never);
    expect(container.textContent).toContain('plain');
    expect(container.querySelector('.text-red-500')).toBeNull();
  });

  it('lineTitle 主题：字段配 readOnlyWidget 时切换渲染', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'cardList',
            props: { readOnly: true, theme: 'lineTitle' },
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

  it('collapse 主题：字段配 readOnlyWidget 时切换渲染', () => {
    const { container } = renderWithForm(
      {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'cardList',
            props: { readOnly: true, theme: 'collapse' },
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
});
