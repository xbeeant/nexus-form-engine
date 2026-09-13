import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { htmlWidget } from '../src/widgets/html';

describe('htmlWidget', () => {
  it('渲染带 HTML 内容的容器', () => {
    const { container } = render(
      htmlWidget({
        value: '<p>Hello <strong>World</strong></p>',
      } as never),
    );
    const div = container.querySelector('div[style*="min-height"]');
    expect(div).not.toBeNull();
  });

  it('正确渲染 HTML 内容', () => {
    const { container } = render(
      htmlWidget({
        value: '<h1>标题</h1><p>段落内容</p>',
      } as never),
    );
    expect(container.innerHTML).toContain('标题');
    expect(container.innerHTML).toContain('段落内容');
  });

  it('空值渲染占位符 -', () => {
    const { container } = render(
      htmlWidget({
        value: '',
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('undefined 值渲染占位符 -', () => {
    const { container } = render(
      htmlWidget({
        value: undefined,
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('null 值渲染占位符 -', () => {
    const { container } = render(
      htmlWidget({
        value: null,
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('简单文本也正常渲染', () => {
    const { container } = render(
      htmlWidget({
        value: '纯文本内容',
      } as never),
    );
    expect(container.textContent).toContain('纯文本内容');
  });

  it('空字符串渲染占位符 -', () => {
    const { container } = render(
      htmlWidget({
        value: '',
      } as never),
    );
    expect(container.textContent).toBe('-');
  });
});
