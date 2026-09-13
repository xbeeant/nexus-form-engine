import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fileWidget } from '../src/widgets/file';

// fileWidget 内部使用 useState 并在非 readOnly 时渲染 antd Upload，
// readOnly 路径会先 return 不调用 useState。
// 但为了覆盖非 readOnly 路径中的 handleChange、beforeUpload、drag mode 等，
// 必须包裹在组件中。

describe('fileWidget', () => {
  function TestWrapper({ props }: { props: Record<string, unknown> }) {
    return fileWidget(props as never);
  }

  it('readOnly 时渲染 ReadOnlyDisplay 显示文件名', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: 'https://example.com/myfile.pdf',
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('myfile.pdf');
    expect(container.querySelector('.ant-upload')).toBeNull();
  });

  it('readOnly 数组值渲染多个文件名', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: ['https://example.com/a.pdf', 'https://example.com/b.pdf'],
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('a.pdf');
    expect(container.textContent).toContain('b.pdf');
  });

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

  it('readOnly listType=picture 时显示 URL', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: 'https://example.com/image.png',
          listType: 'picture',
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('https://example.com/image.png');
  });

  it('readOnly 无值时渲染 -', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: '',
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toBe('-');
  });

  it('非 readOnly 渲染 Upload + Button', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          onChange: () => {},
        }}
      />,
    );
    expect(container.querySelector('.ant-upload')).not.toBeNull();
    expect(container.textContent).toContain('点击上传');
  });

  it('拖拽模式渲染 Dragger', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          drag: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('点击或拖拽文件到此区域上传');
    expect(container.querySelector('.ant-upload-drag')).not.toBeNull();
  });

  it('拖拽模式 + accept 显示支持格式', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          drag: true,
          accept: '.pdf,.doc',
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('支持格式：.pdf,.doc');
  });

  it('非拖拽模式 + listType=picture 渲染', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          listType: 'picture',
          onChange: () => {},
        }}
      />,
    );
    expect(container.querySelector('.ant-upload')).not.toBeNull();
  });

  it('自定义 buttonText', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: undefined,
          buttonText: '上传文件',
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('上传文件');
  });

  it('disabled 时按钮禁用', () => {
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

  it('readOnly listType=picture-card 显示 URL', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: 'https://example.com/img.jpg',
          listType: 'picture-card',
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('https://example.com/img.jpg');
  });

  it('数组值中有空字符串会被过滤', () => {
    const { container } = render(
      <TestWrapper
        props={{
          value: ['https://example.com/a.pdf', '', 'https://example.com/b.pdf'],
          readOnly: true,
          onChange: () => {},
        }}
      />,
    );
    expect(container.textContent).toContain('a.pdf');
    expect(container.textContent).toContain('b.pdf');
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
    expect(container.querySelector('.custom-class')).not.toBeNull();
  });
});
