/**
 * ExpressionSandbox 测试
 * 覆盖：
 * 1. 表达式求值与上下文白名单变量注入（$deps/$self/$form/$index/formData/rootValue）
 * 2. 安全性黑名单过滤
 * 3. 错误隔离与性能统计
 */

import { describe, expect, it } from 'vitest';
import {
  createExpressionSandbox,
  ErrorHandlerStrategy,
} from '../src/expression-sandbox';
import type { FieldState, ReactionContext } from '../src/types/schema';

function baseCtx(extra?: Partial<ReactionContext>): ReactionContext {
  return {
    $deps: [],
    $self: {} as FieldState,
    $form: {} as ReactionContext['$form'],
    $index: undefined,
    formData: {},
    rootValue: {},
    ...extra,
  };
}

const mockEngine = {
  getFieldValue: (path: string) => (path === 'test' ? 'value' : undefined),
  getFieldState: (_path: string) =>
    ({ value: 'state' }) as unknown as FieldState,
  getFormData: () => ({ test: 'value' }),
  getAllFieldStates: () => new Map(),
  subscribe: () => () => {},
  subscribeField: () => () => {},
  subscribeAll: () => () => {},
  getFieldVersion: () => 1,
} as unknown as ReactionContext['$form'];

describe('ExpressionSandbox', () => {
  describe('表达式求值', () => {
    it('静态值求值', () => {
      const sandbox = createExpressionSandbox();
      expect(sandbox.evaluate('1 + 1', baseCtx())).toBe(2);
      expect(sandbox.evaluate('"hello"', baseCtx())).toBe('hello');
      expect(sandbox.evaluate('true', baseCtx())).toBe(true);
      expect(sandbox.evaluate('false', baseCtx())).toBe(false);
    });

    it('formData / rootValue 对象访问与路径引用', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({
        formData: { user: { name: '张三', age: 25 }, isAdmin: true },
        rootValue: { user: { name: '张三', age: 25 }, isAdmin: true },
      });

      expect(sandbox.evaluate('formData.user.name', ctx)).toBe('张三');
      expect(sandbox.evaluate('rootValue.user.age', ctx)).toBe(25);
      expect(sandbox.evaluate('formData.user.age + 1', ctx)).toBe(26);
      expect(sandbox.evaluate('formData.isAdmin ? "admin" : "user"', ctx)).toBe(
        'admin',
      );
    });

    it('$deps 依赖数组访问', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ $deps: ['fieldA', 'fieldB'] });

      expect(sandbox.evaluate('$deps[0]', ctx)).toBe('fieldA');
      expect(sandbox.evaluate('$deps[1]', ctx)).toBe('fieldB');
      expect(sandbox.evaluate('$deps.length', ctx)).toBe(2);
    });

    it('$self 字段状态访问', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({
        $self: {
          value: 'test',
          hidden: false,
          disabled: false,
        } as unknown as FieldState,
      });

      expect(sandbox.evaluate('$self.value', ctx)).toBe('test');
      expect(sandbox.evaluate('$self.hidden', ctx)).toBe(false);
      expect(sandbox.evaluate('$self.disabled', ctx)).toBe(false);
    });

    it('$form 引擎访问', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ $form: mockEngine });

      expect(sandbox.evaluate('$form.getFieldValue("test")', ctx)).toBe(
        'value',
      );
      expect(sandbox.evaluate('$form.getFormData().test', ctx)).toBe('value');
    });

    it('$index 数组索引访问', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ $index: 5 });

      expect(sandbox.evaluate('$index', ctx)).toBe(5);
      expect(sandbox.evaluate('$index + 1', ctx)).toBe(6);
    });

    it('$deps + $self + formData 组合', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({
        $deps: ['yes'],
        $self: { value: 'v' } as unknown as FieldState,
        formData: { toggle: 'yes' },
      });

      expect(
        sandbox.evaluate(
          '$deps[0] === "yes" && $self.value !== "" && formData.toggle === $deps[0]',
          ctx,
        ),
      ).toBe(true);
    });

    it('$form + $index + formData 组合', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({
        $form: mockEngine,
        $index: 2,
        formData: { list: ['a', 'b', 'c'] },
      });

      expect(
        sandbox.evaluate(
          '$form.getFieldValue("test") === "value" && $index === 2 && formData.list[$index] === "c"',
          ctx,
        ),
      ).toBe(true);
    });

    it('空值处理：访问不存在的路径返回默认值', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { user: {} } });

      expect(sandbox.evaluate('formData.user.missing', ctx)).toBeUndefined();
      expect(sandbox.evaluate('$deps[99]', ctx)).toBeUndefined();
    });

    it('字符串方法等合法属性访问不被误伤', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { name: 'a@b.com' } });

      expect(sandbox.evaluate('formData.name.trim()', ctx)).toBe('a@b.com');
      expect(sandbox.evaluate('formData.name.length', ctx)).toBe(7);
    });

    it('数组/对象字面量内安全求值', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { a: 1, b: 2 } });

      expect(
        sandbox.evaluate(
          '(function(){ return formData.a + formData.b })()',
          ctx,
        ),
      ).toBe(3);
    });
  });

  describe('安全性黑名单过滤', () => {
    it('拦截全局对象访问', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx();

      // window / document / localStorage 等进入黑名单，Token 级检查直接拦截
      expect(sandbox.evaluate('window.location', ctx)).toBeUndefined();
      expect(sandbox.evaluate('document.body', ctx)).toBeUndefined();
      expect(
        sandbox.evaluate('localStorage.getItem("x")', ctx),
      ).toBeUndefined();
    });

    it('严格模式抛出错误', () => {
      const sandbox = createExpressionSandbox({
        errorHandler: ErrorHandlerStrategy.STRICT,
      });

      expect(() => sandbox.evaluate('window.location', baseCtx())).toThrow(
        /blocked keyword/,
      );
    });

    it('拦截与全局重名的字段作为独立标识符使用', () => {
      const sandbox = createExpressionSandbox({
        errorHandler: ErrorHandlerStrategy.STRICT,
      });

      expect(() => sandbox.evaluate('window', baseCtx())).toThrow(
        /blocked keyword/,
      );
      expect(() => sandbox.evaluate('parent', baseCtx())).toThrow(
        /blocked keyword/,
      );
    });

    it('表单字段名与全局重名时不被误伤（属性访问豁免）', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({
        formData: {
          window: 'closed',
          parent: 'p001',
          self: 's1',
          top: 't1',
          screen: 'lg',
          location: 'cn',
          document: 'doc-1',
          body: 'body-1',
        },
        rootValue: {
          document: 'doc-1',
          body: 'body-1',
        },
      });

      expect(sandbox.evaluate('formData.window', ctx)).toBe('closed');
      expect(sandbox.evaluate('formData.window === "closed"', ctx)).toBe(true);
      expect(sandbox.evaluate('formData.parent', ctx)).toBe('p001');
      expect(sandbox.evaluate('formData.self', ctx)).toBe('s1');
      expect(sandbox.evaluate('formData.top', ctx)).toBe('t1');
      expect(sandbox.evaluate('formData.screen', ctx)).toBe('lg');
      expect(sandbox.evaluate('formData.location', ctx)).toBe('cn');
      expect(sandbox.evaluate('rootValue.document', ctx)).toBe('doc-1');
      expect(sandbox.evaluate('rootValue.body', ctx)).toBe('body-1');
    });

    it('strict 模式下属性访问豁免同样生效', () => {
      const sandbox = createExpressionSandbox({
        errorHandler: ErrorHandlerStrategy.STRICT,
      });
      const ctx = baseCtx({ formData: { window: 'ok' } });

      expect(sandbox.evaluate('formData.window', ctx)).toBe('ok');
      expect(() => sandbox.evaluate('window.location', ctx)).toThrow(
        /blocked keyword/,
      );
    });

    it('可选链属性访问同样豁免全局名', () => {
      const sandbox = createExpressionSandbox({
        errorHandler: ErrorHandlerStrategy.STRICT,
      });
      const ctx = baseCtx({ formData: { window: 'ok' } });

      expect(sandbox.evaluate('formData?.window', ctx)).toBe('ok');
      expect(() => sandbox.evaluate('window?.location', ctx)).toThrow(
        /blocked keyword/,
      );
    });

    it('原型链危险名作为属性访问仍被拦截（constructor）', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({
        formData: { a: 'x' },
        $self: { constructor: {} } as unknown as FieldState,
      });

      expect(sandbox.evaluate('formData.a.constructor', ctx)).toBeUndefined();
      expect(sandbox.evaluate('$self.constructor', ctx)).toBeUndefined();
      expect(sandbox.evaluate('formData.a.__proto__', ctx)).toBeUndefined();
    });

    it('拦截 eval / constructor / Function 等危险方法', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { text: 'a@b' } });

      expect(sandbox.evaluate('eval("1+1")', ctx)).toBeUndefined();
      expect(
        sandbox.evaluate('"".constructor.constructor("return 1")()', ctx),
      ).toBeUndefined();
      expect(
        sandbox.evaluate('new Function("return 1")()', ctx),
      ).toBeUndefined();
    });

    it('正则表达式在沙箱内安全求值', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { email: 'a@b.com' } });

      const result = sandbox.evaluate(
        'formData.email.match(/^\\S+@\\S+$/)',
        ctx,
      );
      expect(Array.isArray(result)).toBe(true);
      expect((result as string[])[0]).toBe('a@b.com');
    });
  });

  describe('错误隔离', () => {
    it('单个表达式错误不影响后续求值', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { a: 1 } });

      const results = sandbox.evaluateBatch(
        {
          bad: 'window.location',
          good: 'formData.a + 1',
        },
        ctx,
      );

      expect(results.bad).toBeUndefined();
      expect(results.good).toBe(2);
    });

    it('支持自定义默认返回值', () => {
      const sandbox = createExpressionSandbox({ defaultValue: 'fallback' });
      const ctx = baseCtx({ formData: { a: 1 } });

      expect(sandbox.evaluate('window.location', ctx)).toBe('fallback');
      expect(sandbox.evaluate('1 + 1', ctx)).toBe(2);
    });
  });

  describe('性能统计', () => {
    it('记录表达式求值次数', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx({ formData: { a: 1 } });

      sandbox.evaluate('1 + 1', ctx);
      sandbox.evaluate('formData.a', ctx);
      sandbox.evaluate('window.location', ctx);

      const stats = sandbox.getStats();
      expect(stats.evaluationCount).toBe(3);
      expect(stats.errorCount).toBe(1);
      expect(stats.minEvaluationTime).toBeGreaterThanOrEqual(0);
      expect(stats.maxEvaluationTime).toBeGreaterThanOrEqual(
        stats.minEvaluationTime,
      );
    });

    it('重置统计信息', () => {
      const sandbox = createExpressionSandbox();
      const ctx = baseCtx();

      sandbox.evaluate('1 + 1', ctx);
      sandbox.resetStats();

      const stats = sandbox.getStats();
      expect(stats.evaluationCount).toBe(0);
      expect(stats.errorCount).toBe(0);
    });

    it('记录最后执行的表达式', () => {
      const sandbox = createExpressionSandbox();
      sandbox.evaluate('1 + 1', baseCtx());

      expect(sandbox.getLastExpression()).toBe('1 + 1');
    });
  });
});
