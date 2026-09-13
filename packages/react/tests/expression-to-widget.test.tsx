import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

// ── 测试辅助 ──────────────────────────────────────────────────────────────

const holder: { form?: FormController } = {};

function TestForm({
  schema,
  widgets,
}: {
  schema: unknown;
  widgets?: Record<string, (props: any) => React.ReactNode>;
}) {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      widgets={{ input: StubInput, ...widgets }}
    />
  );
}

/** 桩 widget：把接收到的 prop（placeholder / maxLength / dependValues）回显到 DOM，供断言 */
function StubInput(props: any) {
  return (
    <div>
      <input
        data-testid={`input-${props.path}`}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        data-maxlength={props.maxLength}
        data-theme={props.theme}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <span data-testid={`dep-${props.path}`}>
        {JSON.stringify(props.dependValues ?? {})}
      </span>
    </div>
  );
}

// ── 用例 ──────────────────────────────────────────────────────────────────

describe('表达式计算结果 → UI widget 传递（防泄漏）', () => {
  it('props.* / placeholder 表达式：widget 收到计算后的值，而非 {{ }} 字面量', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            limit: { type: 'number', widget: 'number', default: 10 },
            name: {
              type: 'string',
              widget: 'input',
              placeholder: "{{ formData.limit > 5 ? '长文本' : '短文本' }}",
              props: {
                maxLength: '{{ formData.limit }}',
                theme: "{{ formData.limit > 5 ? 'dark' : 'light' }}",
              },
            },
          },
        }}
      />,
    );

    const input = container.querySelector('[data-testid="input-name"]')!;
    expect(input.getAttribute('placeholder')).toBe('长文本');
    expect(input.getAttribute('data-maxlength')).toBe('10');
    expect(input.getAttribute('data-theme')).toBe('dark');
    // 不透传表达式字符串
    expect(container.innerHTML).not.toContain('{{');

    // 依赖变化 → 计算值实时更新并重新传给 widget
    act(() => {
      holder.form!.setValueByPath('limit', 3);
    });
    const input2 = container.querySelector('[data-testid="input-name"]')!;
    expect(input2.getAttribute('placeholder')).toBe('短文本');
    expect(input2.getAttribute('data-maxlength')).toBe('3');
    expect(input2.getAttribute('data-theme')).toBe('light');
  });

  it('dependValues：依赖字段变化后 widget 收到的是最新（已计算）值，而非首次快照', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            base: { type: 'number', widget: 'number', default: 2 },
            total: {
              type: 'number',
              widget: 'input',
              dependencies: ['base'],
              reactions: [
                {
                  dependencies: ['base'],
                  fulfill: {
                    state: { value: '{{ $deps[0] * 10 }}' },
                  },
                },
              ],
            },
          },
        }}
      />,
    );

    // 初始：total 由 reaction 计算，dependValues.base 为当前值
    const dep0 = container.querySelector('[data-testid="dep-total"]')!;
    expect(dep0.textContent).toBe(JSON.stringify({ base: 2 }));

    // 依赖字段变化 → 本字段 reaction 重算 → dependValues.b 更新为最新值
    act(() => {
      holder.form!.setValueByPath('base', 5);
    });
    const dep1 = container.querySelector('[data-testid="dep-total"]')!;
    expect(dep1.textContent).toBe(JSON.stringify({ base: 5 }));

    const totalInput = container.querySelector('[data-testid="input-total"]')!;
    expect((totalInput as HTMLInputElement).value).toBe('50');
  });

  it('静态文本 props / placeholder 不受影响', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            a: {
              type: 'string',
              widget: 'input',
              placeholder: '请输入',
              props: { maxLength: 200 },
            },
          },
        }}
      />,
    );
    const input = container.querySelector('[data-testid="input-a"]')!;
    expect(input.getAttribute('placeholder')).toBe('请输入');
    expect(input.getAttribute('data-maxlength')).toBe('200');
  });
});
