import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { imageInputWidget } from '../src/widgets/image-input';

describe('imageInputWidget', () => {
  function TestWrapper({ props }: { props: Record<string, unknown> }) {
    return imageInputWidget(props as never);
  }

  it('readOnly 空值渲染占位符', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toBe('-');
  });

  it('readOnly null 值渲染占位符', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: null,
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toBe('-');
  });

  it('readOnly 单张图片渲染', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: 'https://img.png',
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe('https://img.png');
  });

  it('readOnly 多张图片渲染', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: ['https://img1.png', 'https://img2.png'],
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(2);
    expect(imgs[0]?.getAttribute('src')).toBe('https://img1.png');
    expect(imgs[1]?.getAttribute('src')).toBe('https://img2.png');
  });

  it('非 readOnly 正常渲染 Upload', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          onChange: () => {},
        }}
      />,
    );
    expect(container.querySelector('.ant-upload')).not.toBeNull();
  });

  it('非 readOnly 有值时 fileList 初始化', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: 'https://img.png',
          onChange: () => {},
        }}
      />,
    );
    expect(container.querySelector('.ant-upload')).not.toBeNull();
  });

  it('picture-card listType 渲染相机图标', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          listType: 'picture-card',
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('📷');
  });

  it('默认 listType 渲染按钮', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('点击上传');
  });

  it('disabled 时禁用', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          disabled: true,
          onChange: () => {},
        }}
      />,
    );
    const btn = container.querySelector('.ant-btn');
    expect(btn?.hasAttribute('disabled')).toBe(true);
  });

  it('透传 rest props', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          className: 'custom-class',
          onChange: () => {},
        }}
      />,
    );
    const upload = container.querySelector('.custom-class');
    expect(upload).not.toBeNull();
  });
});
