import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { passwordWidget } from '../src/widgets/password';

describe('passwordWidget', () => {
  it('渲染 antd Input.Password 控件', () => {
    const { container } = render(
      passwordWidget({
        value: 'secret',
        onChange: () => {},
      } as never),
    );
    // Password 输入框使用 input 类型
    expect(container.querySelector('input[type="password"]')).not.toBeNull();
  });

  it('回显 value 到输入框', () => {
    const { container } = render(
      passwordWidget({
        value: 'mypassword',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('mypassword');
  });

  it('空值渲染空字符串', () => {
    const { container } = render(
      passwordWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('disabled 时输入框禁用', () => {
    const { container } = render(
      passwordWidget({
        value: 'test',
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('loading 时输入框禁用', () => {
    const { container } = render(
      passwordWidget({
        value: 'test',
        loading: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 文本', () => {
    const { container } = render(
      passwordWidget({
        value: 'hidden',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).toBe('hidden');
  });

  it('placeholder 透传', () => {
    const { container } = render(
      passwordWidget({
        value: '',
        placeholder: '请输入密码',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector(
      'input[type="password"]',
    ) as HTMLInputElement;
    expect(input.placeholder).toBe('请输入密码');
  });

  it('透传 rest props', () => {
    const { container } = render(
      passwordWidget({
        value: 'test',
        onChange: () => {},
        autoComplete: 'new-password',
      } as never),
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[autocomplete="new-password"]',
    );
    expect(input).not.toBeNull();
  });
});
