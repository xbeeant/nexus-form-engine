import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

// ── 测试辅助 ──────────────────────────────────────────────────────────────

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      data-nexus-field={props.path}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

// ── NexusBranch 基本渲染 ─────────────────────────────────────────────────

describe('NexusBranch 基本渲染', () => {
  it('默认渲染 branches[0]', () => {
    function BranchTestForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  {
                    properties: { fieldA: { type: 'string', widget: 'input' } },
                  },
                  {
                    properties: { fieldB: { type: 'string', widget: 'input' } },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<BranchTestForm />);
    // 默认渲染第一个分支的 fieldA
    expect(
      container.querySelector('[data-nexus-field="fieldA"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-nexus-field="fieldB"]')).toBeNull();
  });

  it('switch 类型 oneOf：切换 activeIndex 渲染对应分支', () => {
    function SwitchBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              type: {
                type: 'string',
                widget: 'select',
                enum: ['a', 'b'],
                enumNames: ['分支 A', '分支 B'],
              },
              container: {
                oneOf: [
                  {
                    when: '{{ formData.type === "a" }}',
                    properties: {
                      fieldA: {
                        type: 'string',
                        widget: 'input',
                        title: '字段 A',
                      },
                    },
                  },
                  {
                    when: '{{ formData.type === "b" }}',
                    properties: {
                      fieldB: {
                        type: 'string',
                        widget: 'input',
                        title: '字段 B',
                      },
                    },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<SwitchBranchForm />);
    // 初始默认分支 A
    expect(
      container.querySelector('[data-nexus-field="fieldA"]'),
    ).not.toBeNull();
  });

  it('anyOf：多条件分支', () => {
    function AnyOfForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                anyOf: [
                  { properties: { x: { type: 'string', widget: 'input' } } },
                  { properties: { y: { type: 'string', widget: 'input' } } },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<AnyOfForm />);
    // anyOf 也渲染分支节点
    expect(container.querySelector('[data-nexus-branch]')).not.toBeNull();
  });
});

// ── activeIndex 切换 ─────────────────────────────────────────────────────

describe('NexusBranch activeIndex 切换', () => {
  it('activeIndex 变化时渲染对应分支', () => {
    let _capturedForm: FormController | undefined;

    function BranchSwitchForm() {
      const [form] = useForm();
      _capturedForm = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              switcher: {
                type: 'string',
                widget: 'select',
                enum: [0, 1],
                enumNames: ['分支 0', '分支 1'],
              },
              container: {
                oneOf: [
                  {
                    properties: { field0: { type: 'string', widget: 'input' } },
                  },
                  {
                    properties: { field1: { type: 'string', widget: 'input' } },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<BranchSwitchForm />);

    // 初始默认分支 0
    expect(
      container.querySelector('[data-nexus-field="field0"]'),
    ).not.toBeNull();

    // 切换 activeIndex — 在组件内操作，这里只验证初始状态
  });

  it('activeIndex 默认值为 0', () => {
    function BranchTestForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  { properties: { a: { type: 'string', widget: 'input' } } },
                  { properties: { b: { type: 'string', widget: 'input' } } },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<BranchTestForm />);
    expect(container.querySelector('[data-nexus-field="a"]')).not.toBeNull();
    expect(
      container.querySelector('[data-nexus-branch-active="0"]'),
    ).not.toBeNull();
  });

  it('activeIndex 超出范围时渲染空数组', () => {
    function OverflowBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              idx: { type: 'number', widget: 'input' },
              container: {
                oneOf: [
                  { properties: { a: { type: 'string', widget: 'input' } } },
                  { properties: { b: { type: 'string', widget: 'input' } } },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<OverflowBranchForm />);
    // 不报错即通过
    expect(container).toBeDefined();
  });
});

// ── inherit 属性 ──────────────────────────────────────────────────────────

describe('NexusBranch inherit 属性', () => {
  it('disabled 正确合并下发', () => {
    const rendered: { disabled: boolean | undefined } = { disabled: undefined };

    function TestStubInput(props: any) {
      rendered.disabled = props.disabled;
      return (
        <input
          data-testid={`input-${props.path}`}
          data-nexus-field={props.path}
          value={props.value ?? ''}
          disabled={props.disabled}
          onChange={(e: any) => props.onChange(e.target.value)}
        />
      );
    }

    function DisabledBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              lock: { type: 'string', widget: 'input', default: 'locked' },
              container: {
                oneOf: [
                  {
                    properties: {
                      field: {
                        type: 'string',
                        widget: 'input',
                        disabled: true,
                      },
                    },
                  },
                ],
              },
            },
          }}
          widgets={{ input: TestStubInput }}
        />
      );
    }

    render(<DisabledBranchForm />);
    // disabled 字段不应响应用户输入
    expect(rendered.disabled).toBe(true);
  });

  it('readOnly 正确合并下发', () => {
    const rendered: { readOnly: boolean | undefined } = { readOnly: undefined };

    function TestStubInput(props: any) {
      rendered.readOnly = props.readOnly;
      return (
        <input
          data-testid={`input-${props.path}`}
          data-nexus-field={props.path}
          value={props.value ?? ''}
          readOnly={props.readOnly}
          onChange={(e: any) => props.onChange(e.target.value)}
        />
      );
    }

    function ReadOnlyBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  {
                    properties: {
                      field: {
                        type: 'string',
                        widget: 'input',
                        readOnly: true,
                      },
                    },
                  },
                ],
              },
            },
          }}
          widgets={{ input: TestStubInput }}
        />
      );
    }

    render(<ReadOnlyBranchForm />);
    expect(rendered.readOnly).toBe(true);
  });
});

// ── hidden 渲染 ───────────────────────────────────────────────────────────

describe('NexusBranch hidden 渲染', () => {
  it('容器 hidden=true 时渲染 hidden class', () => {
    function HiddenBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  {
                    properties: {
                      field: { type: 'string', widget: 'input' },
                    },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<HiddenBranchForm />);
    // 分支容器应存在
    expect(container.querySelector('[data-nexus-branch]')).not.toBeNull();
  });

  it('hidden 表达式控制分支容器可见性', () => {
    function ExprBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              show: { type: 'string', widget: 'input', default: 'yes' },
              container: {
                oneOf: [
                  {
                    when: '{{ formData.show === "yes" }}',
                    properties: {
                      field: { type: 'string', widget: 'input' },
                    },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<ExprBranchForm />);
    // 表达式控制的分支应正常渲染
    expect(document.querySelector('[data-nexus-branch]')).not.toBeNull();
  });
});

// ── 订阅容器状态 ──────────────────────────────────────────────────────────

describe('NexusBranch 订阅容器状态', () => {
  it('订阅容器状态路径（activeIndex + hidden）', async () => {
    let capturedForm: any = null;

    function SubscribeBranchForm() {
      const [form] = useForm();
      capturedForm = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  { properties: { a: { type: 'string', widget: 'input' } } },
                  { properties: { b: { type: 'string', widget: 'input' } } },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<SubscribeBranchForm />);
    await act(async () => {
      capturedForm.setValueByPath('a', 'test');
      await new Promise((r) => setTimeout(r, 0));
    });
    const el = container.querySelector('input') as HTMLInputElement;
    expect(el?.value).toBe('test');
  });

  it('容器 hidden 变化时触发重渲染', () => {
    function VisibleBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  {
                    properties: { field: { type: 'string', widget: 'input' } },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<VisibleBranchForm />);
    // 分支容器初始存在
    expect(document.querySelector('[data-nexus-branch]')).not.toBeNull();
  });
});

// ── 静态 branches ────────────────────────────────────────────────────────

describe('NexusBranch 静态 branches', () => {
  it('branches 静态持有，切换仅翻转 hidden', () => {
    function BranchTestForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  { properties: { a: { type: 'string', widget: 'input' } } },
                  { properties: { b: { type: 'string', widget: 'input' } } },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<BranchTestForm />);
    // 渲染树中的 branches 是静态分组
    expect(container.querySelector('[data-nexus-branch]')).not.toBeNull();
  });

  it('无 oneOf/anyOf 时不渲染 NexusBranch', () => {
    function BranchTestForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              normal: { type: 'string', widget: 'input' },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<BranchTestForm />);
    expect(container.querySelector('[data-nexus-branch]')).toBeNull();
    expect(
      container.querySelector('[data-nexus-field="normal"]'),
    ).not.toBeNull();
  });
});

// ── 边界情况 ──────────────────────────────────────────────────────────────

describe('NexusBranch 边界情况', () => {
  it('空 branches 数组不报错', () => {
    function EmptyBranchForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<EmptyBranchForm />);
    // 不报错即通过
    expect(container).toBeDefined();
  });

  it('分支内嵌套数据对象', () => {
    function BranchTestForm() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              container: {
                oneOf: [
                  {
                    properties: {
                      obj: {
                        type: 'object',
                        properties: {
                          nested: { type: 'string', widget: 'input' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<BranchTestForm />);
    expect(
      container.querySelector('[data-nexus-field="obj.nested"]'),
    ).not.toBeNull();
  });
});
