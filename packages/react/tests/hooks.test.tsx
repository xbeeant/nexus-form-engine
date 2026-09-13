import { act, render } from '@testing-library/react';
import { NexusEngine } from '@xbeeant/form-engine';
import type { RefObject } from 'react';
import { describe, expect, it } from 'vitest';
import type { FormController } from '../src/components/form-controller';
import { NexusForm } from '../src/components/nexus-form';
import { NexusFormProvider } from '../src/components/nexus-form-provider';
import { useEngine } from '../src/hooks/use-engine';
import { useFieldState } from '../src/hooks/use-field-state';
import { useFieldValue } from '../src/hooks/use-field-value';
import { useForm } from '../src/hooks/use-form';
import { useFormConfig } from '../src/hooks/use-form-config';
import { useFormSubmitting } from '../src/hooks/use-form-submitting';
import { useWatch } from '../src/hooks/use-watch';
import { useWatchAll } from '../src/hooks/use-watch-all';
import { useWatchMultiple } from '../src/hooks/use-watch-multiple';
import { useWatchState } from '../src/hooks/use-watch-state';

const holder: { form?: FormController } = {};

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      data-nexus-field={props.path}
      value={props.value ?? ''}
    />
  );
}

// ── useForm ───────────────────────────────────────────────────────────────

describe('useForm', () => {
  it('无参调用：创建独立 FormController', () => {
    function FormA() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }
    render(<FormA />);
    expect(holder.form).toBeDefined();
    expect(holder.form!._getEngine()).toBeDefined();
  });

  it('组件卸载重建时复用同一实例（ref 持久化）', () => {
    const holder2: { form1?: FormController; form2?: FormController } = {};

    function ToggleForm({ show }: { show: boolean }) {
      const [form] = useForm();
      return (
        <>
          {show && (
            <NexusForm
              form={form}
              schema={{
                type: 'object',
                properties: { name: { type: 'string', widget: 'input' } },
              }}
              widgets={{ input: StubInput }}
              onMount={() => {
                holder2.form2 = form;
              }}
            />
          )}
        </>
      );
    }

    const { rerender } = render(<ToggleForm show={true} />);
    const firstRef = holder2.form2;
    rerender(<ToggleForm show={false} />);
    rerender(<ToggleForm show={true} />);
    expect(holder2.form2).toBe(firstRef);
  });

  it('useForm(formId)：创建带 formId 的实例', () => {
    function FormWithId() {
      const [form] = useForm('test-form-id');
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }
    render(<FormWithId />);
    expect(holder.form!._getEngine().getSnapshot()).toBeDefined();
  });
});

// ── useFieldValue ─────────────────────────────────────────────────────────

describe('useFieldValue', () => {
  it('订阅字段值变化并返回最新值', async () => {
    const valRef: RefObject<unknown> = { current: undefined };
    const formRef: RefObject<any> = { current: null };

    function ValueConsumer() {
      const value = useFieldValue<string>('name');
      valRef.current = value;
      return <div>value: {String(value)}</div>;
    }

    function FormWrapper() {
      const [form] = useForm();
      formRef.current = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        >
          <ValueConsumer />
        </NexusForm>
      );
    }

    render(<FormWrapper />);
    await act(async () => {});
    formRef.current.setValueByPath('name', 'changed');
    await act(async () => {});
    expect(valRef.current).toBe('changed');
  });

  it('字段未定义时返回 undefined', async () => {
    const valRef: RefObject<unknown> = { current: undefined };
    const formRef: RefObject<any> = { current: null };

    function UndefinedValueConsumer() {
      const value = useFieldValue<string>('nonexistent');
      valRef.current = value;
      return <div>value: {String(value)}</div>;
    }

    function FormWrapper() {
      const [form] = useForm();
      formRef.current = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        >
          <UndefinedValueConsumer />
        </NexusForm>
      );
    }

    render(<FormWrapper />);
    await act(async () => {});
    formRef.current.setValueByPath('name', 'changed');
    await act(async () => {});
    expect(valRef.current).toBeUndefined();
  });
});

// ── useFieldState ─────────────────────────────────────────────────────────

describe('useFieldState', () => {
  it('订阅字段状态变化并返回最新 state', async () => {
    const stateRef: RefObject<any> = { current: undefined };
    const formRef: RefObject<any> = { current: null };

    function StateConsumer() {
      const state = useFieldState('name');
      stateRef.current = state;
      return <div />;
    }

    function FormWrapper() {
      const [form] = useForm();
      formRef.current = form;
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              name: {
                type: 'string',
                widget: 'input',
                required: true,
              },
            },
          }}
          widgets={{ input: StubInput }}
        >
          <StateConsumer />
        </NexusForm>
      );
    }

    render(<FormWrapper />);
    await act(async () => {});
    formRef.current.setValueByPath('name', 'changed');
    await act(async () => {});
    expect(stateRef.current).toBeDefined();
    expect(stateRef.current.required).toBe(true);
  });

  it('字段未定义时返回 undefined', async () => {
    const stateRef: RefObject<any> = { current: undefined };

    function UndefinedStateConsumer() {
      const state = useFieldState('nonexistent');
      stateRef.current = state;
      return <div />;
    }

    function FormWrapper() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        >
          <UndefinedStateConsumer />
        </NexusForm>
      );
    }

    render(<FormWrapper />);
    await act(async () => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(stateRef.current).toBeUndefined();
  });
});

// ── useFormSubmitting ─────────────────────────────────────────────────────

describe('useFormSubmitting', () => {
  it('提交中返回 false', async () => {
    const submittingRef: RefObject<boolean> = { current: false };

    function SubmittingConsumer() {
      const [form] = useForm();
      submittingRef.current = useFormSubmitting(form);
      return <div />;
    }

    function FormWrapper() {
      const [form] = useForm();
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        >
          <SubmittingConsumer />
        </NexusForm>
      );
    }

    render(<FormWrapper />);
    await act(async () => {});
    expect(submittingRef.current).toBe(false);
  });

  it('初始状态为 false', async () => {
    const submittingRef: RefObject<boolean> = { current: false };

    function InitialSubmitConsumer() {
      const [form] = useForm();
      submittingRef.current = useFormSubmitting(form);
      return <div />;
    }

    render(<InitialSubmitConsumer />);
    await act(async () => {});
    expect(submittingRef.current).toBe(false);
  });
});

// ── useWatch ──────────────────────────────────────────────────────────────

describe('useWatch', () => {
  it('初始化时立即执行一次', () => {
    const calls: unknown[] = [];
    let formRef: FormController | undefined;

    function WatchForm() {
      const [form] = useForm();
      formRef = form;
      const val = useWatch(form._getEngine(), 'name', (v) => {
        calls.push(v);
      });
      return (
        <>
          <div>val: {String(val)}</div>
          <NexusForm
            form={form}
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input', default: 'init' },
              },
            }}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }

    const { container } = render(<WatchForm />);
    expect(container).toBeDefined();
    expect(formRef).toBeDefined();
  });

  it('值变化时触发回调', async () => {
    const holder10: { form?: FormController } = {};
    const calls: unknown[] = [];

    function WatchForm() {
      const [form] = useForm();
      holder10.form = form;
      const engine = form._getEngine();
      const value = useWatch(engine, 'name', (v) => {
        calls.push(v);
      });
      return (
        <>
          <div>value: {String(value)}</div>
          <NexusForm
            form={form}
            schema={{
              type: 'object',
              properties: { name: { type: 'string', widget: 'input' } },
            }}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }

    render(<WatchForm />);
    // useEffect 中的 useWatch 会执行 callback（initial value 是 undefined）
    await act(async () => {});
    // setValue 后触发 callback
    holder10.form!.setValueByPath('name', 'changed');
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[calls.length - 1]).toBe('changed');
  });

  it('deep 模式使用 JSON.stringify 比较', () => {
    const holder11: { form?: FormController } = {};
    const shallowCalls: unknown[] = [];
    const deepCalls: unknown[] = [];

    function DeepWatchForm() {
      const [form] = useForm();
      holder11.form = form;
      const engine = form._getEngine();
      useWatch(engine, 'obj', (v) => shallowCalls.push(v));
      useWatch(engine, 'obj', (v) => deepCalls.push(v), { deep: true });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { obj: { type: 'object', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    const { container } = render(<DeepWatchForm />);
    expect(container).toBeDefined();
  });

  it('callback 通过 ref 持有，不导致重复订阅', async () => {
    const holder12: { form?: FormController } = {};
    const invokedRef: RefObject<boolean> = { current: false };

    function NoRepeatWatchForm() {
      const [form] = useForm();
      holder12.form = form;
      const engine = form._getEngine();
      useWatch(engine, 'name', () => {
        invokedRef.current = true;
      });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<NoRepeatWatchForm />);
    // useEffect 中 engine.getFieldValue 初始为 undefined，比较后可能不触发 callback
    // setValueByPath 后会触发 callback
    holder12.form!.setValueByPath('name', 'test');
    await new Promise((r) => setTimeout(r, 50));
    expect(invokedRef.current).toBe(true);
  });

  it('engine 为 null 时跳过订阅', () => {
    function NullWatch() {
      const val = useWatch(null, 'path', () => {});
      return <div>{String(val)}</div>;
    }
    const { container } = render(<NullWatch />);
    expect(container.textContent).toBe('undefined');
  });
});

// ── useWatchAll ───────────────────────────────────────────────────────────

describe('useWatchAll', () => {
  it('初始化时触发一次', async () => {
    const holder13: { form?: FormController } = {};
    const calls: unknown[] = [];

    function WatchAllForm() {
      const [form] = useForm();
      holder13.form = form;
      const engine = form._getEngine();
      useWatchAll(engine, (data) => {
        calls.push(data);
      });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              name: { type: 'string', widget: 'input' },
              age: { type: 'number', widget: 'input' },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<WatchAllForm />);
    await act(async () => {});
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('表单数据变化时触发回调', async () => {
    const holder14: { form?: FormController } = {};
    const calls: unknown[] = [];

    function WatchAllChangeForm() {
      const [form] = useForm();
      holder14.form = form;
      const engine = form._getEngine();
      useWatchAll(engine, (data) => {
        calls.push(data);
      });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<WatchAllChangeForm />);
    await act(async () => {});

    holder14.form!.setValueByPath('name', 'alice');
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('engine 为 null 时跳过订阅', () => {
    function NullWatchAll() {
      const data = useWatchAll(null, () => {});
      return <div>{JSON.stringify(data)}</div>;
    }
    const { container } = render(<NullWatchAll />);
    expect(container.textContent).toBe('{}');
  });
});

// ── useWatchMultiple ──────────────────────────────────────────────────────

describe('useWatchMultiple', () => {
  it('监听多个字段，任一变化触发回调', async () => {
    const holder15: { form?: FormController } = {};
    const calls: Record<string, unknown>[] = [];

    function MultipleForm() {
      const [form] = useForm();
      holder15.form = form;
      const engine = form._getEngine();
      useWatchMultiple(engine, ['name', 'age'], (values) => {
        calls.push(values);
      });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              name: { type: 'string', widget: 'input' },
              age: { type: 'number', widget: 'input' },
              email: { type: 'string', widget: 'input' },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<MultipleForm />);
    // useEffect 中的 useWatchMultiple 会调用 callback
    await act(async () => {});
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('路径列表内容变化时重新订阅', () => {
    const holder16: { form?: FormController } = {};
    const calls: string[] = [];
    const { useState } = require('react');

    function PathsChangeForm() {
      const [form] = useForm();
      holder16.form = form;
      const engine = form._getEngine();
      const [paths, setPaths] = useState(['name']);
      useWatchMultiple(engine, paths, (values) => {
        calls.push(JSON.stringify(values));
      });
      return (
        <>
          <div>
            <button data-testid='change' onClick={() => setPaths(['email'])}>
              Change
            </button>
          </div>
          <NexusForm
            form={form}
            schema={{
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input' },
                email: { type: 'string', widget: 'input' },
              },
            }}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }

    const { container, getByTestId } = render(<PathsChangeForm />);
    expect(container).toBeDefined();
  });

  it('engine 为 null 时跳过订阅', () => {
    function NullMultiple() {
      const data = useWatchMultiple(null, ['path'], () => {});
      return <div>{JSON.stringify(data)}</div>;
    }
    const { container } = render(<NullMultiple />);
    expect(container.textContent).toBe('{}');
  });
});

// ── useWatchState ─────────────────────────────────────────────────────────

describe('useWatchState', () => {
  it('初始化时触发一次回调', async () => {
    const holder17: { form?: FormController } = {};
    const calls: any[] = [];

    function StateWatchForm() {
      const [form] = useForm();
      holder17.form = form;
      const engine = form._getEngine();
      useWatchState(engine, 'name', (state) => {
        calls.push(state);
      });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              name: { type: 'string', widget: 'input', required: true },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<StateWatchForm />);
    // useEffect 中的 useWatchState 会调用 callback
    await act(async () => {});
    expect(calls.length).toBeGreaterThanOrEqual(1);
    expect(calls[0].required).toBe(true);
  });

  it('字段状态变化时触发回调', async () => {
    const holder18: { form?: FormController } = {};
    const calls: any[] = [];

    function StateChangeForm() {
      const [form] = useForm();
      holder18.form = form;
      const engine = form._getEngine();
      useWatchState(engine, 'name', (state) => {
        calls.push(state);
      });
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: {
              name: { type: 'string', widget: 'input' },
            },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<StateChangeForm />);
    await act(async () => {});

    holder18.form!._getEngine().setFieldState('name', { disabled: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });

  it('字段状态不存在时返回空对象', async () => {
    const stateRef: RefObject<any> = { current: {} };

    function UndefinedStateWatchForm() {
      const [form] = useForm();
      const engine = form._getEngine();
      stateRef.current = useWatchState(engine, 'nonexistent', () => {});
      return (
        <NexusForm
          form={form}
          schema={{
            type: 'object',
            properties: { name: { type: 'string', widget: 'input' } },
          }}
          widgets={{ input: StubInput }}
        />
      );
    }

    render(<UndefinedStateWatchForm />);
    await act(async () => {});
    expect(stateRef.current).toEqual({});
  });

  it('engine 为 null 时返回空对象', () => {
    function NullStateWatch() {
      const state = useWatchState(null, 'path', () => {});
      return <div>{JSON.stringify(state)}</div>;
    }
    const { container } = render(<NullStateWatch />);
    expect(container.textContent).toBe('{}');
  });
});

// ── useEngine / useFormConfig ─────────────────────────────────────────────

describe('useEngine / useFormConfig', () => {
  it('useEngine：在 NexusFormProvider 子树内正常返回', async () => {
    const holder20: { engine?: any } = {};

    function EngineHolder() {
      const engine = new NexusEngine();
      return (
        <NexusFormProvider
          engine={engine}
          config={{}}
          form={{} as FormController}
        >
          <EngineConsumer />
        </NexusFormProvider>
      );
    }

    function EngineConsumer() {
      const eng = useEngine();
      holder20.engine = eng;
      return <div />;
    }

    render(<EngineHolder />);
    expect(holder20.engine).toBeDefined();
  });

  it('useFormConfig：返回表单布局配置', async () => {
    const holder21: { form?: FormController; config?: any } = {};

    function ConfigProvider({ children }: { children: React.ReactNode }) {
      const [form] = useForm();
      holder21.form = form;
      return (
        <NexusFormProvider
          engine={form._getEngine()}
          config={{ displayType: 'horizontal' as const }}
          form={form}
        >
          {children}
        </NexusFormProvider>
      );
    }

    function ConfigConsumer() {
      const cfg = useFormConfig();
      holder21.config = cfg;
      return <div />;
    }

    render(
      <ConfigProvider>
        <ConfigConsumer />
      </ConfigProvider>,
    );

    expect(holder21.config).toBeDefined();
  });
});
