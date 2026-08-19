import { act, fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FormController } from '../src/components/FormController';
import { NexusForm } from '../src/components/NexusForm';
import { useForm } from '../src/hooks/useForm';

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

describe('同一 form 多实例（schema 相互独立）', () => {
  it('两个 NexusForm 共享 form：各自渲染、值互不影响', async () => {
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

    // 各实例数据独立：getValues 合并返回
    expect(holder.form!.getValues()).toEqual({ name: '张三', city: '北京' });
    // 指定实例读取各自数据
    expect(holder.form!.getValues(undefined, 'default')).toEqual({
      name: '张三',
    });
    expect(holder.form!.getValues(undefined, 'nexus-1')).toEqual({
      city: '北京',
    });
  });

  it('显式 instanceId 时按 id 寻址', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            instanceId='a'
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            instanceId='b'
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
    fireEvent.change(nameInput, { target: { value: '显式' } });

    expect(holder.form!.getValues(undefined, 'a')).toEqual({ name: '显式' });
    expect(holder.form!.getValues(undefined, 'b')).toEqual({ city: '' });
    expect(holder.form!.getValues()).toEqual({ name: '显式', city: '' });
  });

  it('setValues 无 instanceId 作用于全部实例，指定 instanceId 只作用于目标', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            instanceId='a'
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            instanceId='b'
            schema={schemaB as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
        </>
      );
    }
    const { container } = render(<Multi />);

    act(() => {
      holder.form!.setValues({ name: '全体', city: '全员' });
    });
    expect(
      (
        container.querySelector(
          'input[data-testid="input-name"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('全体');
    expect(
      (
        container.querySelector(
          'input[data-testid="input-city"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('全员');

    act(() => {
      holder.form!.setValues({ name: '仅A' }, 'a');
    });
    expect(
      (
        container.querySelector(
          'input[data-testid="input-name"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('仅A');
    expect(
      (
        container.querySelector(
          'input[data-testid="input-city"]',
        ) as HTMLInputElement
      ).value,
    ).toBe('全员');
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
            instanceId='a'
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
            watch={{ name: watchA }}
          />
          <NexusForm
            form={form}
            instanceId='b'
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

  it('submit 逐实例校验与 onFinish：A 失败阻止提交，A 通过后各自回调', async () => {
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
            instanceId='a'
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
            instanceId='b'
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

    // A 必填未填：提交被阻止，B 不触发
    fireEvent.submit(container.querySelectorAll('form')[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(onFinishFailedA).toHaveBeenCalled();
    expect(onFinishA).not.toHaveBeenCalled();
    expect(onFinishB).not.toHaveBeenCalled();

    // A 填值后提交：A 校验通过（B 无必填）→ 各自 onFinish
    const nameInput = container.querySelector(
      'input[data-testid="input-name"]',
    ) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '张三' } });
    fireEvent.submit(container.querySelectorAll('form')[0]);
    await new Promise((r) => setTimeout(r, 50));
    expect(onFinishA).toHaveBeenCalledWith({ name: '张三' });
    expect(onFinishB).toHaveBeenCalledWith({ city: '' });
  });

  it('resetFields 无 instanceId 重置全部实例', async () => {
    function Multi() {
      const [form] = useForm();
      holder.form = form;
      return (
        <>
          <NexusForm
            form={form}
            instanceId='a'
            schema={schemaA as never}
            footer={false}
            widgets={{ input: StubInput }}
          />
          <NexusForm
            form={form}
            instanceId='b'
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
});
