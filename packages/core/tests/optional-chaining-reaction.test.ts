/**
 * 回归：可选链 `?.` 形式表达式 + 显式 dependencies 必须正确触发联动
 *
 * 历史 bug：
 *   `extractDepsFromExpression` 在剥离方法名（如 .includes）时只去掉
 *   末尾的 `?`，路径中间的 `?.` 残留，依赖图 key 与 setFieldValue
 *   真实路径（始终是无 `?` 形式）对不上，导致 reaction 永远不被触发。
 *
 * 该测试直接复现用户现场 schema 片段，验证端到端联动能跑通。
 */

import { describe, expect, it } from 'vitest';
import { NexusEngine } from '../src/engine';
import type { NexusSchema } from '../src/types/schema';

describe('可选链 `?.` 路径归一化 - 端到端联动回归', () => {
  it('表达式 formData?.a?.b?.includes("x") + 显式 dependencies 含 `?.` 都能触发下游 reaction', () => {
    // 子对象 demand_definition 上挂两个字段：
    //  - requirement_definition_v2：单选下拉，值是字符串（'完成需求定义' 等）
    //  - experience_description：required 受前者的影响
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        demand_definition: {
          type: 'object',
          properties: {
            requirement_definition_v2: {
              type: 'string',
              widget: 'select',
              default: '',
            },
            experience_description: {
              type: 'string',
              widget: 'textarea',
              // ⚠️ 关键：表达式含 `?.includes('xxx')`
              required:
                "{{formData?.demand_definition?.requirement_definition_v2?.includes('完成需求定义')}}",
              // ⚠️ 关键：dependencies 也带 `?.`（用户笔误/手写残留）
              reactions: [
                {
                  dependencies: [
                    'demand_definition?.requirement_definition_v2',
                  ],
                  fulfill: {
                    state: {
                      required:
                        "{{formData?.demand_definition?.requirement_definition_v2?.includes('完成需求定义')}}",
                    },
                  },
                  _autoExpr: true,
                },
              ],
            },
          },
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema);

    const descPath = 'demand_definition.experience_description';
    const descState = () => engine.getFieldState(descPath);

    // 初始：值为 ''，includes 返回 false → required 应为 false
    expect(descState()?.required).toBe(false);

    // 选 '完成需求定义' → 联动应触发，required 应为 true
    engine.setFieldValue(
      'demand_definition.requirement_definition_v2',
      '完成需求定义',
    );
    expect(descState()?.required).toBe(true);

    // 切到其他值 → required 应回到 false
    engine.setFieldValue(
      'demand_definition.requirement_definition_v2',
      '仅作记录',
    );
    expect(descState()?.required).toBe(false);

    // 再次选回 → required 应再次为 true
    engine.setFieldValue(
      'demand_definition.requirement_definition_v2',
      '完成需求定义',
    );
    expect(descState()?.required).toBe(true);
  });

  it('单段可选链 + Unicode 字符串字面量的 includes 也能正确触发', () => {
    const schema: NexusSchema = {
      type: 'object',
      properties: {
        implType: { type: 'string', widget: 'input' },
        remark: {
          type: 'string',
          widget: 'input',
          required: "{{formData?.implType?.includes('关联附件')}}",
        },
      },
    };

    const engine = new NexusEngine();
    engine.init(schema);

    expect(engine.getFieldState('remark')?.required).toBe(false);

    engine.setFieldValue('implType', '普通');
    expect(engine.getFieldState('remark')?.required).toBe(false);

    engine.setFieldValue('implType', '关联附件');
    expect(engine.getFieldState('remark')?.required).toBe(true);
  });

  it('依赖图反向边 key 已 normalize：getDependents 用真实路径也能查得', () => {
    // 即便调用方绕过 Parser 直接 addDependency 写入 `a?.b`，
    // 也能用 `a.b` 查到 dependents（依赖图入口 normalize 兜底）。
    // 这里走 Engine 内部的真实路径，覆盖 Parser→Engine 链路。
    const engine = new NexusEngine();
    engine.init({
      type: 'object',
      properties: {
        a: { type: 'string', widget: 'input' },
        b: {
          type: 'string',
          widget: 'input',
          hidden: "{{formData?.a === 'hide'}}",
        },
      },
    });

    expect(engine.getFieldState('b')?.hidden).toBe(false);
    engine.setFieldValue('a', 'hide');
    expect(engine.getFieldState('b')?.hidden).toBe(true);
  });
});
