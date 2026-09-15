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
});
