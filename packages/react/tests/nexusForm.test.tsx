import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FormController } from '../src/components/FormController';
import { NexusForm } from '../src/components/NexusForm';
import { useForm } from '../src/hooks/useForm';

// ── 测试辅助 ──────────────────────────────────────────────────────────────

/** 桩 widget：原生 input，记录渲染次数 */
const renders: Record<string, number> = {};

function StubInput(props: any) {
  renders[props.path] = (renders[props.path] ?? 0) + 1;
  return (
    <input
      data-testid={`input-${props.path}`}
      value={props.value ?? ''}
      readOnly={props.readOnly}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

function StubCard({ children }: { children: React.ReactNode }) {
  return <div data-testid='stub-card'>{children}</div>;
}

const holder: { form?: FormController } = {};

function TestForm({
  schema,
  initialValues,
  readOnly,
  widgets,
  layouts,
}: {
  schema: unknown;
  initialValues?: Record<string, unknown>;
  readOnly?: boolean;
  widgets?: Record<string, (props: any) => React.ReactNode>;
  layouts?: Record<string, (props: any) => React.ReactNode>;
}) {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      initialValues={initialValues}
      readOnly={readOnly}
      widgets={{ input: StubInput, ...widgets }}
      layouts={{ card: StubCard, ...layouts }}
    />
  );
}

const simpleSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', widget: 'input', title: '用户名' },
    age: { type: 'number', widget: 'input', title: '年龄' },
  },
};

// ── 用例 ──────────────────────────────────────────────────────────────────

describe('NexusForm', () => {
  it('根据 schema 渲染全部字段并回显 initialValues', () => {
    const { container } = render(
      <TestForm
        schema={simpleSchema}
        initialValues={{ username: 'zhangsan', age: 18 }}
      />,
    );
    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    expect((inputs[0] as HTMLInputElement).value).toBe('zhangsan');
    expect((inputs[1] as HTMLInputElement).value).toBe('18');
    expect(
      container.querySelector('[data-nexus-field="username"]'),
    ).not.toBeNull();
  });

  it('输入触发 onChange → 引擎状态更新 → 字段精准重渲染', () => {
    const { container } = render(<TestForm schema={simpleSchema} />);
    const username = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(username, { target: { value: 'lisi' } });

    expect(username.value).toBe('lisi');
    expect(holder.form!._getEngine().getFieldValue('username')).toBe('lisi');
  });

  it('字段隔离：修改 A 字段不触发 B 字段重渲染（按路径版本订阅）', () => {
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
    // 挂载期：两字段各渲染一次
    expect(renders.a).toBe(1);
    expect(renders.b).toBe(1);

    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'x' },
    });
    expect(renders.a).toBe(2);
    expect(renders.b).toBe(1);
  });

  it('隐藏字段渲染 display:none 占位符（data-nexus-hidden）而非移除', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            secret: { type: 'string', widget: 'input', hidden: true },
            name: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    expect(
      container.querySelector('[data-nexus-hidden="secret"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(1);
  });

  it('布局节点 removeHidden=true 时隐藏字段完全移除（含占位符）', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            group: {
              type: 'card',
              removeHidden: true,
              properties: {
                secret: { type: 'string', widget: 'input', hidden: true },
                name: { type: 'string', widget: 'input' },
              },
            },
          },
        }}
      />,
    );
    expect(container.querySelector('[data-nexus-hidden]')).toBeNull();
    expect(container.querySelectorAll('input')).toHaveLength(1);
    expect(container.querySelector('[data-testid="stub-card"]')).not.toBeNull();
  });

  it('表单级 readOnly 透传给所有 widget', () => {
    const { container } = render(<TestForm schema={simpleSchema} readOnly />);
    const inputs = container.querySelectorAll('input');
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect((input as HTMLInputElement).readOnly).toBe(true);
    }
  });

  it('hidden 表达式（_autoExpr）控制隐藏占位符', () => {
    const { container } = render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            enable: { type: 'string', widget: 'input', title: '开关' },
            detail: {
              type: 'string',
              widget: 'input',
              hidden: '{{ formData.enable !== "on" }}',
            },
          },
        }}
        initialValues={{ enable: 'on', detail: 'abc' }}
      />,
    );
    expect(container.querySelectorAll('input')).toHaveLength(2);

    // enable 变为 'off' → detail 变为隐藏占位符（仍在 DOM 中）
    const enableInput = container.querySelector(
      'input[data-testid="input-enable"]',
    ) as HTMLInputElement;
    fireEvent.change(enableInput, { target: { value: 'off' } });
    expect(
      container.querySelector('[data-nexus-hidden="detail"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-testid="input-detail"]')).toBeNull();
  });

  it('表单渲染前调用 setValues：init 后字段值生效', async () => {
    function PreSetForm() {
      const [form] = useForm();
      holder.form = form;
      // 模拟「先 setValues 后渲染」：渲染期间同步执行，先于 NexusForm 的 init effect
      form.setValues({ username: '提前赋值', 'profile.city': '上海' });
      return (
        <NexusForm
          form={form}
          schema={
            {
              type: 'object',
              properties: {
                username: { type: 'string', widget: 'input' },
                profile: {
                  type: 'object',
                  properties: {
                    city: { type: 'string', widget: 'input' },
                  },
                },
              },
            } as never
          }
          widgets={{ input: StubInput }}
        />
      );
    }
    const { container } = render(<PreSetForm />);
    expect(
      (
        container.querySelector(
          'input[data-testid="input-username"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('提前赋值');
    expect(
      (
        container.querySelector(
          'input[data-testid="input-profile.city"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('上海');
  });

  it('onValuesChange 回调：值变化时触发（changedValue, allValues, changedPath）', () => {
    const onValuesChange = vi.fn();
    function WatchForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={simpleSchema as never}
          widgets={{ input: StubInput }}
          onValuesChange={onValuesChange}
        />
      );
    }
    const { container } = render(<WatchForm />);
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'lisi' },
    });
    expect(onValuesChange).toHaveBeenCalledTimes(1);
    const [changedValue, allValues, changedPath] = onValuesChange.mock.calls[0];
    expect(changedValue).toBe('lisi');
    expect(allValues).toMatchObject({ username: 'lisi' });
    expect(changedPath).toBe('username');
  });

  it('reloadRemoteData：FormController 聚合转发到引擎远程版本', () => {
    const { container } = render(<TestForm schema={simpleSchema} />);
    const engine = holder.form!._getEngine();
    expect(engine.getRemoteDataVersion('username')).toBe(0);
    holder.form!.reloadRemoteData('username');
    expect(engine.getRemoteDataVersion('username')).toBe(1);
    // 值不受影响
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'x' },
    });
    expect(holder.form!._getEngine().getFieldValue('username')).toBe('x');
  });

  it('getValues omitNil：递归移除空值（ProForm 对齐）', () => {
    render(
      <TestForm
        schema={{
          type: 'object',
          properties: {
            name: { type: 'string', widget: 'input' },
            city: { type: 'string', widget: 'input' },
          },
        }}
      />,
    );
    const form = holder.form!;
    expect(form.getValues()).toEqual({ name: '', city: '' });
    const filtered = form.getValues(undefined, { omitNil: true });
    expect(filtered).toEqual({});
    form.setValueByPath('city', '上海');
    expect(form.getValues(undefined, { omitNil: true })).toEqual({
      city: '上海',
    });
  });

  it('submit submitting 状态：全流程（校验 + onFinish）期间为 true', async () => {
    let resolveFinish: (v: undefined) => void = () => {};
    const finishPromise = new Promise<void>((resolve) => {
      resolveFinish = resolve;
    });
    const onFinish = vi.fn(() => finishPromise);

    function SubmitForm() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={simpleSchema as never}
          widgets={{ input: StubInput }}
          onFinish={onFinish}
        />
      );
    }
    render(<SubmitForm />);
    const form = holder.form!;
    expect(form.getSubmitting()).toBe(false);

    let listenerCalls = 0;
    const unsubscribe = form.onSubmittingChange(() => listenerCalls++);

    const submitPromise = form.submit();
    // 校验是异步（微任务）：等待 submitting 置位（轮询方式兼容 vitest / bun 双运行器）
    const deadline = Date.now() + 2000;
    while (Date.now() < deadline && !form.getSubmitting()) {
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(form.getSubmitting()).toBe(true);
    resolveFinish();
    await submitPromise;
    expect(form.getSubmitting()).toBe(false);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(listenerCalls).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });
});
