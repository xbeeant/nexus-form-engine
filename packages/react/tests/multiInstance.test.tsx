import { act, fireEvent, render } from '@testing-library/react';
import { NexusEngine } from '@xbeeant/form-engine';
import { describe, expect, it, vi } from 'vitest';

import type { FormController } from '../src/components/FormController';
import { NexusForm } from '../src/components/NexusForm';
import { useForm } from '../src/hooks/useForm';

const holder: { form?: FormController; formB?: FormController } = {};

function StubInput(props: any) {
  return (
    <input
      data-testid={`input-${props.path}`}
      value={props.value ?? ''}
      onChange={(e) => props.onChange(e.target.value)}
    />
  );
}

const schemaA = {
  type: 'object',
  properties: {
    name: { type: 'string', widget: 'input' },
  },
};

const schemaB = {
  type: 'object',
  properties: {
    city: { type: 'string', widget: 'input' },
  },
};

describe('同一 form 挂载多个 schema（聚合操作）', () => {
  it('两个 NexusForm 各自渲染，schema 与值互不影响，getValues 合并', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    const cityInput = container.querySelector(
      'input[data-testid="input-city"]',
    ) as HTMLInputElement;
    expect(nameInput).not.toBeNull();
    expect(cityInput).not.toBeNull();

    fireEvent.change(nameInput, { target: { value: '张三' } });
    fireEvent.change(cityInput, { target: { value: '北京' } });

    // 各实例数据独立，form API 聚合返回
    expect(holder.form!.getValues()).toEqual({ name: '张三', city: '北京' });
  });

  it('setValues / setValueByPath 按 schema 匹配赋值到对应实例', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);

    act(() => {
      holder.form!.setValues({ name: '张三', city: '北京' });
    });
    expect(
      (
        container.querySelector(
          'input[data-testid="input-name"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('张三');
    expect(
      (
        container.querySelector(
          'input[data-testid="input-city"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('北京');

    act(() => {
      holder.form!.setValueByPath('name', '李四');
    });
    expect(
      (
        container.querySelector(
          'input[data-testid="input-name"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('李四');
    expect(
      (
        container.querySelector(
          'input[data-testid="input-city"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('北京');
  });

  it('resetFields 重置全部实例', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    act(() => {
      holder.form!.setValues({ name: 'x', city: 'y' });
    });

    act(() => {
      holder.form!.resetFields();
    });
    expect(
      (
        container.querySelector(
          'input[data-testid="input-name"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('');
    expect(
      (
        container.querySelector(
          'input[data-testid="input-city"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('');
  });

  it('实例 A 的 watch 不接收实例 B 的值变更', async () => {
    const watchA = vi.fn();
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
            watch={{ name: watchA }}
          />
          <NexusForm
            form={form}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    const cityInput = container.querySelector(
      'input[data-testid="input-city"]',
    ) as HTMLInputElement;
    fireEvent.change(cityInput, { target: { value: '北京' } });
    expect(watchA).not.toHaveBeenCalled();

    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '张三' } });
    expect(watchA).toHaveBeenCalledWith('张三', expect.any(Object));
  });

  it('引擎级组件注册对全部实例生效', async () => {
    const sharedEngine = new NexusEngine();
    // 挂载前在引擎宿主注册组件：所有实例可见（宿主注册 = 引擎级能力共享）
    sharedEngine.registerWidgets({ input: StubInput });
    function Multi() {
      const [form] = useForm(undefined, sharedEngine);
      holder.form = form;
      return (
        <>
          <NexusForm form={form} schema={schemaA as never} footer={false} />
          <NexusForm form={form} schema={schemaB as never} footer={false} />
        </>
      );
    }
    const { container } = render(<Multi />);
    expect(
      container.querySelector('input[data-testid="input-name"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('input[data-testid="input-city"]'),
    ).not.toBeNull();
  });

  it('submit 聚合校验全部实例：任一失败阻止提交，全部通过后各自 onFinish', async () => {
    const onFinishA = vi.fn();
    const onFinishB = vi.fn();
    const onFinishFailedA = vi.fn();
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            schema={
              {
                type: 'object',
                properties: {
                  name: { type: 'string', widget: 'input', required: true },
                },
              } as never
            }
            footer={false}
            widgets={{ input: StubInput }}
            onFinish={onFinishA}
            onFinishFailed={onFinishFailedA}
          >
            <button type='submit'>提交A</button>
          </NexusForm>
          <NexusForm
            form={form}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
            onFinish={onFinishB}
          >
            <button type='submit'>提交B</button>
          </NexusForm>
        </>
      );
    }
    const { container } = render(<Multi />);

    // A 必填未填：提交被阻止，A 的 onFinish 不触发，B 也不触发
    fireEvent.submit(container.querySelectorAll('form')[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(onFinishFailedA).toHaveBeenCalled();
    expect(onFinishA).not.toHaveBeenCalled();
    expect(onFinishB).not.toHaveBeenCalled();

    // A 填值后提交：全部通过 → 各自 onFinish
    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '张三' } });
    fireEvent.submit(container.querySelectorAll('form')[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(onFinishA).toHaveBeenCalledWith({ name: '张三' });
    expect(onFinishB).toHaveBeenCalledWith({ city: '' });
  });

  it('registerValidator 聚合注册：按 schema 匹配生效', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    const cityInput = container.querySelector(
      'input[data-testid="input-city"]',
    ) as HTMLInputElement;

    act(() => {
      holder.form!.registerValidator('city', (value) =>
        value === 'bad' ? ['城市不合法'] : [],
      );
    });
    fireEvent.change(cityInput, { target: { value: 'bad' } });
    await new Promise((r) => setTimeout(r, 50));
    expect(holder.form!.getFieldError('city')).toContain('城市不合法');
    // name 无该校验器
    expect(holder.form!.getFieldError('name')).toEqual([]);
  });
});

describe('不同 form = 不同引擎宿主（完全独立）', () => {
  it('两个 useForm() 的表单：各自 schema 与值互不影响', async () => {
    function Multi() {
      const [formA] = useForm();
      const [formB] = useForm();
      holder.form = formA;
      holder.formB = formB;
      return (
        <>
          <NexusForm
            form={formA}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={formB}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    const cityInput = container.querySelector(
      'input[data-testid="input-city"]',
    ) as HTMLInputElement;
    expect(holder.form!.getEngine()).not.toBe(holder.formB!.getEngine());

    fireEvent.change(nameInput, { target: { value: '张三' } });
    fireEvent.change(cityInput, { target: { value: '北京' } });

    expect(holder.form!.getValues()).toEqual({ name: '张三' });
    expect(holder.formB!.getValues()).toEqual({ city: '北京' });
  });

  it('resetFields / setValues 只作用于各自的 form', async () => {
    function Multi() {
      const [formA] = useForm();
      const [formB] = useForm();
      holder.form = formA;
      holder.formB = formB;
      return (
        <>
          <NexusForm
            form={formA}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={formB}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    const cityInput = container.querySelector(
      'input[data-testid="input-city"]',
    ) as HTMLInputElement;

    act(() => {
      holder.form!.setValues({ name: 'x' });
      holder.formB!.setValues({ city: 'y' });
    });
    expect(nameInput.value).toBe('x');
    expect(cityInput.value).toBe('y');

    act(() => {
      holder.form!.resetFields();
    });
    expect(nameInput.value).toBe('');
    expect(cityInput.value).toBe('y');
    expect(holder.formB!.getValues()).toEqual({ city: 'y' });
  });
});

describe('引擎宿主与 form 解耦', () => {
  it('多个 useForm 复用同一外部引擎：共享宿主注册，实例状态独立', async () => {
    const sharedEngine = new NexusEngine();
    function Multi() {
      const [formA] = useForm(undefined, sharedEngine);
      const [formB] = useForm(undefined, sharedEngine);
      holder.form = formA;
      holder.formB = formB;
      return (
        <>
          <NexusForm
            form={formA}
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={formB}
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);
    expect(holder.form!.getEngine()).toBe(sharedEngine);
    expect(holder.formB!.getEngine()).toBe(sharedEngine);

    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    const cityInput = container.querySelector(
      'input[data-testid="input-city"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '张三' } });
    fireEvent.change(cityInput, { target: { value: '北京' } });

    // 同一宿主、不同实例：值互不影响
    expect(holder.form!.getValues()).toEqual({ name: '张三' });
    expect(holder.formB!.getValues()).toEqual({ city: '北京' });
  });
});