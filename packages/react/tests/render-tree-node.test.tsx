import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

// ── 测试辅助 ──────────────────────────────────────────────────────────────

const holder: { form?: FormController } = {};

function StubInput(props: any) {
  return <div>{props.path}</div>;
}

function StubCard(props: any) {
  return <div data-testid='stub-card'>{props.children}</div>;
}

function RenderTreeForm({
  schema,
  layouts,
}: {
  schema: unknown;
  layouts?: Record<string, (props: any) => React.ReactNode>;
}) {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      layouts={layouts}
      widgets={{ input: StubInput }}
    />
  );
}

// ── renderTreeNode 节点分发 ──────────────────────────────────────────────

describe('renderTreeNode 节点分发', () => {
  it('type: field → <NexusField />', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    expect(container.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });

  it('type: object → <NexusObject />', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            profile: {
              type: 'object',
              title: '个人信息',
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            },
          },
        }}
      />,
    );
    // NexusObject 可折叠，通过点击 title 折叠/展开
    expect(
      container.querySelector('[data-nexus-field="profile.name"]'),
    ).not.toBeNull();
  });

  it('type: branch → <NexusBranch />', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            container: {
              type: 'object',
              properties: {
                sub: {
                  type: 'object',
                  oneOf: [
                    { properties: { a: { type: 'string', widget: 'input' } } },
                  ],
                },
              },
            },
          },
        }}
      />,
    );
    expect(container.querySelector('[data-nexus-branch]')).not.toBeNull();
  });

  it('type: layout → <NexusLayout />', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            section: {
              type: 'card',
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            },
          },
        }}
        layouts={{ card: StubCard }}
      />,
    );
    expect(container.querySelector('[data-testid="stub-card"]')).not.toBeNull();
  });
});

// ── key 生成规则 ──────────────────────────────────────────────────────────

describe('renderTreeNode key 生成规则', () => {
  it('field 使用 layoutKey/dataPath 作为 key', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            field1: { type: 'string', widget: 'input' },
            field2: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    const fields = container.querySelectorAll('[data-nexus-field]');
    expect(fields.length).toBeGreaterThanOrEqual(2);
    const paths = Array.from(fields).map((f) =>
      f.getAttribute('data-nexus-field'),
    );
    expect(paths).toContain('field1');
    expect(paths).toContain('field2');
  });

  it('object 使用 object-layoutKey-index 作为 key', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            obj1: {
              type: 'object',
              title: '对象 1',
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            },
            obj2: {
              type: 'object',
              title: '对象 2',
              properties: {
                age: { type: 'string', widget: 'input' },
              },
            },
          },
        }}
      />,
    );
    // 对象容器通过 NexusObject 渲染
    expect(
      container.querySelector('[data-nexus-field="obj1.name"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-nexus-field="obj2.age"]'),
    ).not.toBeNull();
  });
});

// ── 多类型嵌套 ────────────────────────────────────────────────────────────

describe('renderTreeNode 多类型嵌套', () => {
  it('布局 → 数据对象 → 数据字段', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            card: {
              type: 'card',
              properties: {
                profile: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', widget: 'input' },
                  },
                },
              },
            },
          },
        }}
        layouts={{ card: StubCard }}
      />,
    );
    // 路径应透传布局节点
    expect(
      container.querySelector('[data-nexus-field="profile.name"]'),
    ).not.toBeNull();
  });

  it('数据对象 → 分支容器 → 字段', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            container: {
              type: 'object',
              properties: {
                sub: {
                  type: 'object',
                  oneOf: [
                    {
                      properties: {
                        field: { type: 'string', widget: 'input' },
                      },
                    },
                  ],
                },
              },
            },
          },
        }}
      />,
    );
    // branch 路径可能因布局透明而有不同路径
    expect(container.querySelector('[data-nexus-branch]')).not.toBeNull();
  });
});

// ── renderTreeNode 边界 ──────────────────────────────────────────────────

describe('renderTreeNode 边界情况', () => {
  it('未知 type → <NexusLayout />', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            custom: {
              type: 'customType',
              properties: {
                name: { type: 'string', widget: 'input' },
              },
            },
          },
        }}
      />,
    );
    // customType 有 properties → 布局容器，路径透传，实际 dataPath 为 'name'
    expect(container.querySelector('[data-nexus-field="name"]')).not.toBeNull();
  });

  it('空 schema 不报错', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {},
        }}
      />,
    );
    // 不报错即通过
    expect(container).toBeDefined();
  });
});

// ── 索引传递 ──────────────────────────────────────────────────────────────

describe('renderTreeNode index 传递', () => {
  it('index 正确传递给渲染组件的 key 生成', () => {
    const { container } = render(
      <RenderTreeForm
        schema={{
          type: 'object',
          properties: {
            a: { type: 'string', widget: 'input' },
            b: { type: 'string', widget: 'input' },
            c: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    const fields = container.querySelectorAll('[data-nexus-field]');
    expect(fields).toHaveLength(3);
  });
});
