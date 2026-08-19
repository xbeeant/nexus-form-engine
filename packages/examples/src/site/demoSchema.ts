// ============================================================================
// 站点共享的演示数据：Schema、外部字段、自定义 catalog
// 供「使用示例」与「设计器」两个页面复用
// 属性描述符（propertySchemaMap）与 UI 注册由 Designer 内置默认提供
// （@xbeeant/form-engine-ui 的 widgetSchemas / registerAntdUI），无需此处组装
// ============================================================================

import type { NexusSchema } from '@xbeeant/form-engine';
import type { CatalogItem, FieldDef } from '@xbeeant/form-engine-designer';

// ============================================================================
// 外部字段列表示例：传入 Designer 后左侧 palette 多一个「字段列表」分组
// ============================================================================
export const externalFields: FieldDef[] = [
  { id: 'order_no', name: '订单编号', widget: 'input' },
  { id: 'amount', name: '金额', widget: 'number' },
  { id: 'status', name: '订单状态', widget: 'select' },
  { id: 'created_at', name: '创建时间', widget: 'date' },
  { id: 'remark', name: '备注', widget: 'textarea' },
];

// ============================================================================
// 自定义 widget catalog 示例：扩展内置 catalog
// ============================================================================
export const customWidgetCatalog: CatalogItem[] = [
  {
    label: '富文本',
    icon: '✍️',
    category: 'widget',
    widget: 'richText',
    createNode: () => ({
      type: 'string',
      widget: 'richText',
      title: '富文本',
    }),
  },
  {
    label: '评分',
    icon: '⭐',
    category: 'widget',
    widget: 'rate',
    createNode: () => ({ type: 'number', widget: 'rate', title: '评分' }),
  },
];

// ============================================================================
// 演示 Schema：新品发布（商品上架）
// 场景贴近真实运营流程，同时覆盖全部默认 widget 与布局：
// - widget：input/password/textarea/select/radio/checkbox/switch/rate/slider/
//   number/date/time/dateRange/timeRange/color/urlInput/treeSelect/cascader/
//   autoComplete/multiSelect/checkboxes/mentions/segmented/transfer/image/file/
//   html/list/simpleList/tableList
// - layout：card/grid/tabs/collapse/steps/flex/divider/space/void
// - 特性：数据对象、reactions 联动（visible/required + 计算字段）、字段级校验
//   （min/max/pattern）、hidden、readOnly、removeHiddenData
// ============================================================================

const categoryTree = JSON.stringify([
  {
    value: 'digital',
    title: '数码家电',
    children: [
      { value: 'phone', title: '手机通讯' },
      { value: 'computer', title: '电脑办公' },
      {
        value: 'audio',
        title: '影音娱乐',
        children: [
          { value: 'headphone', title: '耳机' },
          { value: 'speaker', title: '音箱' },
        ],
      },
    ],
  },
  {
    value: 'fashion',
    title: '服饰鞋包',
    children: [
      { value: 'clothes', title: '男装' },
      { value: 'shoes', title: '女鞋' },
    ],
  },
  {
    value: 'food',
    title: '食品生鲜',
    children: [{ value: 'snack', title: '休闲零食' }],
  },
]);

const regionTree = JSON.stringify([
  {
    value: 'zhejiang',
    label: '浙江',
    children: [
      { value: 'hangzhou', label: '杭州' },
      { value: 'ningbo', label: '宁波' },
    ],
  },
  {
    value: 'jiangsu',
    label: '江苏',
    children: [
      { value: 'nanjing', label: '南京' },
      { value: 'suzhou', label: '苏州' },
    ],
  },
  {
    value: 'guangdong',
    label: '广东',
    children: [
      { value: 'guangzhou', label: '广州' },
      { value: 'shenzhen', label: '深圳' },
    ],
  },
]);

const permissionItems = JSON.stringify([
  { key: 'p1', title: '商品编辑' },
  { key: 'p2', title: '库存管理' },
  { key: 'p3', title: '价格维护' },
  { key: 'p4', title: '营销活动' },
  { key: 'p5', title: '数据分析' },
  { key: 'p6', title: '退款处理' },
]);

export const demoSchema: NexusSchema = {
  type: 'object',
  displayType: 'row',
  labelWidth: 110,
  colon: true,
  properties: {
    // ── 基本信息（card 布局）──────────────────────────────────────────────
    basic: {
      widget: '',
      type: 'card',
      title: '基本信息（card 布局）',
      properties: {
        name: {
          type: 'string',
          widget: 'input',
          title: '商品名称',
          required: true,
          placeholder: '30 字以内的商品标题',
          description:
            'P0 字段级约束：min/max/pattern 自动转校验规则；registerValidator 演示：含 "测试" 或 "admin" 报错',
          min: 2,
          max: 30,
        },
        brand: {
          type: 'string',
          widget: 'autoComplete',
          title: '品牌',
          placeholder: '输入后自动补全',
          description: 'autoComplete：枚举数据自动补全',
          enum: ['Nexus 科技', 'Bee 数码', 'Xbee 智能', 'Ant 优选'],
          props: { allowClear: true },
        },
        category: {
          type: 'string',
          widget: 'treeSelect',
          title: '商品类目',
          required: true,
          placeholder: '选择到最末级类目',
          description: 'treeSelect：树形层级选择',
          props: { treeData: categoryTree, treeDefaultExpandAll: true },
        },
        region: {
          type: 'array',
          widget: 'cascader',
          title: '发货地区',
          required: true,
          placeholder: '选择省 / 市',
          description: 'cascader：级联选择',
          props: { cascaderData: regionTree, allowClear: true },
        },
        currency: {
          type: 'string',
          widget: 'select',
          title: '结算币种',
          enum: ['CNY', 'USD', 'EUR'],
          enumNames: ['人民币', '美元', '欧元'],
          props: { allowClear: true },
        },
        tags: {
          type: 'array',
          widget: 'multiSelect',
          title: '商品标签',
          placeholder: '可多选',
          description: 'multiSelect：多选下拉',
          enum: ['新品', '热卖', '限量', '包邮', '预售', '会员专享'],
          props: { mode: 'multiple', maxTagCount: 3 },
        },
        features: {
          type: 'array',
          widget: 'checkboxes',
          title: '特色卖点',
          description: 'checkboxes：复选框组',
          enum: ['7 天无理由', '正品保障', '极速发货', '官方质保', '免费安装'],
        },
        slogan: {
          type: 'string',
          widget: 'mentions',
          title: '营销卖点',
          placeholder: '输入 @ 提及运营同学',
          description: 'mentions：提及（@ 团队成员）',
          enum: ['运营一姐', '增长同学', '商品小二', '直播达人'],
        },
        description: {
          type: 'string',
          widget: 'textarea',
          title: '商品描述',
          placeholder: '一句话卖点 + 详细说明',
          extra: '将展示在商品详情页头部',
          colSpan: 2,
        },
        detail: {
          type: 'string',
          widget: 'html',
          title: '详情页公告',
          bind: false,
          description: 'html：只读富文本渲染（bind:false 不参与数据收集）',
          default:
            '<h4 style="margin:0 0 8px">📌 发货说明</h4><p>付款后 <b>24 小时</b>内发货，<span style="color:#1677ff">偏远地区 48 小时</span>。</p><ul><li>支持 7 天无理由退换</li><li>官方质保一年</li></ul>',
        },
      },
    },

    // ── 价格与库存（grid 布局 + 计算字段）───────────────────────────────
    priceGrid: {
      widget: '',
      type: 'grid',
      column: 2,
      properties: {
        price: {
          type: 'number',
          widget: 'number',
          title: '售价',
          required: true,
          placeholder: '0.00',
          description:
            'registerValidator 演示：需在 0-100000 之间，且不得高于市场价',
          min: 0,
          max: 100000,
        },
        marketPrice: {
          type: 'number',
          widget: 'number',
          title: '市场价',
          placeholder: '0.00',
        },
        discount: {
          type: 'number',
          widget: 'slider',
          title: '折扣（%）',
          default: 100,
          description: 'slider：滑块选择，联动下方计算字段',
          props: { min: 1, max: 100, step: 1, tooltip: true },
        },
        salePrice: {
          type: 'number',
          widget: 'number',
          title: '折后价（计算字段）',
          readOnly: true,
          description:
            'reactions fulfill.state.value = 售价 × 折扣，自动重算并传播',
          reactions: [
            {
              dependencies: ['price', 'discount'],
              fulfill: { state: { value: '{{ Math.round($deps[0] * $deps[1]) / 100 }}' } },
            },
          ],
        },
        stock: {
          type: 'number',
          widget: 'slider',
          title: '库存',
          default: 100,
          description: 'slider：区间/数值滑块',
          props: { min: 0, max: 1000, step: 10, tooltip: true },
        },
        safeStock: {
          type: 'number',
          widget: 'number',
          title: '库存预警值',
          default: 50,
          placeholder: '低于此值提醒补货',
        },
        status: {
          type: 'string',
          widget: 'radio',
          title: '上架状态',
          enum: ['draft', 'on_sale', 'off_sale'],
          enumNames: ['草稿', '立即上架', '手动下架'],
        },
        channel: {
          type: 'string',
          widget: 'segmented',
          title: '发布渠道',
          description: 'segmented：分段控制器',
          enum: ['pc', 'app', 'mini'],
          enumNames: ['PC 端', 'App', '小程序'],
        },
        themeColor: {
          type: 'string',
          widget: 'color',
          title: '主题色',
          default: '#1677ff',
          description: 'color：颜色选择器',
          props: { showText: true, allowClear: true },
        },
        score: {
          type: 'number',
          widget: 'rate',
          title: '初始评分',
          default: 4,
          description: 'rate：评分',
          props: { count: 5, allowClear: true },
        },
        productUrl: {
          type: 'string',
          widget: 'urlInput',
          title: '商品链接',
          placeholder: 'https://example.com/item/1',
          description: 'urlInput：URL 输入（内置格式校验）',
          validate: { format: 'url' },
        },
        recommend: {
          type: 'boolean',
          widget: 'switch',
          title: '推荐位',
        },
        notify: {
          type: 'boolean',
          widget: 'checkbox',
          title: '到货短信通知',
        },
        agree: {
          type: 'boolean',
          widget: 'checkbox',
          title: '同意《商品发布规范》',
          required: true,
          description: 'checkbox：单选框（布尔）',
        },
      },
    },

    // ── 媒体与账号（tabs 布局 + 数据对象）───────────────────────────────
    media: {
      widget: '',
      type: 'tabs',
      properties: {
        mediaPane: {
          widget: '',
          type: 'tabPane',
          title: '商品媒体',
          properties: {
            cover: {
              type: 'array',
              widget: 'image',
              title: '主图',
              description: 'image：图片上传（单图）',
              props: { action: '/api/upload', multiple: false, maxCount: 1 },
            },
            gallery: {
              type: 'array',
              widget: 'image',
              title: '图集',
              description: 'image：图片上传（多图）',
              props: { action: '/api/upload', multiple: true, maxCount: 8 },
            },
            attachment: {
              type: 'array',
              widget: 'file',
              title: '附件',
              description: 'file：通用文件上传',
              props: { action: '/api/upload', multiple: true },
            },
            profile: {
              widget: '',
              type: 'object',
              title: '数据对象（profile）',
              description: '嵌套对象：key 进入数据路径 profile.*',
              properties: {
                website: {
                  type: 'string',
                  widget: 'urlInput',
                  title: '品牌官网',
                  placeholder: 'https://',
                },
                score: {
                  type: 'integer',
                  widget: 'number',
                  title: '品牌评分',
                },
              },
            },
          },
        },
        accountPane: {
          widget: '',
          type: 'tabPane',
          title: '店铺与权限',
          properties: {
            storeAccount: {
              type: 'string',
              widget: 'password',
              title: '店铺密码',
              placeholder: '至少 8 位，含字母与数字',
              description: 'password：密码输入',
              rules: [
                { min: 8, message: '密码至少 8 位' },
                {
                  pattern: '^(?=.*[A-Za-z])(?=.*\\d).+$',
                  message: '需同时包含字母与数字',
                },
              ],
            },
            apiKey: {
              type: 'string',
              widget: 'password',
              title: '开放平台 Key',
              placeholder: 'sk-...',
            },
            callbackUrl: {
              type: 'string',
              widget: 'urlInput',
              title: '回调地址',
              placeholder: 'https://',
              validate: { format: 'url' },
            },
            owner: {
              type: 'string',
              widget: 'mentions',
              title: '审核人',
              placeholder: '输入 @ 指派审核',
              enum: ['运营一姐', '增长同学', '财务老张'],
            },
            permission: {
              type: 'array',
              widget: 'transfer',
              title: '数据权限',
              description: 'transfer：穿梭框（双向选择）',
              props: {
                transferData: permissionItems,
                titles: '未授权,已授权',
                showSearch: true,
              },
            },
          },
        },
      },
    },

    // ── 高级配置（collapse 布局 + 数组 widget）──────────────────────────
    advanced: {
      widget: '',
      type: 'collapse',
      properties: {
        pricePanel: {
          widget: '',
          type: 'collapsePanel',
          title: '阶梯定价（tableList）',
          properties: {
            priceLadder: {
              type: 'array',
              widget: 'tableList',
              title: '阶梯价',
              description: 'tableList：表格型数组编辑（列 = items.properties）',
              items: {
                type: 'object',
                properties: {
                  minQty: {
                    type: 'number',
                    widget: 'number',
                    title: '起订量',
                    default: 1,
                  },
                  unitPrice: {
                    type: 'number',
                    widget: 'number',
                    title: '单价',
                    default: 0,
                  },
                  note: { type: 'string', widget: 'input', title: '备注' },
                },
              },
            },
          },
        },
        memberPanel: {
          widget: '',
          type: 'collapsePanel',
          title: '会员价（list）',
          properties: {
            memberPrice: {
              type: 'array',
              widget: 'list',
              title: '会员价',
              description: 'list：卡片式数组编辑（可增删/排序）',
              items: {
                type: 'object',
                properties: {
                  level: {
                    type: 'string',
                    widget: 'select',
                    title: '会员等级',
                    enum: ['silver', 'gold', 'platinum'],
                    enumNames: ['白银', '黄金', '铂金'],
                  },
                  price: {
                    type: 'number',
                    widget: 'number',
                    title: '会员价',
                    default: 0,
                  },
                },
              },
            },
          },
        },
        couponPanel: {
          widget: '',
          type: 'collapsePanel',
          title: '优惠券（simpleList）',
          properties: {
            coupons: {
              type: 'array',
              widget: 'simpleList',
              title: '可叠加优惠券',
              description: 'simpleList：极简数组编辑',
              items: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string',
                    widget: 'input',
                    title: '券码',
                    placeholder: '如 FULL-100',
                  },
                  amount: {
                    type: 'number',
                    widget: 'number',
                    title: '面额',
                    default: 0,
                  },
                },
              },
            },
          },
        },
      },
    },

    // ── 审核流程（steps 布局）────────────────────────────────────────────
    audit: {
      widget: '',
      type: 'steps',
      properties: {
        applyStep: {
          widget: '',
          type: 'step',
          title: '提交审核',
          properties: {
            applicant: {
              type: 'string',
              widget: 'input',
              title: '申请人',
              required: true,
            },
            applyRemark: {
              type: 'string',
              widget: 'textarea',
              title: '申请说明',
              placeholder: '简述上架理由与促销计划',
            },
          },
        },
        reviewStep: {
          widget: '',
          type: 'step',
          title: '平台审核',
          properties: {
            reviewer: {
              type: 'string',
              widget: 'input',
              title: '审核人',
              readOnly: true,
              default: '平台小二',
              description: 'readOnly：只读展示',
            },
            result: {
              type: 'string',
              widget: 'radio',
              title: '审核结果',
              enum: ['pass', 'reject', 'pending'],
              enumNames: ['通过', '驳回', '待定'],
            },
          },
        },
        onlineStep: {
          widget: '',
          type: 'step',
          title: '定时上架',
          properties: {
            onlineDate: {
              type: 'string',
              widget: 'date',
              title: '上架日期',
              description: 'date：日期选择',
            },
            onlineTime: {
              type: 'string',
              widget: 'time',
              title: '上架时间',
              description: 'time：时间选择',
            },
          },
        },
      },
    },

    // ── 促销联动（divider + card + flex + space + void 布局）────────────
    promoDivider: {
      widget: '',
      type: 'divider',
      title: '促销与联动（reactions 演示）',
      properties: {},
    },

    promo: {
      widget: '',
      type: 'card',
      title: '促销配置（visible / required / 计算字段）',
      properties: {
        useFlashSale: {
          type: 'boolean',
          widget: 'switch',
          title: '参与秒杀',
        },
        flashSale: {
          type: 'array',
          widget: 'timeRange',
          title: '秒杀时段',
          description: 'timeRange：时间范围（勾选参与秒杀后显示并必填）',
          items: { type: 'string', widget: 'time' },
          hidden: '{{ formData.useFlashSale === false }}',
          required: '{{ formData.useFlashSale === true }}',
        },
        useCoupon: {
          type: 'boolean',
          widget: 'switch',
          title: '叠加店铺优惠券',
        },
        couponCode: {
          type: 'string',
          widget: 'input',
          title: '主推券码',
          placeholder: '3-12 位大写字母/数字',
          description: 'hidden/required：勾选叠加优惠券后显示并必填',
          hidden: '{{ formData.useCoupon === false }}',
          required: '{{ formData.useCoupon === true }}',
          pattern: '^[A-Z0-9]{3,12}$',
          min: 3,
          max: 12,
        },
        promoWindow: {
          type: 'array',
          widget: 'dateRange',
          title: '促销周期',
          description: 'dateRange：日期范围',
          items: { type: 'string', widget: 'date' },
        },
        flexRow: {
          widget: '',
          type: 'flex',
          properties: {
            flexA: {
              type: 'string',
              widget: 'input',
              title: '投放渠道 A',
              placeholder: '如 首页焦点图',
            },
            flexB: {
              type: 'string',
              widget: 'input',
              title: '投放渠道 B',
              placeholder: '如 搜索推荐位',
            },
          },
        },
        spaceRow: {
          widget: '',
          type: 'space',
          properties: {
            spaceA: {
              type: 'string',
              widget: 'input',
              title: '外联链接',
            },
            spaceB: {
              type: 'string',
              widget: 'input',
              title: '内联备注',
            },
          },
        },
        voidRow: {
          widget: '',
          type: 'void',
          properties: {
            extraNote: {
              type: 'string',
              widget: 'input',
              title: '运营备注',
              placeholder: 'void 布局：无渲染容器，字段直接平铺',
            },
          },
        },
      },
    },
  },
};