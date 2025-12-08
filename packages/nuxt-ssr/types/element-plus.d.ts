/**
 * Element Plus 类型声明
 * 为 Element Plus 的 locale 模块提供类型定义
 */

// Element Plus locale 类型定义
interface ElementPlusLocale {
  name: string;
  el: {
    [key: string]: any;
  };
  [key: string]: any;
}

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const zhCn: ElementPlusLocale;
  export default zhCn;
}

declare module 'element-plus/dist/locale/*.mjs' {
  const locale: ElementPlusLocale;
  export default locale;
}

