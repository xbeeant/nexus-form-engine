import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { colorWidget } from '../src/widgets/color';

describe('colorWidget', () => {
  it('readOnly 时渲染颜色色块和文本', () => {
    const { container } = render(
      colorWidget({
        value: '#3b82f6',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('#3b82f6');
    const colorBox = container.querySelector('span[style*="background-color"]');
    expect(colorBox).not.toBeNull();
  });

  it('readOnly 空值时渲染占位符 -', () => {
    const { container } = render(
      colorWidget({
        value: undefined,
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('-');
  });

  it('readOnly 空字符串时渲染占位符 -', () => {
    const { container } = render(
      colorWidget({
        value: '',
        readOnly: true,
        onChange: () => {},
      } as never),
    );
    expect(container.textContent).toContain('-');
  });
});
