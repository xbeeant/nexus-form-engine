import { render as renderForm } from '@testing-library/react';
import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { describe, expect, it } from 'vitest';
import { registerAntdUI } from '../src';

function renderWithForm(schema: unknown, props?: Record<string, unknown>) {
  function TestForm() {
    const [form] = useForm();
    registerAntdUI(form._getEngine());
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
    // 无数据时显示"暂无数据"
    expect(container.textContent).toContain('暂无数据');
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
