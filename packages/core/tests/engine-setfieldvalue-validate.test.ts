/**
 * setFieldValue 的 validate 开关测试
 *
 * 覆盖：
 * 1. 默认行为（validate 缺省）保持向后兼容：仍然实时校验
 * 2. validate=false 跳过当前字段的实时校验
 * 3. validate=false 跳过沿依赖图传播的跨字段 validate 表达式实时重校验
 * 4. validate=false 时，reactions（value/visible/required 等）仍然正常执行
 * 5. validate=false 时，值仍正确写入、订阅仍正常通知
 * 6. validate=true（显式）行为与默认一致
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('setFieldValue validate 开关', () => {
  describe('默认行为（向后兼容）', () => {
    it('不传 validate 参数时仍实时校验 required 失败', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', required: true },
        },
      };
      engine.init(schema);

      engine.setFieldValue('username', '');
      expect(engine.getFieldError('username')).toContain('username 为必填项');
    });

    it('不传 validate 参数时仍实时校验 min 规则', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            widget: 'input',
            rules: [{ min: 3, message: '长度需 3+' }],
          },
        },
      };
      engine.init(schema);

      engine.setFieldValue('username', 'ab');
      expect(engine.getFieldError('username')).toContain('长度需 3+');
    });
  });

  describe('validate=false 跳过当前字段校验', () => {
    it('validate=false 跳过 required 实时校验（错误不产生）', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', required: true },
        },
      };
      engine.init(schema);

      // 显式跳过校验
      engine.setFieldValue('username', '', false);
      expect(engine.getFieldValue('username')).toBe('');
      // 校验未触发 → 错误为空
      expect(engine.getFieldError('username')).toEqual([]);

      // 显式触发校验 → 错误产生
      engine.validateField('username');
      expect(engine.getFieldError('username')).toContain('username 为必填项');
    });

    it('validate=false 跳过 min 实时校验', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            widget: 'input',
            rules: [{ min: 3, message: '长度需 3+' }],
          },
        },
      };
      engine.init(schema);

      engine.setFieldValue('username', 'ab', false);
      expect(engine.getFieldValue('username')).toBe('ab');
      expect(engine.getFieldError('username')).toEqual([]);
    });

    it('validate=false 仍写入值并通知订阅者', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input' },
        },
      };
      engine.init(schema);

      let notified = 0;
      engine.subscribeField('username', () => {
        notified += 1;
      });

      engine.setFieldValue('username', 'hello', false);
      expect(engine.getFieldValue('username')).toBe('hello');
      expect(notified).toBeGreaterThan(0);
    });
  });

  describe('validate=false 不影响 reactions 联动', () => {
    it('validate=false 仍触发 reactions 同步状态（visible/required）', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          toggle: { type: 'string', widget: 'input' },
          dependent: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['toggle'],
                when: "{{ formData.toggle === 'show' }}",
                fulfill: { state: { required: true } },
                otherwise: { state: { required: false } },
              },
            ],
          },
        },
      };
      engine.init(schema);

      // validate=false：reaction 仍执行（状态字段联动）
      engine.setFieldValue('toggle', 'show', false);
      expect(engine.getFieldState('dependent')?.required).toBe(true);

      engine.setFieldValue('toggle', 'hide', false);
      expect(engine.getFieldState('dependent')?.required).toBe(false);
    });

    it('validate=false 仍触发 reaction 修改其他字段值', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          a: { type: 'string', widget: 'input' },
          b: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['a'],
                // 表达式仅匹配 ^...$ 严格模式（formData.a + "_mirror" 拼接）
                fulfill: { state: { value: '{{ formData.a + "_mirror" }}' } },
              },
            ],
          },
        },
      };
      engine.init(schema);

      engine.setFieldValue('a', 'X', false);
      // reaction 仍执行（值联动）
      expect(engine.getFieldValue('b')).toBe('X_mirror');
    });
  });

  describe('validate=false 跳过跨字段 validate 表达式实时重校验', () => {
    it('validate=false 时不触发依赖该字段的下游 validate 表达式重校验', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          password: { type: 'string', widget: 'input' },
          confirmPassword: {
            type: 'string',
            widget: 'input',
            validate: {
              match: '{{ formData.password === $self.value }}',
            },
          },
        },
      };
      // 初始值：password='abc', confirmPassword='abc'（一致）
      engine.init(schema, { password: 'abc', confirmPassword: 'abc' });
      expect(engine.getFieldError('confirmPassword')).toEqual([]);

      // 默认（validate=true）：password 变化触发 confirmPassword 的跨字段 validate 表达式重校验
      // 新值 xyz 与 abc 不一致 → 错误产生
      engine.setFieldValue('password', 'xyz');
      expect(engine.getFieldError('confirmPassword')).toContain(
        'confirmPassword 校验未通过',
      );

      // 重置后，validate=false：password 变化不触发跨字段 validate 表达式重校验
      engine.reset();
      engine.setFieldValue('confirmPassword', 'abc', false);
      // 先让两者一致（validate=false 不触发校验），
      // 模拟场景：批量初始化或 watch 联动时不希望中间态产生校验错误
      engine.setFieldValue('password', 'abc', false);
      // 此时没有触发过校验 → 无错误
      expect(engine.getFieldError('confirmPassword')).toEqual([]);

      // 显式 validate=false：password 变化不触发跨字段表达式实时重校验
      engine.setFieldValue('password', 'xyz', false);
      // 错误未产生（validate=false 跳过了跨字段表达式实时重校验）
      expect(engine.getFieldError('confirmPassword')).toEqual([]);

      // 显式触发校验 → 错误产生
      engine.validateField('confirmPassword');
      expect(engine.getFieldError('confirmPassword')).toContain(
        'confirmPassword 校验未通过',
      );
    });
  });

  describe('validate=true（显式）行为与默认一致', () => {
    it('validate=true 显式开启校验', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          username: { type: 'string', widget: 'input', required: true },
        },
      };
      engine.init(schema);

      engine.setFieldValue('username', '', true);
      expect(engine.getFieldError('username')).toContain('username 为必填项');
    });
  });

  describe('典型场景：批量初始化默认值后延后校验', () => {
    it('多次 setFieldValue(value, false) 后一次 validate() 统一校验', async () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          a: { type: 'string', widget: 'input', required: true },
          b: { type: 'string', widget: 'input', required: true },
          c: { type: 'string', widget: 'input', required: true },
        },
      };
      engine.init(schema);

      // 批量初始化：跳过逐字段实时校验
      engine.setFieldValue('a', 'A', false);
      engine.setFieldValue('b', 'B', false);
      engine.setFieldValue('c', 'C', false);

      expect(engine.getFieldError('a')).toEqual([]);
      expect(engine.getFieldError('b')).toEqual([]);
      expect(engine.getFieldError('c')).toEqual([]);

      // 统一触发校验
      const errors = await engine.validate();
      // validate() 只把有错误的字段写入 Map（errors.length > 0）
      expect(errors.has('a')).toBe(false);
      expect(errors.has('b')).toBe(false);
      expect(errors.has('c')).toBe(false);

      // 反向用例：故意置空，validate() 统一报错
      engine.setFieldValue('a', '', false);
      engine.setFieldValue('b', '', false);
      const errors2 = await engine.validate();
      expect(errors2.get('a')).toContain('a 为必填项');
      expect(errors2.get('b')).toContain('b 为必填项');
      // c 未被本次写入，validate() 仍按当前值校验（仍通过）
      expect(errors2.has('c')).toBe(false);
    });
  });
});
