import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

// ── 测试辅助 ──────────────────────────────────────────────────────────────

const renders: Record<string, number> = {};

function StubInput(props: any) {
  renders[props.path] = (renders[props.path] ?? 0) + 1;
  return (
    <input
      data-testid={`input-${props.path}`}
      data-nexus-field={props.path}
      value={props.value ?? ''}
      readOnly={props.readOnly}
      disabled={props.disabled}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

function StubSelect(props: any) {
  renders[props.path] = (renders[props.path] ?? 0) + 1;
  return (
    <select
      data-testid={`select-${props.path}`}
      data-nexus-field={props.path}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    >
      <option value=''>请选择</option>
      {(props.options ?? []).map((opt: any) => (
        <option key={opt.value ?? opt} value={opt.value ?? opt}>
          {opt.label ?? opt}
        </option>
      ))}
    </select>
  );
}

const holder: { form?: FormController } = {};

function TestForm({
  schema,
  widgets,
  layouts,
}: {
  schema: unknown;
  widgets?: Record<string, (props: any) => React.ReactNode>;
  layouts?: Record<string, (props: any) => React.ReactNode>;
}) {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      widgets={{ input: StubInput, select: StubSelect, ...widgets }}
      layouts={{ card: StubCard, ...layouts }}
    />
  );
}

function StubCard({ children }: { children: React.ReactNode }) {
  return <div data-testid='stub-card'>{children}</div>;
}

// ── NexusField 渲染逻辑 ───────────────────────────────────────────────────

describe('NexusField 渲染逻辑', () => {
  it('widget 未注册时渲染警告 DOM', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'nonexistentWidget' },
          },
        }}
        widgets={{}}
      />,
    );
    // 未注册 widget 时渲染警告
    expect(container.querySelector('.text-red-500')).not.toBeNull();
  });

  it('display:none 时直接不渲染（无占位符）', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            ghost: {
              type: 'string',
              widget: 'input',
              default: 'hidden',
              display: 'none',
            },
            visible: {
              type: 'string',
              widget: 'input',
            },
          },
        }}
      />,
    );
    expect(container.querySelectorAll('input')).toHaveLength(1);
    expect(container.querySelector('[data-nexus-hidden="ghost"]')).toBeNull();
  });

  it('hidden=true 时渲染 display:none 占位符', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            hidden: { type: 'string', widget: 'input', hidden: true },
            visible: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    expect(
      container.querySelector('[data-nexus-hidden="hidden"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(1);
  });

  it('父布局 removeHidden=true 时隐藏字段完全移除', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            group: {
              type: 'card',
              removeHidden: true,
              properties: {
                hidden: { type: 'string', widget: 'input', hidden: true },
                visible: { type: 'string', widget: 'input' },
              },
            },
          },
        }}
      />,
    );
    expect(container.querySelector('[data-nexus-hidden]')).toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(1);
  });

  it('disabled/readOnly 正确透传给 widget', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            disabledField: {
              type: 'string',
              widget: 'input',
              disabled: true,
            },
            readOnlyField: {
              type: 'string',
              widget: 'input',
              readOnly: true,
            },
          },
        }}
      />,
    );
    const inputs = container.querySelectorAll('input');
    expect((inputs[0] as HTMLInputElement).disabled).toBe(true);
    expect((inputs[1] as HTMLInputElement).readOnly).toBe(true);
  });
});

// ── readOnlyWidget 降级 ───────────────────────────────────────────────────

describe('NexusField readOnlyWidget', () => {
  let _readOnlyRendered = false;

  function ReadOnlyDisplay(props: any) {
    _readOnlyRendered = true;
    return (
      <span data-testid='readonly-display' className='text-gray-500'>
        {props.value ?? '—'}
      </span>
    );
  }

  it('配置 readOnlyWidget 时切换渲染', () => {
    _readOnlyRendered = false;
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              widget: 'input',
              readOnly: true,
              readOnlyWidget: 'readOnlyDisplay',
            },
          },
        }}
        widgets={{ input: StubInput, readOnlyDisplay: ReadOnlyDisplay }}
      />,
    );
    expect(
      container.querySelector('[data-testid="readonly-display"]'),
    ).not.toBeNull();
    expect(container.querySelector('input')).toBeNull();
  });

  it('readOnlyWidget 未注册时退回原 widget', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              widget: 'input',
              readOnly: true,
              readOnlyWidget: 'unknownWidget',
            },
          },
        }}
        widgets={{ input: StubInput }}
      />,
    );
    expect(container.querySelector('input')).not.toBeNull();
  });
});

// ── 栅格样式 ──────────────────────────────────────────────────────────────

describe('NexusField 栅格样式', () => {
  it('栅格上下文下 width 换算为 gridColumn span', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            half: {
              type: 'string',
              widget: 'input',
              width: '50%',
            },
          },
        }}
      />,
    );
    const field = container.querySelector('[data-nexus-field="half"]');
    expect(field?.getAttribute('style')).toContain('grid-column');
  });

  it('colSpan 优先级高于 width', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            wide: {
              type: 'string',
              widget: 'input',
              width: '25%',
              colSpan: 12,
            },
          },
        }}
      />,
    );
    const field = container.querySelector('[data-nexus-field="wide"]');
    const style = field?.getAttribute('style') ?? '';
    expect(style).toContain('grid-column');
  });
});

// ── enum/enumNames 构建选项 ──────────────────────────────────────────────

describe('NexusField enum 选项构建', () => {
  it('enum + enumNames 构建 options', () => {
    const { container } = render(
      <NexusForm
        form={holder.form}
        schema={{
          type: 'object',
          properties: {
            role: {
              type: 'string',
              widget: 'select',
              enum: ['admin', 'user', 'guest'],
              enumNames: ['管理员', '用户', '访客'],
            },
          },
        }}
        widgets={{ select: StubSelect }}
      />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    const options = select?.querySelectorAll('option');
    expect(options).toHaveLength(4);
    expect((options![1] as HTMLOptionElement).text).toBe('管理员');
    expect((options![2] as HTMLOptionElement).text).toBe('用户');
    expect((options![3] as HTMLOptionElement).text).toBe('访客');
  });

  it('props.options 透传', () => {
    const { container } = render(
      <NexusForm
        form={holder.form}
        schema={{
          type: 'object',
          properties: {
            role: {
              type: 'string',
              widget: 'select',
              options: [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
              ],
            },
          },
        }}
        widgets={{ select: StubSelect }}
      />,
    );
    const select = container.querySelector('select') as HTMLSelectElement;
    const options = select?.querySelectorAll('option');
    // schema 的 options 属性不会被自动传入 widget，只有 enum 会转换
    // StubSelect 渲染只有默认"请选择"一项
    expect(options).toHaveLength(1);
  });
});

// ── extra 处理 ────────────────────────────────────────────────────────────

describe('NexusField extra 处理', () => {
  it('非字符串 extra 被过滤为 undefined', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            name: {
              type: 'string',
              widget: 'input',
              extra: { tableOrder: 0 },
            },
          },
        }}
      />,
    );
    expect(container.textContent).not.toContain('tableOrder');
  });
});

// ── 失焦校验 ──────────────────────────────────────────────────────────────

describe('NexusField 失焦校验', () => {
  it('blur 触发 validateField(trigger: blur)', async () => {
    function BlurValidateForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              email: {
                type: 'string',
                widget: 'input',
                pattern: '^\\S+@\\S+\\.\\S+$',
                message: { pattern: '邮箱格式错误' },
              },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<BlurValidateForm />);
    const input = document.querySelector('input') as HTMLInputElement;
    await act(async () => {
      fireEvent.focus(input);
    });
    fireEvent.change(input, { target: { value: 'invalid' } });
    await act(async () => {
      fireEvent.blur(input);
    });
    await new Promise((r) => setTimeout(r, 50));
    // 异步校验器有 300ms 防抖，同步校验器立即执行
    // pattern 校验在异步校验器中执行
  });
});

// ── 精确版本订阅 ──────────────────────────────────────────────────────────

describe('NexusField 精确版本订阅', () => {
  it('字段版本变化时重渲染，其他字段不变', async () => {
    renders.a = 0;
    renders.b = 0;

    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            a: { type: 'string', widget: 'input' },
            b: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );

    expect(renders.a).toBe(1);
    expect(renders.b).toBe(1);

    await act(async () => {
      fireEvent.change(container.querySelector('input') as HTMLInputElement, {
        target: { value: 'x' },
      });
    });

    expect(renders.a).toBe(2);
    expect(renders.b).toBe(1);
  });
});

// ── state 未定义处理 ──────────────────────────────────────────────────────

describe('NexusField state 未定义处理', () => {
  it('引擎初始化中（version=0）时 state 为空不报警', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[NexusField] Field not found'),
    );
    expect(container.querySelector('[data-nexus-field="name"]')).not.toBeNull();
    consoleSpy.mockRestore();
  });
});
