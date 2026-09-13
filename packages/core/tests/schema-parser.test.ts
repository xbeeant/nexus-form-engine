/**
 * SchemaParser 测试
 * 覆盖：
 * 1. 路径计算规则（数据节点 vs 布局节点）
 * 2. reactions 依赖作用域解析
 * 3. validate 表达式依赖提取
 * 4. 数组项子字段（itemOf 标记）
 */

import { describe, expect, it } from 'vitest';
import * as SchemaParser from '../src/schema-parser';
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

      // 布局节点 Key 不进入 formData 路径（合成 containerOnly 状态仅承载 UI 状态）
      expect(fieldStates.get('card')?.meta.containerOnly).toBe(true);
      expect(fieldStates.get('grid')?.meta.containerOnly).toBe(true);

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

    it('space 布局节点：Key 不进入 formData 路径（白名单扩展）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          space: {
            type: 'space',
            props: { direction: 'vertical', size: 'middle' },
            properties: {
              name: { type: 'string', widget: 'input' },
              email: { type: 'string', widget: 'input' },
            },
          },
        },
      };

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // space 属于布局容器白名单：Key 不进入 formData 路径，子字段进入根路径。
      // 布局容器自身有 containerOnly 合成状态（承载 hidden 订阅，跳过数据收集）。
      expect(fieldStates.get('space')?.meta.containerOnly).toBe(true);
      expect(fieldStates.has('name')).toBe(true);
      expect(fieldStates.has('email')).toBe(true);

      const layoutTypes = renderTree
        .filter((n) => n.type !== 'field' && n.type !== 'object')
        .map((n) => n.type);
      expect(layoutTypes).toContain('space');
    });

    it('passThrough 布局节点：Key 不进入 formData 路径（白名单扩展）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          pt: {
            type: 'passThrough',
            properties: {
              name: { type: 'string', widget: 'input' },
            },
          },
        },
      };

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // passThrough 属于布局容器白名单：Key 不进入 formData 路径，子字段进入根路径
      expect(fieldStates.get('pt')?.meta.containerOnly).toBe(true);
      expect(fieldStates.has('name')).toBe(true);

      const layoutTypes = renderTree
        .filter((n) => n.type !== 'field' && n.type !== 'object')
        .map((n) => n.type);
      expect(layoutTypes).toContain('passThrough');
    });

    it('空串 widget 的 object 视为数据对象容器（子表单特例仅限非空 widget）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            widget: '',
            properties: {
              name: { type: 'string', widget: 'input' },
            },
          },
        },
      };

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // widget: '' 视为「未指定」：object 走数据对象容器，容器 Key 进入路径（有值）
      const rt = renderTree.find((n) => n.dataPath === 'profile');
      expect(rt?.type).toBe('object');
      expect(fieldStates.get('profile')?.meta.containerOnly).toBe(true);
      expect(fieldStates.get('profile')?.meta.widget).toBe('');

      // 非空 widget 的 object 仍为子表单字段（回归保护）
      const { renderTree: rt2 } = SchemaParser.parse({
        type: 'object',
        properties: {
          subForm: {
            type: 'object',
            widget: 'card',
            properties: { name: { type: 'string', widget: 'input' } },
          },
        },
      } as NexusSchema);
      expect(rt2.find((n) => n.dataPath === 'subForm')?.type).toBe('field');
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

      // 各层级布局节点 Key 不进入数据路径 —— 各自挂 containerOnly 合成状态（hidden 订阅）。
      // 布局 Key 在路径计算中被丢弃，因此嵌套布局的合成状态路径保持扁平（仅取布局自身 Key）。
      expect(fieldStates.get('container')?.meta.containerOnly).toBe(true);
      expect(fieldStates.get('tab1')?.meta.containerOnly).toBe(true);
      expect(fieldStates.get('nested')?.meta.containerOnly).toBe(true);

      // 数据字段 Key 正确进入路径（所有布局 Key 被透传丢弃）
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
                fulfill: { state: { hidden: false } },
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
                        fulfill: { state: { hidden: false } },
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

  describe('顶层 format 显示格式兼容（x-render）', () => {
    it('date 字段顶层 format 并入 props 供控件消费', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          birthday: {
            type: 'string',
            widget: 'date',
            format: 'YYYY/MM/DD',
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      const state = fieldStates.get('birthday');
      expect(state?.meta.format).toBe('YYYY/MM/DD');
      expect(state?.props.format).toBe('YYYY/MM/DD');
    });

    it('props 内显式 format 优先于顶层', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          birthday: {
            type: 'string',
            widget: 'date',
            format: 'YYYY/MM/DD',
            props: { format: 'YYYY年MM月DD日' },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      expect(fieldStates.get('birthday')?.props.format).toBe('YYYY年MM月DD日');
    });

    it('校验语义 format（email/url）不并入 props', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          email: { type: 'string', widget: 'input', format: 'email' },
          home: { type: 'string', widget: 'input', format: 'url' },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      expect(fieldStates.get('email')?.props.format).toBeUndefined();
      expect(fieldStates.get('home')?.props.format).toBeUndefined();
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

  describe('统一 FieldState.meta 构建（buildFieldMeta）', () => {
    it('数据字段 meta：公共元数据键齐全，label 默认 true', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            widget: 'input',
            title: '姓名',
            description: 'desc',
            placeholder: '请输入',
            tooltip: '提示',
            readOnlyWidget: 'text',
            sideEffects: { editor: 'html', title: '编辑' },
            hooks: { onChange: () => undefined },
            bind: 'user.name',
            width: '50%',
            colSpan: 12,
            extra: '额外说明',
            displayType: 'inline',
            labelWidth: 80,
            column: 2,
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      const meta = fieldStates.get('name')!.meta;

      expect(meta.widget).toBe('input');
      expect(meta.type).toBe('string');
      expect(meta.title).toBe('姓名');
      expect(meta.description).toBe('desc');
      expect(meta.placeholder).toBe('请输入');
      expect(meta.tooltip).toBe('提示');
      expect(meta.readOnlyWidget).toBe('text');
      expect(meta.sideEffects).toEqual({ editor: 'html', title: '编辑' });
      expect(meta.hooks).toBeDefined();
      expect(meta.bind).toBe('user.name');
      expect(meta.extra).toBe('额外说明');
      expect(meta.width).toBe('50%');
      expect(meta.colSpan).toBe(12);
      expect(meta.displayType).toBe('inline');
      expect(meta.labelWidth).toBe(80);
      expect(meta.column).toBe(2);
      // 未声明 label 默认 true（字段级覆盖表单级）
      expect(meta.label).toBe(true);
      // 容器类标记不出现
      expect(meta.containerOnly).toBeUndefined();
      expect(meta.itemOf).toBeUndefined();
    });

    it('数据数组 meta：bind / items / label 一并映射（修复 bind 丢失）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          list: {
            type: 'array',
            widget: 'list',
            title: '列表',
            bind: 'payload.items',
            items: { type: 'string' },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      const meta = fieldStates.get('list')!.meta;

      expect(meta.type).toBe('array');
      expect(meta.widget).toBe('list');
      expect(meta.bind).toBe('payload.items');
      expect(meta.items).toBeDefined();
      expect(meta.label).toBe(true);
    });

    it('数据对象容器 meta：containerOnly + type object，公共键保留', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            title: '资料',
            description: 'desc',
            width: '50%',
            order: 2,
            colSpan: 12,
            properties: {
              age: { type: 'number', widget: 'number' },
            },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      const meta = fieldStates.get('profile')!.meta;

      expect(meta.containerOnly).toBe(true);
      expect(meta.widget).toBe('');
      expect(meta.type).toBe('object');
      expect(meta.rules).toEqual([]);
      expect(meta.title).toBe('资料');
      expect(meta.description).toBe('desc');
      expect(meta.width).toBe('50%');
      expect(meta.order).toBe(2);
      expect(meta.colSpan).toBe(12);
    });

    it('数组项子字段 meta：保留布局键并携带 itemOf', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            widget: 'list',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  widget: 'input',
                  width: '50%',
                  colSpan: 12,
                  label: false,
                },
              },
            },
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema, {
        items: [{ name: 'a' }],
      } as never);
      const itemState = fieldStates.get('items[0].name');
      const meta = itemState!.meta;

      expect(meta.itemOf).toBe('items');
      expect(meta.widget).toBe('input');
      expect(meta.width).toBe('50%');
      expect(meta.colSpan).toBe(12);
      expect(meta.label).toBe(false);
    });

    it('分支容器 meta：type 固定 object（不透传 oneOf trait）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payment: {
            type: 'anyOf',
            title: '支付方式',
            oneOf: [
              {
                title: 'credit',
                properties: {
                  cardNo: { type: 'string', widget: 'input' },
                },
              },
              {
                title: 'cash',
                properties: {
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
          },
        },
      } as unknown as NexusSchema;

      const { fieldStates } = SchemaParser.parse(schema);
      const container = fieldStates.get('payment');

      expect(container?.meta.containerOnly).toBe(true);
      expect(container?.meta.type).toBe('object');
      expect(container?.meta.widget).toBe('');
      expect(container?.meta.title).toBe('支付方式');
      expect(container?.meta.oneOf?.activeIndex).toBe(0);
      expect(container?.meta.oneOf?.branches).toHaveLength(2);
    });
  });
});
