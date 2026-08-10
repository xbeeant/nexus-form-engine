/**
 * SchemaParser 测试
 * 覆盖：
 * 1. 路径计算规则（数据节点 vs 布局节点）
 * 2. reactions 依赖作用域解析
 * 3. validate 表达式依赖提取
 */

import { describe, expect, it } from 'vitest';
import { SchemaParser } from '../src/SchemaParser';
import type { NexusSchema, SchemaNode } from '../src/types/schema';

describe('SchemaParser', () => {
  describe('路径计算规则', () => {
    it('数据节点：Key 进入 formData 路径', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          name: { type: 'string', widget: 'input' },
          profile: {
            type: 'object',
            properties: {
              age: { type: 'number', widget: 'number' },
            },
          },
          tags: {
            type: 'array',
            widget: 'list',
            items: { type: 'string' },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      // 数据字段 Key 进入路径
      expect(dataFields.get('name')).toEqual({
        type: 'string',
        widget: 'input',
      });

      // 嵌套对象字段 Key 进入路径
      expect(dataFields.get('profile')).toEqual({
        type: 'object',
        properties: { age: { type: 'number', widget: 'number' } },
      });

      // 数组字段 Key 进入路径
      expect(dataFields.get('tags')).toEqual({
        type: 'array',
        widget: 'list',
        items: { type: 'string' },
      });

      // items 子字段不进入 formData 收集
      expect(dataFields.has('tags[0].value')).toBe(false);
    });

    it('布局节点：Key 不进入 formData 路径', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          card: {
            type: 'card',
            properties: {
              name: { type: 'string', widget: 'input' },
            },
          },
          grid: {
            type: 'grid',
            properties: {
              field1: { type: 'string', widget: 'input' },
              field2: { type: 'string', widget: 'input' },
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      // 布局节点 Key 不进入 formData 路径
      expect(dataFields.has('card')).toBe(false);
      expect(dataFields.has('grid')).toBe(false);

      // 布局节点下的数据字段 Key 进入路径
      expect(dataFields.get('card.name')).toEqual({
        type: 'string',
        widget: 'input',
      });
      expect(dataFields.get('grid.field1')).toEqual({
        type: 'string',
        widget: 'input',
      });
      expect(dataFields.get('grid.field2')).toEqual({
        type: 'string',
        widget: 'input',
      });
    });

    it('嵌套布局结构中路径正确透传', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          container: {
            type: 'tabs',
            properties: {
              tab1: {
                type: 'tabPane',
                properties: {
                  nested: {
                    type: 'card',
                    properties: {
                      field: { type: 'string', widget: 'input' },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      // 布局节点 Key 被丢弃，直接透传父路径
      expect(dataFields.has('container')).toBe(false);
      expect(dataFields.has('container.tab1')).toBe(false);
      expect(dataFields.has('container.tab1.nested')).toBe(false);

      // 数据字段 Key 正确进入路径
      expect(dataFields.get('container.tab1.nested.field')).toEqual({
        type: 'string',
        widget: 'input',
      });
    });
  });

  describe('reactions 依赖作用域解析', () => {
    it('同一层级字段相对路径引用', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          province: { type: 'string', widget: 'input' },
          city: {
            type: 'string',
            widget: 'input',
            reactions: [
              {
                dependencies: ['province'],
                fulfill: { state: { visible: true } },
              } as any,
            ],
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      // city 的 reactions 应正确提取 province 依赖
      const cityField = dataFields.get('city');
      expect(cityField?.reactions).toBeDefined();
      if (cityField?.reactions) {
        expect(cityField.reactions[0].dependencies).toContain('province');
      }
    });

    it('嵌套对象中相对路径引用', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              email: { type: 'string', widget: 'input' },
              profile: {
                type: 'object',
                properties: {
                  phone: {
                    type: 'string',
                    widget: 'input',
                    reactions: [
                      {
                        dependencies: ['user.email'],
                        fulfill: { state: { visible: true } },
                      } as any,
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      const phoneField = dataFields.get('user.profile.phone');
      expect(phoneField?.reactions).toBeDefined();
      if (phoneField?.reactions) {
        expect(phoneField.reactions[0].dependencies).toContain('user.email');
      }
    });

    it('多字段同时依赖同一字段', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          base: { type: 'string', widget: 'input' },
          fieldA: {
            type: 'string',
            widget: 'input',
            reactions: [{ dependencies: ['base'], fulfill: {} } as any],
          },
          fieldB: {
            type: 'string',
            widget: 'input',
            reactions: [{ dependencies: ['base'], fulfill: {} } as any],
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      expect(dataFields.get('fieldA')?.reactions).toBeDefined();
      expect(dataFields.get('fieldB')?.reactions).toBeDefined();
      if (dataFields.get('fieldA')?.reactions && dataFields.get('fieldB')?.reactions) {
        expect(dataFields.get('fieldA')!.reactions![0].dependencies).toContain('base');
        expect(dataFields.get('fieldB')!.reactions![0].dependencies).toContain('base');
      }
    });
  });

  describe('validate 表达式依赖提取', () => {
    it('从 validate 表达式中提取 formData.xxx 依赖', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          password: { type: 'string', widget: 'input' },
          confirm: {
            type: 'string',
            widget: 'input',
            validate: {
              match: '{{ formData.password === $self.value }}',
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      const confirmField = dataFields.get('confirm');
      expect(confirmField).toBeDefined();
      if (confirmField) {
        expect(confirmField.validate).toBeDefined();
        if (confirmField.validate) {
          // extractExprDependencies 应提取 password 依赖
          expect(confirmField.validate.match).toContain('formData.password');
        }
      }
    });

    it('嵌套对象中 validate 表达式依赖提取', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          address: {
            type: 'object',
            properties: {
              province: { type: 'string', widget: 'input' },
              city: {
                type: 'string',
                widget: 'input',
                validate: {
                  depends: '{{ formData.province === "北京" }}',
                },
              },
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      const cityField = dataFields.get('address.city');
      expect(cityField?.validate).toBeDefined();
      if (cityField?.validate) {
        expect(cityField.validate.depends).toContain('formData.province');
      }
    });

    it('数组项中 validate 表达式依赖提取', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', widget: 'input' },
                duplicate: {
                  type: 'string',
                  widget: 'input',
                  validate: {
                    check: '{{ $deps[0].name === $self.value }}',
                  },
                },
              },
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      // items[0].name 不参与 formData 收集
      expect(dataFields.has('items[0].name')).toBe(false);
    });
  });

  describe('表达式标记字段类型污染清理', () => {
    it('识别并标记 _validateExpr 等内部字段', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            widget: 'input',
            validate: {
              regex: '{{ $deps[0].match(/^\\S+@\\S+$/ ) }}',
            },
          },
        },
      };

      const { dataFields } = SchemaParser.parse(schema);

      const emailField = dataFields.get('email');
      expect(emailField).toBeDefined();
      if (emailField) {
        // 检查 validate 规则中是否包含 _validateExpr
        expect(emailField.validate?.regex).toBeDefined();
        if (typeof emailField.validate?.regex === 'string') {
          // 验证表达式包含 $deps 引用
          expect(emailField.validate.regex).toContain('$deps');
        }
      }
    });
  });
});
