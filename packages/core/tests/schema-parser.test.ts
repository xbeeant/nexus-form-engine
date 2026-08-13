/**
 * SchemaParser 测试
 * 覆盖：
 * 1. 路径计算规则（数据节点 vs 布局节点）
 * 2. reactions 依赖作用域解析
 * 3. validate 表达式依赖提取
 * 4. 数组项子字段（itemOf 标记）
 */

import { describe, expect, it } from 'vitest';
import * as SchemaParser from '../src/SchemaParser';
import type { NexusSchema } from '../src/types/schema';

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

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // 数据字段 Key 进入路径
      const nameState = fieldStates.get('name');
      expect(nameState?.meta.widget).toBe('input');
      expect(nameState?.meta.type).toBe('string');

      // 嵌套对象：容器状态进入 fieldStates（containerOnly，不含值）
      const profileState = fieldStates.get('profile');
      expect(profileState?.meta.containerOnly).toBe(true);
      expect(profileState?.meta.type).toBe('object');
      expect(fieldStates.get('profile.age')?.meta.widget).toBe('number');

      // 数组字段 Key 进入路径
      expect(fieldStates.get('tags')?.meta.type).toBe('array');

      // 数据对象渲染为 object 容器节点
      const objectNode = renderTree.find((n) => n.type === 'object');
      expect(
        objectNode && 'dataPath' in objectNode && objectNode.dataPath,
      ).toBe('profile');
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

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // 布局节点 Key 不进入 formData 路径
      expect(fieldStates.has('card')).toBe(false);
      expect(fieldStates.has('grid')).toBe(false);

      // 布局节点下的数据字段 Key 进入路径
      expect(fieldStates.has('name')).toBe(true);
      expect(fieldStates.has('field1')).toBe(true);
      expect(fieldStates.has('field2')).toBe(true);

      // 布局节点类型进入渲染树
      const layoutTypes = renderTree
        .filter((n) => n.type !== 'field' && n.type !== 'object')
        .map((n) => n.type);
      expect(layoutTypes).toContain('card');
      expect(layoutTypes).toContain('grid');
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

      const { fieldStates } = SchemaParser.parse(schema);

      // 各层级布局节点 Key 全部被丢弃
      expect(fieldStates.has('container')).toBe(false);
      expect(fieldStates.has('container.tab1')).toBe(false);
      expect(fieldStates.has('container.tab1.nested')).toBe(false);

      // 数据字段 Key 正确进入路径
      expect(fieldStates.has('field')).toBe(true);
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
              },
            ],
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);

      // city 的 reactions 应正确解析 province 依赖
      const cityState = fieldStates.get('city');
      expect(cityState?.reactions).toBeDefined();
      expect(cityState?.reactions?.[0].dependencies).toContain('province');
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
                        dependencies: ['email'],
                        fulfill: { state: { visible: true } },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);

      // 相对路径 email → 解析为同作用域 user.email
      const phoneState = fieldStates.get('user.profile.phone');
      expect(phoneState?.reactions?.[0].dependencies).toContain('user.email');
    });

    it('多字段同时依赖同一字段', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          base: { type: 'string', widget: 'input' },
          fieldA: {
            type: 'string',
            widget: 'input',
            reactions: [{ dependencies: ['base'], fulfill: {} }],
          },
          fieldB: {
            type: 'string',
            widget: 'input',
            reactions: [{ dependencies: ['base'], fulfill: {} }],
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);

      expect(fieldStates.get('fieldA')?.reactions?.[0].dependencies).toContain(
        'base',
      );
      expect(fieldStates.get('fieldB')?.reactions?.[0].dependencies).toContain(
        'base',
      );
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

      const { fieldStates, dependencyGraph, validateExprFields } =
        SchemaParser.parse(schema);

      // validate 表达式转为带 _validateExpr 的规则
      const confirmState = fieldStates.get('confirm');
      const validateRule = confirmState?.meta.rules.find(
        (r) => r._validateExpr !== undefined,
      );
      expect(validateRule?._validateExpr).toContain('formData.password');

      // 依赖边进入依赖图：target=confirm，source=password
      expect(dependencyGraph.getDependents('password').has('confirm')).toBe(
        true,
      );
      expect(validateExprFields.has('confirm')).toBe(true);
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

      const { fieldStates, dependencyGraph } = SchemaParser.parse(schema);

      const cityState = fieldStates.get('address.city');
      expect(cityState?.meta.rules.some((r) => r._validateExpr)).toBe(true);
      // validate 表达式的 formData.xxx 依赖为根级绝对路径（不做作用域解析）
      expect(
        dependencyGraph.getDependents('province').has('address.city'),
      ).toBe(true);
    });

    it('数组项子字段进入 fieldStates 且带 itemOf 标记', () => {
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
              },
            },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema, {
        items: [{ name: 'a' }, { name: 'b' }],
      } as never);

      // items[0].name 进入 fieldStates（供校验/订阅），但带 itemOf 标记
      const itemState = fieldStates.get('items[0].name');
      expect(itemState).toBeDefined();
      expect(itemState?.meta.itemOf).toBe('items');
      expect(fieldStates.has('items[1].name')).toBe(true);
    });
  });

  describe('widget 可选（按 type/format 推断）', () => {
    it('省略 widget 时按 type/format 推断，meta.widget 始终为解析后的名称', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          // 基础类型推断
          name: { type: 'string' },
          age: { type: 'number' },
          count: { type: 'integer' },
          active: { type: 'boolean' },
          // format 推断
          birthday: { type: 'string', format: 'date' },
          content: { type: 'string', format: 'textarea' },
          // 数组缺省 'array'
          tags: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);

      expect(fieldStates.get('name')?.meta.widget).toBe('input');
      expect(fieldStates.get('age')?.meta.widget).toBe('number');
      expect(fieldStates.get('count')?.meta.widget).toBe('number');
      expect(fieldStates.get('active')?.meta.widget).toBe('switch');
      expect(fieldStates.get('birthday')?.meta.widget).toBe('date');
      expect(fieldStates.get('content')?.meta.widget).toBe('textarea');
      expect(fieldStates.get('tags')?.meta.widget).toBe('array');
    });

    it('显式声明 widget 优先于推断', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          hobby: { type: 'string', widget: 'select' },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      expect(fieldStates.get('hobby')?.meta.widget).toBe('select');
    });
  });

  describe('表达式标记内部字段', () => {
    it('validate 生成的规则携带 _validateExpr / _validateKey', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            widget: 'input',
            validate: {
              regex: '{{ $deps[0].match(/^\\S+@\\S+$/) }}',
            },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);

      const emailState = fieldStates.get('email');
      const rule = emailState?.meta.rules.find((r) => r._validateExpr);
      expect(rule).toBeDefined();
      expect(rule?._validateKey).toBe('regex');
      expect(rule?._validateExpr).toContain('$deps');
      expect(rule?.trigger).toBe('change');
    });
  });
});
