// ============================================================================
// html-doc — HTML 富文本展示组件文档
// ============================================================================

import type { WidgetDoc } from '../types';

export const htmlDoc: WidgetDoc = {
  id: 'html',
  group: '基础输入',
  title: 'HTML 展示',
  english: 'HTML',
  description:
    '将字段值按 HTML 渲染为富文本内容（仅展示，不提供编辑器）。常用于协议说明、富文本静态内容与表单说明区。',
  demos: [
    {
      title: '静态富文本',
      description:
        'default 提供初始 HTML 内容，字段值即渲染内容；bind: false 声明该字段纯展示、不参与提交数据。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          notice: {
            type: 'string',
            widget: 'html',
            title: '服务条款',
            bind: false,
            default:
              '<h4 style="margin:0 0 8px">📌 服务说明</h4><p>本表单由 <b>@nexus/form-engine</b> 驱动，<span style="color:#1677ff">Schema 即表单</span>。</p><ul><li>字段校验实时反馈</li><li>联动规则声明式配置</li><li>布局与数据路径解耦</li></ul>',
          },
        },
      },
    },
    {
      title: '动态内容',
      description:
        'html 字段的值也可以由 reactions 联动计算产生（如根据选项生成提示文案）。',
      schema: {
        type: 'object',
        displayType: 'row',
        properties: {
          plan: {
            type: 'string',
            widget: 'radio',
            title: '订阅方案',
            enum: ['free', 'pro', 'enterprise'],
            enumNames: ['免费版', '专业版', '企业版'],
          },
          planTip: {
            type: 'string',
            widget: 'html',
            title: '方案说明',
            reactions: [
              {
                dependencies: ['plan'],
                fulfill: {
                  state: {
                    value:
                      '{{ $deps[0] === "pro" ? "<b style=\\"color:#1677ff\\">专业版：</b>解锁全部表单组件" : $deps[0] === "enterprise" ? "<b style=\\"color:#722ed1\\">企业版：</b>专属支持与私有化部署" : "免费版：基础组件可用" }}',
                  },
                },
              },
            ],
          },
        },
      },
    },
  ],
};
