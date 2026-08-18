import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NexusForm, useForm } from '@xbeeant/form-engine-react';
import { registerAntdUI } from '../src';
import { ReadOnlyDisplay } from '../src/widgets/_shared';

function renderWithLocale(
  schema: unknown,
  locale?: string,
  initialValues?: Record<string, unknown>,
  readOnly?: boolean,
) {
  function TestForm() {
    const [form] = useForm();
    registerAntdUI(form._getEngine());
    return (
      <NexusForm
        form={form}
        schema={schema as never}
        footer={false}
        locale={locale}
        initialValues={initialValues}
        readOnly={readOnly}
      />
    );
  }
  return render(<TestForm />);
}

describe('i18n（locale 支持）', () => {
  it('ReadOnlyDisplay 默认语言包：中文 是/否', () => {
    const { container } = render(<ReadOnlyDisplay value={true} />);
    expect(container.textContent).toBe('是');
  });

  it('en-US 语言包：只读布尔渲染 Yes/No', () => {
    const { container } = render(
      <NexusFormWrap locale='en-US'>
        <ReadOnlyDisplay value={false} />
      </NexusFormWrap>,
    );
    expect(container.textContent).toBe('No');
  });

  it('表单级 locale 生效于只读展示（switch 只读 = Yes）', () => {
    const { container } = renderWithLocale(
      {
        type: 'object',
        properties: {
          vip: { type: 'boolean', widget: 'switch', title: 'VIP' },
        },
      },
      'en-US',
      { vip: true },
      true,
    );
    expect(container.textContent).toContain('Yes');
  });

  it('antd 组件 locale 随表单级 locale 切换（DatePicker placeholder）', () => {
    const zh = renderWithLocale(
      {
        type: 'object',
        properties: {
          d: { type: 'string', widget: 'date', title: '日期' },
        },
      },
      'zh-CN',
    );
    expect(
      (zh.container.querySelector('input') as HTMLInputElement).placeholder,
    ).toContain('请选择日期');

    const en = renderWithLocale(
      {
        type: 'object',
        properties: {
          d: { type: 'string', widget: 'date', title: 'Date' },
        },
      },
      'en-US',
    );
    const placeholder = (
      en.container.querySelector('input') as HTMLInputElement
    ).placeholder;
    expect(placeholder).toBe('Select date');
  });

  it('未知 locale 回退中文', () => {
    const { container } = renderWithLocale(
      {
        type: 'object',
        properties: {
          vip: { type: 'boolean', widget: 'switch', title: '会员' },
        },
      },
      'fr-FR',
      { vip: true },
      true,
    );
    expect(container.textContent).toContain('是');
  });
});

function NexusFormWrap({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const [form] = useForm();
  return (
    <NexusForm form={form} footer={false} locale={locale}>
      {children}
    </NexusForm>
  );
}