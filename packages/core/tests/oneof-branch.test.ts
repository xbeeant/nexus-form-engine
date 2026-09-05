/**
 * P1-1 条件分支容器（oneOf / anyOf）测试
 *
 * 覆盖：
 * 1. 分支容器 Key 不进入 formData 数据路径（布局透明）
 * 2. 活动分支字段收集数据；非活动分支字段不收集
 * 3. 渲染树 RenderBranchNode：branches 按分支分组，非活动分支字段 visible=false
 * 4. anyOf 条件分支：源字段变化 → 自动切换激活分支（DependencyGraph _oneOfBranch 边）
 * 5. oneOf 手动切换：setOneOfActiveIndex 翻转可见性与值保留/清除
 * 6. 跨分支共享键：保留值；离开分支字段：清除值
 * 7. meta.oneOf.fieldBranches 字段→分支成员关系正确聚合
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import * as SchemaParser from '../src/schema-parser';
import type { NexusSchema } from '../src/types/schema';

describe('P1-1 条件分支容器 (oneOf / anyOf)', () => {
  describe('解析阶段', () => {
    it('分支容器 Key 不进入数据路径，各分支字段在父路径直接收集', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payment: {
            type: 'object',
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
      };

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // 分支容器路径：字段状态存在（containerOnly + meta.oneOf），值为 undefined
      const container = fieldStates.get('payment');
      expect(container?.meta.containerOnly).toBe(true);
      expect(container?.meta.oneOf?.activeIndex).toBe(0);
      expect(container?.meta.oneOf?.branches).toHaveLength(2);

      // 分支内字段直接拼接到父路径（payment 不进入路径）
      expect(fieldStates.get('cardNo')).toBeDefined();
      expect(fieldStates.get('cashAmount')).toBeDefined();
      expect(fieldStates.get('payment.cardNo')).toBeUndefined();

      // 渲染树：branch 节点，children 按分支分组
      const branchNode = renderTree.find((n) => n.type === 'branch');
      expect(branchNode).toBeDefined();
      const b = branchNode as { branches: unknown[][] };
      expect(b.branches).toHaveLength(2);
      expect(b.branches[0]).toHaveLength(1);
      expect(b.branches[1]).toHaveLength(1);
    });

    it('非活动分支字段 visible=false，活动分支字段 visible=true', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payment: {
            type: 'object',
            activeIndex: 1, // 初始激活第二个分支
            oneOf: [
              {
                properties: {
                  cardNo: { type: 'string', widget: 'input' },
                },
              },
              {
                properties: {
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);

      // 活动分支（cashAmount）可见
      expect(fieldStates.get('cashAmount')?.visible).toBe(true);
      // 非活动分支（cardNo）隐藏
      expect(fieldStates.get('cardNo')?.visible).toBe(false);
    });

    it('meta.oneOf.fieldBranches 正确聚合字段→分支成员关系（跨分支同名键合并）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          choice: {
            oneOf: [
              {
                properties: {
                  name: { type: 'string', widget: 'input' },
                  aOnly: { type: 'string', widget: 'input' },
                },
              },
              {
                properties: {
                  name: { type: 'string', widget: 'input' }, // 与分支0共享
                  bOnly: { type: 'string', widget: 'input' },
                },
              },
            ],
          },
        },
      };

      const { fieldStates } = SchemaParser.parse(schema);
      const container = fieldStates.get('choice');
      const fieldBranches = container?.meta.oneOf?.fieldBranches;

      expect(fieldBranches).toBeDefined();
      // 共享键 name 属于两个分支
      expect(fieldBranches!['name']).toEqual([0, 1]);
      // 独有键只属于对应分支
      expect(fieldBranches!['aOnly']).toEqual([0]);
      expect(fieldBranches!['bOnly']).toEqual([1]);
    });

    it('支持 branches 字段直接挂分支（非 oneOf/anyOf 键形态）', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payment: {
            type: 'object',
            branches: [
              { properties: { cardNo: { type: 'string', widget: 'input' } } },
              {
                properties: {
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
            activeIndex: 1,
          },
        },
      };

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // branches 形态同样识别为分支容器
      const container = fieldStates.get('payment');
      expect(container?.meta.oneOf?.activeIndex).toBe(1);
      expect(container?.meta.oneOf?.fieldBranches).toEqual({
        cardNo: [0],
        cashAmount: [1],
      });
      // 活动分支字段可见
      expect(fieldStates.get('cashAmount')?.visible).toBe(true);
      expect(fieldStates.get('cardNo')?.visible).toBe(false);
      expect(renderTree.some((n) => n.type === 'branch')).toBe(true);
    });

    it('engine 提供 setOneOfActiveIndex / getOneOfActiveIndex 公开 API', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          choice: {
            oneOf: [
              { properties: { a: { type: 'string', widget: 'input' } } },
              { properties: { b: { type: 'string', widget: 'input' } } },
            ],
          },
        },
      };
      engine.init(schema);
      expect(engine.getOneOfActiveIndex('choice')).toBe(0);
      expect(engine.setOneOfActiveIndex('choice', 1)).toBe(true);
      expect(engine.getOneOfActiveIndex('choice')).toBe(1);
      // 越界索引钳制
      expect(engine.setOneOfActiveIndex('choice', 99)).toBe(true);
      expect(engine.getOneOfActiveIndex('choice')).toBe(1);
      // 不存在容器
      expect(engine.setOneOfActiveIndex('nope', 0)).toBe(false);
      expect(engine.getOneOfActiveIndex('nope')).toBeUndefined();
    });
  });

  describe('formData 收集', () => {
    it('仅活动分支字段进入 formData（分支容器 Key 不进入）', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payment: {
            oneOf: [
              {
                properties: {
                  payMethod: { type: 'string', widget: 'select' },
                  cardNo: { type: 'string', widget: 'input' },
                },
              },
              {
                properties: {
                  payMethod: { type: 'string', widget: 'select' },
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
          },
        },
      };

      engine.init(schema);
      engine.setFieldValue('payMethod', 'card');
      engine.setFieldValue('cardNo', '4111');
      // 非活动分支字段写入值但不可见，不影响 formData
      engine.setFieldValue('cashAmount', 999);

      const data = engine.getFormData();
      // payment 不是 formData 的键
      expect('payment' in data).toBe(false);
      // 活动分支字段收集
      expect(data.payMethod).toBe('card');
      expect(data.cardNo).toBe('4111');
      // 隐藏字段不收集（cashAmount 属非活动分支 → 隐藏 → getHiddenValues）
      expect('cashAmount' in data).toBe(false);
    });
  });

  describe('anyOf 条件分支自动切换', () => {
    it('源字段变化触发容器 _oneOfBranch reaction，依据 conditions 切换激活分支', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payType: { type: 'string', widget: 'select' },
          payment: {
            type: 'object',
            dependencies: ['payType'],
            conditions: {
              0: "{{ formData.payType === 'card' }}",
              1: "{{ formData.payType === 'cash' }}",
            },
            anyOf: [
              {
                properties: {
                  cardNo: { type: 'string', widget: 'input' },
                  creditLimit: { type: 'number', widget: 'number' },
                },
              },
              {
                properties: {
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
          },
        },
      };

      engine.init(schema);
      // 初始：无 payType 值 → 条件0不满足（formData.payType undefined ≠ 'card'）→ 回落当前 activeIndex=0
      expect(engine.getOneOfActiveIndex('payment')).toBe(0);
      expect(engine.getFieldState('cardNo')!.visible).toBe(true);
      expect(engine.getFieldState('cashAmount')!.visible).toBe(false);

      // 源字段值满足分支1条件 → 自动切换
      engine.setFieldValue('payType', 'cash');
      expect(engine.getOneOfActiveIndex('payment')).toBe(1);
      expect(engine.getFieldState('cashAmount')!.visible).toBe(true);
      expect(engine.getFieldState('cardNo')!.visible).toBe(false);
      expect(engine.getFieldState('creditLimit')!.visible).toBe(false);

      // 切回分支0（共享字段 payMethod 同理可验，这里验证独占字段回流）
      engine.setFieldValue('payType', 'card');
      expect(engine.getOneOfActiveIndex('payment')).toBe(0);
      expect(engine.getFieldState('cardNo')!.visible).toBe(true);
      expect(engine.getFieldState('cashAmount')!.visible).toBe(false);
    });

    it('切走分支时独占字段值清除，切回时还原（数据合法性对齐）', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payType: { type: 'string', widget: 'select' },
          payment: {
            dependencies: ['payType'],
            conditions: {
              0: "{{ formData.payType === 'card' }}",
              1: "{{ formData.payType === 'cash' }}",
            },
            anyOf: [
              { properties: { cardNo: { type: 'string', widget: 'input' } } },
              {
                properties: {
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
          },
        },
      };

      engine.init(schema);
      // 活动分支0：cardNo 赋值
      engine.setFieldValue('cardNo', '4111-0000');
      expect(engine.getFieldValue('cardNo')).toBe('4111-0000');

      // 切到分支1：cardNo 离开分支 → 值清除（还原初始值）
      engine.setFieldValue('payType', 'cash');
      expect(engine.getFieldValue('cardNo')).toBe('');
      expect(engine.getFieldState('cardNo')!.dirty).toBe(false);

      // 切回分支0：cardNo 重新可见，值已还原为空
      engine.setFieldValue('payType', 'card');
      expect(engine.getFieldState('cardNo')!.visible).toBe(true);
      expect(engine.getFieldValue('cardNo')).toBe('');
    });

    it('跨分支共享键保留值（不因分支切换清除）', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          payType: { type: 'string', widget: 'select' },
          payment: {
            dependencies: ['payType'],
            conditions: {
              0: "{{ formData.payType === 'card' }}",
              1: "{{ formData.payType === 'cash' }}",
            },
            anyOf: [
              {
                properties: {
                  payMethod: { type: 'string', widget: 'select' },
                  cardNo: { type: 'string', widget: 'input' },
                },
              },
              {
                properties: {
                  payMethod: { type: 'string', widget: 'select' },
                  cashAmount: { type: 'number', widget: 'number' },
                },
              },
            ],
          },
        },
      };

      engine.init(schema);
      engine.setFieldValue('payMethod', 'alipay');
      engine.setFieldValue('cardNo', '4111');

      // 切到分支1：payMethod 是共享键 → 保留；cardNo 是分支0独占 → 清除
      engine.setFieldValue('payType', 'cash');
      expect(engine.getFieldValue('payMethod')).toBe('alipay');
      expect(engine.getFieldValue('cardNo')).toBe('');
      expect(engine.getFieldState('cashAmount')!.visible).toBe(true);
    });
  });

  describe('oneOf 手动切换（setOneOfActiveIndex）', () => {
    it('切换时可见性翻转、独占值清除、共享值保留', () => {
      const engine = new NexusEngine();
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          choice: {
            oneOf: [
              {
                properties: {
                  name: { type: 'string', widget: 'input' },
                  aOnly: { type: 'string', widget: 'input' },
                },
              },
              {
                properties: {
                  name: { type: 'string', widget: 'input' },
                  bOnly: { type: 'string', widget: 'input' },
                },
              },
            ],
          },
        },
      };

      engine.init(schema);
      engine.setFieldValue('name', 'shared');
      engine.setFieldValue('aOnly', 'a-val');

      // 切到分支1
      engine.setOneOfActiveIndex('choice', 1);
      expect(engine.getOneOfActiveIndex('choice')).toBe(1);

      // 共享键保留
      expect(engine.getFieldValue('name')).toBe('shared');
      expect(engine.getFieldState('name')!.visible).toBe(true);
      // 独占键 aOnly 离开 → 隐藏 + 值清除
      expect(engine.getFieldState('aOnly')!.visible).toBe(false);
      expect(engine.getFieldValue('aOnly')).toBe('');
      // 新分支字段 bOnly 可见
      expect(engine.getFieldState('bOnly')!.visible).toBe(true);
    });
  });

  describe('嵌套分支（分支内嵌套布局/字段）', () => {
    it('分支内布局节点字段正确标记 branchOf 并随分支显隐', () => {
      const schema: NexusSchema = {
        type: 'object',
        properties: {
          choice: {
            oneOf: [
              {
                properties: {
                  wrap: {
                    type: 'card',
                    properties: {
                      inner: { type: 'string', widget: 'input' },
                    },
                  },
                },
              },
              {
                properties: {
                  other: { type: 'string', widget: 'input' },
                },
              },
            ],
          },
        },
      };

      const { fieldStates, renderTree } = SchemaParser.parse(schema);

      // 分支内布局容器内的字段被正确收集（wrap Key 被丢弃，inner 直接进父路径）
      expect(fieldStates.get('inner')).toBeDefined();
      expect(fieldStates.get('wrap')).toBeUndefined();
      expect(fieldStates.get('wrap.inner')).toBeUndefined();
      // 标记所属分支
      expect(fieldStates.get('inner')?.meta.branchOf).toBe(0);
      expect(fieldStates.get('other')?.meta.branchOf).toBe(1);
      // 渲染树分支分组包含布局节点
      const b = renderTree.find((n) => n.type === 'branch') as {
        branches: unknown[][];
      };
      expect(b.branches[0]).toHaveLength(1);

      // 引擎切换分支时，布局内字段也随 active 状态翻转
      const engine = new NexusEngine();
      engine.init(schema);
      engine.setOneOfActiveIndex('choice', 1);
      expect(engine.getFieldState('inner')!.visible).toBe(false);
      expect(engine.getFieldState('other')!.visible).toBe(true);
    });
  });
});
