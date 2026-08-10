/**
 * ExpressionSandbox 测试
 * 覆盖：
 * 1. 表达式求值与上下文变量注入
 * 2. 安全性黑名单过滤
 * 3. 错误隔离与性能统计
 * 4. 环境回退机制
 */

import { describe, expect, it } from 'vitest';
import { Evaluator } from '../src/ExpressionSandbox';

describe('ExpressionSandbox', () => {
  describe('表达式求值', () => {
    it('静态值求值', () => {
      const sandbox = new Evaluator();
      expect(sandbox.evaluate('{{ 1 + 1 }}')).toBe(2);
      expect(sandbox.evaluate('{{ "hello" }}')).toBe('hello');
      expect(sandbox.evaluate('{{ true }}')).toBe(true);
      expect(sandbox.evaluate('{{ false }}')).toBe(false);
    });

    it('对象访问与路径引用', () => {
      const sandbox = new Evaluator();
      const ctx = {
        user: {
          name: '张三',
          age: 25,
        },
        isAdmin: true,
      };

      expect(sandbox.evaluate('{{ user.name }}', ctx)).toBe('张三');
      expect(sandbox.evaluate('{{ user.age }}', ctx)).toBe(25);
      expect(sandbox.evaluate('{{ user.age + 1 }}', ctx)).toBe(26);
      expect(sandbox.evaluate('{{ isAdmin ? "admin" : "user" }}', ctx)).toBe('admin');
    });

    it('$deps 依赖数组访问', () => {
      const sandbox = new Evaluator();
      const ctx = {
        deps: ['fieldA', 'fieldB'],
      };

      expect(sandbox.evaluate('{{ $deps[0] }}', ctx)).toBe('fieldA');
      expect(sandbox.evaluate('{{ $deps[1] }}', ctx)).toBe('fieldB');
      expect(sandbox.evaluate('{{ $deps.length }}', ctx)).toBe(2);
    });

    it('$self 字段状态访问', () => {
      const sandbox = new Evaluator();
      const ctx = {
        self: {
          value: 'test',
          visible: true,
          disabled: false,
        },
      };

      expect(sandbox.evaluate('{{ $self.value }}', ctx)).toBe('test');
      expect(sandbox.evaluate('{{ $self.visible }}', ctx)).toBe(true);
      expect(sandbox.evaluate('{{ $self.disabled }}', ctx)).toBe(false);
    });

    it('$form 引擎访问', () => {
      const sandbox = new Evaluator();
      const mockEngine = {
        getFieldValue: (path: string) => path === 'test' ? 'value' : undefined,
        getFieldState: (path: string) => ({ value: 'state' } as any),
        getFormData: () => ({ test: 'value' }),
        getAllFieldStates: () => new Map(),
        subscribe: () => () => {},
        subscribeField: () => () => {},
        getFieldVersion: () => 1,
        subscribeAll: () => () => {},
      };

      expect(sandbox.evaluate('{{ $form.getFieldValue("test") }}', { form: mockEngine })).toBe('value');
      expect(sandbox.evaluate('{{ $form.getFormData().test }}', { form: mockEngine })).toBe('value');
    });

    it('$index 数组索引访问', () => {
      const sandbox = new Evaluator();
      const ctx = {
        index: 5,
      };

      expect(sandbox.evaluate('{{ $index }}', ctx)).toBe(5);
      expect(sandbox.evaluate('{{ $index + 1 }}', ctx)).toBe(6);
    });

    it('formData 顶层访问', () => {
      const sandbox = new Evaluator();
      const ctx = {
        formData: {
          name: '张三',
          age: 30,
        },
      };

      expect(sandbox.evaluate('{{ formData.name }}', ctx)).toBe('张三');
      expect(sandbox.evaluate('{{ formData.age }}', ctx)).toBe(30);
      expect(sandbox.evaluate('{{ formData.name + formData.age }}', ctx)).toBe('张三30');
    });

    it('rootValue 顶层访问', () => {
      const sandbox = new Evaluator();
      const ctx = {
        rootValue: {
          app: {
            mode: 'admin',
          },
        },
      };

      expect(sandbox.evaluate('{{ rootValue.app.mode }}', ctx)).toBe('admin');
      expect(sandbox.evaluate('{{ rootValue.app.mode === "admin" }}', ctx)).toBe(true);
    });

    it('复杂表达式嵌套', () => {
      const sandbox = new Evaluator();
      const ctx = {
        user: {
          name: '张三',
          age: 25,
        },
        isAdmin: false,
      };

      // 三元运算符嵌套
      expect(
        sandbox.evaluate(
          '{{ user.age > 18 ? (isAdmin ? "成年管理员" : "成年用户") : "未成年人" }}',
          ctx,
        ),
      ).toBe('成年用户');
    });

    it('逻辑运算符', () => {
      const sandbox = new Evaluator();
      const ctx = {
        a: 5,
        b: 10,
        c: true,
      };

      expect(sandbox.evaluate('{{ a > b }}', ctx)).toBe(false);
      expect(sandbox.evaluate('{{ a < b && c }}', ctx)).toBe(true);
      expect(sandbox.evaluate('{{ a > b || c }}', ctx)).toBe(true);
      expect(sandbox.evaluate('{{ !c }}', ctx)).toBe(false);
    });

    it('空值处理', () => {
      const sandbox = new Evaluator();
      const ctx = {
        value: null,
        test: undefined,
        str: '',
      };

      expect(sandbox.evaluate('{{ value }}', ctx)).toBe(null);
      expect(sandbox.evaluate('{{ test }}', ctx)).toBe(undefined);
      expect(sandbox.evaluate('{{ str }}', ctx)).toBe('');
    });
  });

  describe('安全性黑名单过滤', () => {
    it('拦截全局对象访问', () => {
      const sandbox = new Evaluator();
      const ctx = {};

      // 尝试访问 window / document 应被拦截
      expect(() => sandbox.evaluate('{{ window.location }}', ctx)).toThrow();
      expect(() => sandbox.evaluate('{{ document.body }}', ctx)).toThrow();
      expect(() => sandbox.evaluate('{{ console.log }}', ctx)).toThrow();
    });

    it('拦截数组方法污染', () => {
      const sandbox = new Evaluator();
      const ctx = {
        arr: [1, 2, 3],
      };

      // 尝试修改数组方法应被拦截
      expect(() => sandbox.evaluate('{{ arr.push(4) }}', ctx)).toThrow();
      expect(() => sandbox.evaluate('{{ arr.map = () => {} }}', ctx)).toThrow();
    });

    it('拦截对象属性修改', () => {
      const sandbox = new Evaluator();
      const ctx = {
        obj: { a: 1 },
      };

      // 尝试修改 Context 对象属性应被拦截
      expect(() => sandbox.evaluate('{{ obj.a = 2 }}', ctx)).toThrow();
      expect(() => sandbox.evaluate('{{ obj["b"] = 3 }}', ctx)).toThrow();
    });

    it('阻止递归与无限循环', () => {
      const sandbox = new Evaluator();
      const ctx = {};

      // 递归表达式应被拦截
      expect(() =>
        sandbox.evaluate('{{ $self.value === $self.value }}', { self: { value: 'test' } } as any),
      ).toThrow();
    });
  });

  describe('错误隔离', () => {
    it('单个表达式错误不影响后续求值', () => {
      const sandbox = new Evaluator();
      const ctx = {
        a: 1,
      };

      // 第一次错误抛出异常
      expect(() => sandbox.evaluate('{{ $nonexistent.field }}', ctx)).toThrow();

      // 第二次正常求值应不受影响
      expect(sandbox.evaluate('{{ a }}', ctx)).toBe(1);
    });

    it('支持自定义错误处理', () => {
      const sandbox = new Evaluator();
      const ctx = {
        value: null,
      };

      const errors: any[] = [];
      sandbox.setErrorHandler((err) => errors.push(err));

      expect(() => sandbox.evaluate('{{ value.nonexistent }}', ctx)).toThrow();

      expect(errors.length).toBe(1);
      expect(errors[0].message).toContain('Cannot read property');
    });

    it('正则表达式安全隔离', () => {
      const sandbox = new Evaluator();
      const ctx = {
        pattern: '/test/g',
        testStr: 'testtest',
      };

      // 正则应正常工作
      expect(sandbox.evaluate('{{ pattern.test(testStr) }}', ctx)).toBe(true);
      expect(sandbox.evaluate('{{ testStr.replace(pattern, "replaced") }}', ctx)).toBe(
        'replacedreplaced',
      );
    });
  });

  describe('性能统计', () => {
    it('记录表达式求值次数', () => {
      const sandbox = new Evaluator();
      const ctx = { a: 1 };

      sandbox.evaluate('{{ a }}');
      sandbox.evaluate('{{ a }}');
      sandbox.evaluate('{{ a }}');

      expect(sandbox.stats.evaluations).toBe(3);
    });

    it('记录求值耗时', () => {
      const sandbox = new Evaluator();
      const ctx = {
        obj: { nested: { value: 42 } },
      };

      sandbox.evaluate('{{ obj.nested.value }}');
      sandbox.evaluate('{{ obj.nested.value }}');

      expect(sandbox.stats.totalTimeMs).toBeGreaterThan(0);
    });

    it('提供性能报告', () => {
      const sandbox = new Evaluator();
      const ctx = { a: 1 };

      sandbox.evaluate('{{ a }}');
      sandbox.evaluate('{{ a }}');

      const report = sandbox.getPerformanceReport();
      expect(report.evaluations).toBe(2);
      expect(report.totalTimeMs).toBeGreaterThan(0);
      expect(report.avgTimeMs).toBeGreaterThan(0);
    });
  });

  describe('环境回退机制', () => {
    it('structuredClone 不可用时回退到序列化', () => {
      // 模拟 structuredClone 不可用
      const originalClone = (global as any).structuredClone;
      (global as any).structuredClone = undefined;

      const sandbox = new Evaluator();
      const ctx = {
        date: new Date('2026-08-10'),
        regex: /test/g,
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
      };

      expect(sandbox.evaluate('{{ date }}', ctx)).toBeInstanceOf(Date);
      expect(sandbox.evaluate('{{ regex }}', ctx)).toBeInstanceOf(RegExp);
      expect(sandbox.evaluate('{{ map.get("key") }}', ctx)).toBe('value');
      expect(sandbox.evaluate('{{ set.has(1) }}', ctx)).toBe(true);

      // 恢复
      (global as any).structuredClone = originalClone;
    });

    it('处理循环引用（模拟）', () => {
      const sandbox = new Evaluator();
      const ctx = {
        self: {},
      };

      // 循环引用会被捕获并报错
      expect(() =>
        sandbox.evaluate(
          '{{ (function() { self.self = self; return self; })() }}',
          ctx,
        ),
      ).toThrow();
    });
  });

  describe('复杂上下文组合', () => {
    it('$deps + $self + formData 组合', () => {
      const sandbox = new Evaluator();
      const ctx = {
        deps: ['fieldA'],
        self: { value: 'test' },
        formData: { fieldA: 'valueA' },
      };

      expect(sandbox.evaluate('{{ $deps[0] === $self.value }}', ctx)).toBe(false);
      expect(sandbox.evaluate('{{ formData.fieldA === $self.value }}', ctx)).toBe(false);
    });

    it('$form + $index + formData 组合', () => {
      const sandbox = new Evaluator();
      const ctx = {
        index: 0,
        formData: { name: '张三' },
      };

      expect(sandbox.evaluate('{{ index === 0 }}', ctx)).toBe(true);
      expect(sandbox.evaluate('{{ formData.name }}', ctx)).toBe('张三');
    });

    it('多重嵌套对象路径', () => {
      const sandbox = new Evaluator();
      const ctx = {
        user: {
          profile: {
            address: {
              city: '北京',
            },
          },
        },
      };

      expect(
        sandbox.evaluate('{{ user.profile.address.city }}', ctx),
      ).toBe('北京');
      expect(
        sandbox.evaluate('{{ user.profile.address.city === "北京" }}', ctx),
      ).toBe(true);
    });
  });
});
