import { act, fireEvent, render } from '@testing-library/react';
import React from 'react';
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

describe('hidden expression renderer repro', () => {
  it('toggles reviewer visibility by approval', () => {
    const { getByTestId, container, rerender } = render(<App />);
    const form = holder.form!;
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
