import { render, waitFor } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import type { FormController } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '../src';

function renderForm(schema: unknown, props: Record<string, unknown> = {}) {
  const holder: { form?: FormController } = {};
  function TestForm() {
    const [form] = useForm();
    holder.form = form;
    registerAntdUI(form._getEngine());
    return (
      <NexusForm
        form={form}
        schema={schema as never}
        footer={false}
        {...(props as never)}
      />
    );
  }
  return { ...render(<TestForm />), form: holder };
}

describe('widget 只读回退（集成 NexusForm）', () => {
  it('input 只读时渲染为文本而非输入框', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', title: '用户名' },
        },
      },
      { readOnly: true, initialValues: { username: 'zhangsan' } },
    );
    expect(container.querySelector('input')).toBeNull();
    const field = container.querySelector('[data-nexus-field="username"]');
    expect(field!.textContent).toContain('zhangsan');
  });

  it('datePicker 只读时渲染格式化文本', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          birthday: { type: 'string', widget: 'date', title: '生日' },
        },
      },
      { readOnly: true, initialValues: { birthday: '2026-01-15' } },
    );
    expect(container.querySelector('input')).toBeNull();
    const field = container.querySelector('[data-nexus-field="birthday"]');
    expect(field!.textContent).toContain('2026-01-15');
  });

  it('dateRange 只读时以 ~ 连接两端值', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          range: { type: 'string', widget: 'dateRange', title: '范围' },
        },
      },
      {
        readOnly: true,
        initialValues: { range: ['2026-12-01', '2026-12-21'] },
      },
    );
    expect(container.querySelector('input')).toBeNull();
    const field = container.querySelector('[data-nexus-field="range"]');
    expect(field!.textContent).toContain('2026-12-01 ~ 2026-12-21');
  });

  it('switch 只读时渲染 是/否', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          vip: { type: 'boolean', widget: 'switch', title: '会员' },
        },
      },
      { readOnly: true, initialValues: { vip: true } },
    );
    expect(container.querySelector('.ant-switch')).toBeNull();
    const field = container.querySelector('[data-nexus-field="vip"]');
    expect(field!.textContent).toContain('是');
  });

  it('可编辑模式下保持原生控件', () => {
    const { container } = renderForm(
      {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', title: '用户名' },
        },
      },
      { initialValues: { username: 'zhangsan' } },
    );
    expect(container.querySelector('input')).not.toBeNull();
  });
});

describe('校验错误展示（集成）', () => {
  it('必填字段提交失败时展示错误信息', async () => {
    const { container, form } = renderForm({
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          title: '用户名',
          required: true,
        },
      },
    });

    await form.form!.validateFields();
    await waitFor(() => {
      expect(
        container.querySelector('.ant-form-item-explain-error'),
      ).not.toBeNull();
    });
    // 引擎默认消息：{title}为必填项
    expect(container.textContent).toContain('为必填项');
  });

  it('输入合法值后错误消失', async () => {
    const { container, form } = renderForm({
      type: 'object',
      properties: {
        username: {
          type: 'string',
          widget: 'input',
          title: '用户名',
          required: true,
        },
      },
    });

    // 先触发校验（提交），必填错误出现
    await form.form!.validateFields();
    await waitFor(() => {
      expect(
        container.querySelector('.ant-form-item-explain-error'),
      ).not.toBeNull();
    });

    // 输入合法值 → 实时校验通过 → 错误消失
    fireEvent.change(container.querySelector('input') as HTMLInputElement, {
      target: { value: 'zhangsan' },
    });
    await waitFor(() => {
      expect(
        container.querySelector('.ant-form-item-explain-error'),
      ).toBeNull();
    });
  });
});