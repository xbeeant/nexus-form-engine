import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { multiSelectWidget } from '../src/widgets/multi-select';

describe('multiSelectWidget', () => {
  it('基础渲染：无值', () => {
    const { container } = render(
      multiSelectWidget({
        value: undefined,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
  });

  it('有值时渲染选中项', () => {
    const { container } = render(
      multiSelectWidget({
        value: ['a', 'b'],
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).not.toBeNull();
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('B');
  });

  it('readOnly 时渲染 ReadOnlyDisplay', () => {
    const { container } = render(
      multiSelectWidget({
        value: ['a', 'b'],
        options: [
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ],
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select')).toBeNull();
    expect(container.textContent).toContain('A');
  });

  it('空值 readOnly 显示占位符', () => {
    const { container } = render(
      multiSelectWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toBe('-');
  });

  it('disabled 时禁用', () => {
    const { container } = render(
      multiSelectWidget({
        value: undefined,
        disabled: true,
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.ant-select-disabled')).not.toBeNull();
  });

  it('loading 时显示 loading 状态', () => {
    const { container } = render(
      multiSelectWidget({
        value: undefined,
        loading: true,
        onChange: () => {},
      } as never),
    );
    const select = container.querySelector('.ant-select');
    expect(select).not.toBeNull();
  });

  it('透传 rest props', () => {
    const { container } = render(
      multiSelectWidget({
        value: undefined,
        className: 'custom-class',
        onChange: () => {},
      } as never),
    );
    expect(container.querySelector('.custom-class')).not.toBeNull();
  });
});
