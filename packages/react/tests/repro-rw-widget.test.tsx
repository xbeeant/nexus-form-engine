import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NexusForm } from '../src/components/nexus-form';
import { useForm } from '../src/hooks/use-form';

function StubInput(props: any) {
  return (
    <input
      data-testid='input'
      value={props.value ?? ''}
      readOnly={props.readOnly}
    />
  );
}

function StubPassword(props: any) {
  return (
    <input
      data-testid='password'
      type='password'
      value={props.value ?? ''}
      readOnly={props.readOnly}
    />
  );
}

function TestForm({
  schema,
  initialValues,
  readOnly,
  widgets,
}: {
  schema: unknown;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  widgets?: Record<string, (props: any) => React.ReactNode>;
}) {
  const [form] = useForm();
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      initialValues={initialValues}
      readOnly={readOnly}
      widgets={{ input: StubInput, ...widgets }}
    />
  );
}

describe('readOnlyWidget 优先', () => {
  it('用户原始 schema（含 value/default）在 readOnly 下应渲染 password', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            '0wmtxmr9': {
              type: 'string',
              readOnlyWidget: 'password',
              value: '<a>www.baidu.com</a>',
              title: '输入框',
              default: '<a>www.baidu.com</a>',
            },
          },
        }}
        readOnly
        widgets={{ password: StubPassword }}
      />,
    );
    expect(container.querySelector('[data-testid="password"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input"]')).toBeNull();
  });

  it('type:string + readOnlyWidget:password 在 readOnly 下应渲染 password', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            pwd: {
              type: 'string',
              readOnlyWidget: 'password',
              title: '密码',
            },
          },
        }}
        initialValues={{ pwd: '<a>www.baidu.com</a>' }}
        readOnly
        widgets={{ password: StubPassword }}
      />,
    );
    expect(container.querySelector('[data-testid="password"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input"]')).toBeNull();
  });
});
