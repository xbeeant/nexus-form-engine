import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { urlInputWidget } from '../src/widgets/url-input';

describe('urlInputWidget', () => {
  it('渲染 antd Input 控件', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('input')).not.toBeNull();
  });

  it('回显 URL 值', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com/page',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('https://example.com/page');
  });

  it('空值渲染空字符串', () => {
    const { container } = render(
      urlInputWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('默认 placeholder 为 https://', () => {
    const { container } = render(
      urlInputWidget({
        value: '',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.placeholder).toBe('https://');
  });

  it('自定义 placeholder', () => {
    const { container } = render(
      urlInputWidget({
        value: '',
        placeholder: '请输入网址',
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.placeholder).toBe('请输入网址');
  });

  it('有 URL 前缀图标', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com',
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('🔗');
  });

  it('disabled 时输入框禁用', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com',
        disabled: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('loading 时输入框禁用', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com',
        loading: true,
        onChange: () => {},
      } as never),
    );
    const input = container.querySelector('input') as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it('readOnly 时渲染 ReadOnlyDisplay 文本', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).toContain('https://example.com');
  });

  it('readOnly 空值时渲染占位符', () => {
    const { container } = render(
      urlInputWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('透传 rest props', () => {
    const { container } = render(
      urlInputWidget({
        value: 'https://example.com',
        onChange: () => {},
        autoComplete: 'url',
      } as never),
    );
    const input = container.querySelector<HTMLInputElement>(
      'input[autocomplete="url"]',
    );
    expect(input).not.toBeNull();
  });
});
