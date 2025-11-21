# @blog/common

共享模块包，包含项目中多个包都需要使用的公共代码。

## 📦 功能

### 类型定义 (`types/`)

提供 TypeScript JSDoc 类型定义：

- **User** - 用户信息类型
- **Article** - 文章信息类型
- **Category** - 分类信息类型
- **ApiResponse** - API 响应统一格式
- 其他业务相关类型

### 工具函数 (`utils/`)

提供常用的工具函数：

- **日期格式化** - 格式化和转换日期
- **分页参数** - 处理分页逻辑
- **邮箱验证** - 验证邮箱格式
- **Slug 生成** - 生成 URL 友好的标识符
- 其他辅助工具函数

## 🚀 使用方法

在其他包中导入共享内容：

```javascript
// 导入类型定义
import { User, Article, ApiResponse } from '@blog/common';

// 导入工具函数
import { formatDate, validateEmail, generateSlug } from '@blog/common';
```

## 📂 目录结构

```
packages/common/
├── README.md
├── package.json
├── index.js           # 入口文件
├── types/
│   └── index.js       # 类型定义
└── utils/
    └── index.js       # 工具函数
```

## 💡 注意事项

- 本模块使用 JSDoc 类型注释，支持 JavaScript 类型检查
- 在 monorepo 中作为内部依赖，其他包通过 `@blog/common` 引用
- 修改此模块的内容会影响所有依赖它的包

## 🔗 相关文档

- [主项目 README](../../README.md)
- [后端包 README](../backend/README.md)
- [前端包 README](../frontend/README.md)