import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

function TestForm({
  schema,
  persist,
}: {
  schema: unknown;
  persist?: { key: string; storage?: 'localStorage' | 'sessionStorage' };
}) {
  const [form] = useForm();
  holder.form = form;
  return (
    <NexusForm
      form={form}
      schema={schema as never}
      footer={false}
      widgets={{ input: StubInput }}
      persist={persist}
    />
  );
}

const schema = {
  type: 'object',
  properties: {
    username: { type: 'string', widget: 'input' },
  },
};

describe('NexusForm persist（草稿持久化）', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  it('值变化后防抖保存草稿到 localStorage', async () => {
    const { container } = render(
      <TestForm schema={schema} persist={{ key: 'draft-1' }} />,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zhangsan' } });

    await new Promise((r) => setTimeout(r, 400));
    expect(JSON.parse(localStorage.getItem('draft-1')!)).toEqual({
      username: 'zhangsan',
    });
  });

  it('保存前的防抖窗口内不写入存储', async () => {
    const { container } = render(
      <TestForm schema={schema} persist={{ key: 'draft-2' }} />,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'zhangsan' } });

    expect(localStorage.getItem('draft-2')).toBeNull();
    await new Promise((r) => setTimeout(r, 400));
    expect(localStorage.getItem('draft-2')).not.toBeNull();
  });

  it('已有草稿时挂载自动恢复为初始值', async () => {
    localStorage.setItem('draft-3', JSON.stringify({ username: '草稿用户' }));
    const { container } = render(
      <TestForm schema={schema} persist={{ key: 'draft-3' }} />,
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('草稿用户');
    expect(holder.form!._getEngine().getFieldValue('username')).toBe(
      '草稿用户',
    );
  });

  it('无草稿时不影响 initialValues 行为', async () => {
    function WithInitial() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={schema as never}
          footer={false}
          widgets={{ input: StubInput }}
          persist={{ key: 'draft-4' }}
          initialValues={{ username: '初始值' }}
        />
      );
    }
    const { container } = render(<WithInitial />);
    expect((container.querySelector('input') as HTMLInputElement).value).toBe(
      '初始值',
    );
  });

  it('提交成功后清除草稿', async () => {
    localStorage.setItem('draft-5', JSON.stringify({ username: 'x' }));
    const onFinish = vi.fn();
    function WithSubmit() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={schema as never}
          footer={false}
          widgets={{ input: StubInput }}
          persist={{ key: 'draft-5' }}
          onFinish={onFinish}
        >
          <button type='submit'>提交</button>
        </NexusForm>
      );
    }
    const { container } = render(<WithSubmit />);
    // 等待恢复 + 防抖保存（存储中应仍为草稿）
    await new Promise((r) => setTimeout(r, 400));

    fireEvent.submit(container.querySelector('form')!);
    await new Promise((r) => setTimeout(r, 50));

    expect(onFinish).toHaveBeenCalled();
    expect(localStorage.getItem('draft-5')).toBeNull();
  });

  it('clearOnSubmit=false 时提交后保留草稿', async () => {
    localStorage.setItem('draft-6', JSON.stringify({ username: 'x' }));
    function WithSubmit() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={schema as never}
          footer={false}
          widgets={{ input: StubInput }}
          persist={{ key: 'draft-6', clearOnSubmit: false }}
        >
          <button type='submit'>提交</button>
        </NexusForm>
      );
    }
    const { container } = render(<WithSubmit />);
    fireEvent.submit(container.querySelector('form')!);
    await new Promise((r) => setTimeout(r, 50));
    expect(localStorage.getItem('draft-6')).not.toBeNull();
  });

  it('挂载后动态开启 persist 也能开始保存', async () => {
    function Toggleable() {
      const [form] = useForm();
      const [enabled, setEnabled] = useState(false);
      holder.form = form;
      return (
        <>
          <button type='button' onClick={() => setEnabled(true)}>
            开启
          </button>
          <NexusForm
            form={form}
            schema={schema as never}
            footer={false}
            widgets={{ input: StubInput }}
            persist={enabled ? { key: 'draft-7' } : undefined}
          />
        </>
      );
    }
    const { container } = render(<Toggleable />);
    const toggle = container.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;
    fireEvent.click(toggle);
    const input = container.querySelector('input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '动态开启' } });

    await new Promise((r) => setTimeout(r, 400));
    expect(JSON.parse(localStorage.getItem('draft-7')!)).toEqual({
      username: '动态开启',
    });
  });

  it('未配置 persist 时提交不受影响（不读取存储、不抛错）', async () => {
    const onFinish = vi.fn();
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem');
    function NoPersist() {
      const [form] = useForm();
      holder.form = form;
      return (
        <NexusForm
          form={form}
          schema={schema as never}
          footer={false}
          widgets={{ input: StubInput }}
          onFinish={onFinish}
        >
          <button type='submit'>提交</button>
        </NexusForm>
      );
    }
    const { container } = render(<NoPersist />);
    fireEvent.submit(container.querySelector('form')!);
    await new Promise((r) => setTimeout(r, 50));

    expect(onFinish).toHaveBeenCalled();
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });
});
