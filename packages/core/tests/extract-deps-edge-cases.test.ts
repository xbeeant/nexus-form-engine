import { describe, it, expect } from 'vitest';
import { extractDepsFromExpression } from '../src/schema-parser';

describe('extractDepsFromExpression edge cases', () => {
  it('handles indexOf', () => {
    expect(extractDepsFromExpression("formData.name.indexOf('a')")).toEqual(['name']);
  });

  it('handles trim', () => {
    expect(extractDepsFromExpression("formData.name.trim() === 'hello'")).toEqual(['name']);
  });

  it('handles chain: trim().length', () => {
    // trim().length → name
    expect(extractDepsFromExpression("formData.name.trim().length > 5")).toEqual(['name']);
  });

  it('handles includes with unicode', () => {
    expect(extractDepsFromExpression("formData.implType.includes('关联附件')")).toEqual(['implType']);
  });

  it('handles simple comparison', () => {
    expect(extractDepsFromExpression("formData.name === 'hello'")).toEqual(['name']);
  });

  it('handles optional chaining', () => {
    expect(extractDepsFromExpression("formData.user?.name === 'a'")).toEqual(['user.name']);
  });

  it('handles multiple deps', () => {
    expect(extractDepsFromExpression("formData.a === formData.b")).toEqual(['a', 'b']);
  });

  it('handles concat', () => {
    expect(extractDepsFromExpression("formData.list.concat(['x'])")).toEqual(['list']);
  });

  it('handles some', () => {
    expect(extractDepsFromExpression("formData.items.some(i => i > 0)")).toEqual(['items']);
  });

  it('handles map', () => {
    expect(extractDepsFromExpression("formData.names.map(String.prototype.toString)")).toEqual(['names']);
  });
});
