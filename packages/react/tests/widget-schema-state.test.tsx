import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

const holder: { form?: FormController } = {};

// 本轮修复：widget 收到的 schema 中状态键必须为已求值的布尔（表达式 hidden/
// required 由 Parser 转 _autoExpr reaction 驱动），原始 {{ }} 字符串禁止泄漏到
// 自定义 widget（自定义 widget 直接读 schema.hidden 会拿到 truthy 字符串 → 误判隐藏）
function StubRadio(props: any) {
  return (
    <div data-testid={`radio-${props.path}`}>
      {(['1', '0'] as const).map((v) => (
        <button
          key={v}
          data-testid={`${props.path}-opt-${v}`}
          onClick={() => props.onChange(v)}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

describe('widget schema state keys are evaluated', () => {
  it('schema.hidden is boolean (never raw expression) and live toggles', async () => {
    const received: Array<{
      path: string;
      hidden: unknown;
      required: unknown;
    }> = [];

    function SchemaProbe(props: any) {
      received.push({
        path: props.path,
        hidden: props.schema?.hidden,
        required: props.schema?.required,
      });
      return (
        <input
          data-testid={`probe-${props.path}`}
          value={props.value ?? ''}
          onChange={(e) => props.onChange(e.target.value)}
        />
      );
    }

    const expr = "{{formData.approval === '1'}}";
    const schema: any = {
      type: 'object',
      properties: {
        approval: { type: 'string', enum: ['1', '0'], widget: 'radio' },
        // 表达式隐藏字段：hide 后 widget 卸载（占位符），hidden 始终为布尔
        target: {
          title: '目标',
          type: 'any',
          widget: 'probe',
          hidden: expr,
        },
        // 表达式必填字段：不隐藏，随 approval 实时更新 required
        reqField: {
          title: '必填项',
          type: 'any',
          widget: 'probe',
          required: expr,
        },
      },
    };

    function ProbeApp() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={schema}
          footer={false}
          widgets={{ radio: StubRadio, probe: SchemaProbe }}
        />
      );
    }

    const { getByTestId, container, rerender } = render(<ProbeApp />);
    // approval 未选 → 表达式 false：target 可见，widget 收到布尔 hidden=false（非字符串）
    const byPath = (p: string) => received.find((r) => r.path === p);
    const targetInit = byPath('target');
    expect(typeof targetInit?.hidden).toBe('boolean');
    expect(targetInit?.hidden).toBe(false);

    // approval='1' → 表达式 true：target 隐藏（占位符，widget 卸载），reqField 实时 required=true
    await act(async () => {
      fireEvent.click(getByTestId('approval-opt-1'));
    });
    rerender(<ProbeApp />);
    expect(
      container.querySelector('[data-nexus-hidden="target"]'),
    ).toBeTruthy();
    const state = holder.form!.getFieldState('reqField');
    expect(state?.required).toBe(true);
  });
});
