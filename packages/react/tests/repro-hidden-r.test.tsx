import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

const holder: { form?: FormController } = {};

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

function StubUser(props: any) {
  return (
    <input
      data-testid={`user-${props.path}`}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

const schema: any = {
  type: 'object',
  properties: {
    approval: {
      title: '是否同意',
      type: 'string',
      enum: ['1', '0'],
      widget: 'radio',
    },
    reviewer: {
      title: '需求域外评审人',
      type: 'any',
      widget: 'user',
      hidden: "{{formData.approval!== '1'}}",
    },
    reviewer2: {
      title: '需求开发执行方评审人',
      type: 'any',
      widget: 'user',
      hidden: "{{formData.approval!== '1'}}",
    },
  },
};

function App() {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      footer={false}
      widgets={{ radio: StubRadio, user: StubUser }}
    />
  );
}

describe('hidden expression on layout container (renderer)', () => {
  it('renders display:none placeholder and honors removeHidden', () => {
    const schemaLayout: any = {
      type: 'object',
      properties: {
        show: { type: 'boolean', widget: 'radio', enum: ['1', '0'] },
        cardArea: {
          type: 'card',
          title: '卡片区域',
          hidden: "{{formData.show === '1'}}",
          properties: {
            name: { type: 'string', widget: 'user' },
          },
        },
      },
    };

    function LayoutApp() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={schemaLayout}
          footer={false}
          widgets={{ radio: StubRadio, user: StubUser }}
        />
      );
    }

    const { getByTestId, container, rerender } = render(<LayoutApp />);
    const hiddenOf = (path: string) =>
      container.querySelector(`[data-nexus-hidden="${path}"]`);

    // show 未选择 → hidden 表达式求值 false → 正常渲染卡片
    expect(hiddenOf('cardArea')).toBeNull();
    expect(container.querySelector('[data-nexus-layout="card"]')).toBeTruthy();

    // show = '1' → hidden 求值 true → 渲染 display:none 占位符（不清除，防栅格塌陷）
    act(() => {
      fireEvent.click(getByTestId('show-opt-1'));
    });
    rerender(<LayoutApp />);
    expect(hiddenOf('cardArea')).toBeTruthy();
    expect(container.querySelector('[data-nexus-layout="card"]')).toBeNull();

    // 布局 Key 不进入 formData 数据路径
    expect(Object.keys(holder.form!.getValues())).toContain('show');
    expect(Object.keys(holder.form!.getValues())).not.toContain('cardArea');
  });
});

describe('hidden expression renderer repro', () => {
  it('toggles reviewer visibility by approval', () => {
    const { getByTestId, container, rerender } = render(<App />);
    const _form = holder.form!;
    const hiddenOf = (path: string) =>
      container.querySelector(`[data-nexus-hidden="${path}"]`);

    // initially approval undefined -> hidden
    expect(hiddenOf('reviewer')).toBeTruthy();
    expect(hiddenOf('reviewer2')).toBeTruthy();

    // click radio option '1' (同意)
    act(() => {
      fireEvent.click(getByTestId('approval-opt-1'));
    });
    rerender(<App />);

    // approval = 1 -> !== false -> visible
    expect(hiddenOf('reviewer')).toBeNull();
    expect(hiddenOf('reviewer2')).toBeNull();
    expect(getByTestId('user-reviewer')).toBeTruthy();

    // click radio option '0' (不同意)
    act(() => {
      fireEvent.click(getByTestId('approval-opt-0'));
    });
    rerender(<App />);
    // approval = 0 -> !== true -> hidden again
    expect(hiddenOf('reviewer')).toBeTruthy();
    expect(hiddenOf('reviewer2')).toBeTruthy();
  });
});
