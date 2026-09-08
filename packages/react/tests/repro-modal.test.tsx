import { fireEvent, render } from '@testing-library/react';
import React, { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';

import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

const holder: { form?: FormController } = {};

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

const productSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', widget: 'input' },
    price: { type: 'number', widget: 'input' },
  },
};

function DetailWithModal({ onMount }: { onMount: () => void }) {
  const [form] = useForm();
  holder.form = form;
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <NexusForm
        form={form}
        schema={productSchema as never}
        footer={false}
        widgets={{ input: StubInput }}
        onMount={onMount}
      />
      <button type='button' onClick={() => setOpen(true)}>
        open
      </button>
      {open ? (
        <div data-testid='modal'>
          <NexusForm
            form={form}
            schema={productSchema as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </div>
      ) : null}
    </>
  );
}

describe('modal detail + edit same form no instanceId', () => {
  it('打开编辑模态框不卡死，detail 与 modal 实例独立', () => {
    const { container } = render(
      <StrictMode>
        <DetailWithModal onMount={() => {}} />
      </StrictMode>,
    );

    // detail 渲染
    expect(
      container.querySelector('input[data-testid="input-name"]'),
    ).not.toBeNull();

    // 打开编辑模态框
    fireEvent.click(container.querySelector('button')!);

    expect(container.querySelector('[data-testid="modal"]')).not.toBeNull();
    // modal 内也应渲染同名 schema 的字段
    const inputs = container.querySelectorAll(
      'input[data-testid="input-name"]',
    );
    expect(inputs.length).toBe(2);

    // getValues() 聚合全部实例，modal 挂载不影响既有值
    expect(holder.form!.getValues()).toEqual({ name: '', price: undefined });
    // detail 与 modal 实例各自持有独立视图：编辑 modal 内的 input 不会改动 detail 的 input
    fireEvent.change(inputs[1], { target: { value: '编辑值' } });
    const detailInput = container.querySelectorAll(
      'input[data-testid="input-name"]',
    )[0] as HTMLInputElement;
    const modalInput = container.querySelectorAll(
      'input[data-testid="input-name"]',
    )[1] as HTMLInputElement;
    expect(detailInput.value).toBe('');
    expect(modalInput.value).toBe('编辑值');
  });
});
