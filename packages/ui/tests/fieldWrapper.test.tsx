import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NexusFormProvider } from '@xbeeant/form-engine-react';
import { useForm } from '@xbeeant/form-engine-react';
import { FieldWrapper, type FieldWrapperProps } from '../src/widgets/_shared';

function renderWrapper(
  props: Partial<FieldWrapperProps>,
  config: Record<string, unknown> = {},
) {
  function TestComponent() {
    const [form] = useForm();
    const engine = form._getEngine();
    return (
      <NexusFormProvider
        engine={engine}
        form={form}
        config={{ displayType: 'row', label: true, ...config } as never}
      >
        <FieldWrapper {...(props as FieldWrapperProps)}>
          <input data-testid='control' />
        </FieldWrapper>
      </NexusFormProvider>
    );
  }
  return render(<TestComponent />);
}

describe('FieldWrapper（ui 层字段包裹）', () => {
  it('渲染 Form.Item 与 label 标题', () => {
    const { container } = renderWrapper({ title: '用户名' });
    const item = container.querySelector('.ant-form-item');
    expect(item).not.toBeNull();
    expect(item!.textContent).toContain('用户名');
    expect(container.querySelector('[data-testid="control"]')).not.toBeNull();
  });

  it('errors 展示为校验错误（validateStatus=error + help 文案）', () => {
    const { container } = renderWrapper({
      title: '用户名',
      errors: ['请输入用户名'],
    });
    const explain = container.querySelector('.ant-form-item-explain-error');
    expect(explain).not.toBeNull();
    expect(explain!.textContent).toContain('请输入用户名');
  });

  it('required 展示必填标记', () => {
    const { container } = renderWrapper({ title: '年龄', required: true });
    const requiredMark = container.querySelector('.ant-form-item-required');
    expect(requiredMark).not.toBeNull();
  });

  it('extra 展示辅助文案', () => {
    const { container } = renderWrapper({
      title: '密码',
      extra: '至少 8 位',
    });
    const extra = container.querySelector('.ant-form-item-extra');
    expect(extra).not.toBeNull();
    expect(extra!.textContent).toContain('至少 8 位');
  });

  it('label=false 时不包裹 Form.Item，裸渲染控件', () => {
    const { container } = renderWrapper({ title: '无标签字段', label: false });
    expect(container.querySelector('.ant-form-item')).toBeNull();
    expect(container.querySelector('[data-testid="control"]')).not.toBeNull();
  });

  it('表单级 label=false 同样跳过 Form.Item', () => {
    const { container } = renderWrapper({ title: '无标签字段' }, { label: false });
    expect(container.querySelector('.ant-form-item')).toBeNull();
  });
});