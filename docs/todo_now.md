## 已完成 PLAN.md 中的实施计划。总结如下：
### 已完成的任务
1. Husky pre-commit 钩子配置
  在 packages/frontend/package.json 中添加了 prepare 脚本和 lint-staged 配置创建了 .husky/pre-commit 钩子文件，实现提交前自动代码校验
2. 环境变量示例文件
  创建了 env.example 文件，包含所有必要的环境变量配置说明
3. 数据库初始化 SQL 脚本完善
  在 docker/scripts/init.sql 中添加了索引创建语句
  包括 users 表的 username 唯一索引
  包括 articles 表的多个索引（联合索引、单独索引）
4. Common 共享模块创建
  创建了 packages/common 模块
  添加了 JSDoc 类型定义（User、Article、Category、ApiResponse 等）
  添加了共享工具函数（日期格式化、分页参数、邮箱验证、slug 生成等）
5. 后端环境配置完善
  创建了 packages/backend/config/index.js 配置中心
  支持开发/测试/生产环境区分
  更新了 database.js、redis.js、jwt.js 和 app.js 使用统一配置
6. Nginx HTTPS 配置模板
  在 docker/nginx/nginx.conf 中添加了 HTTPS 配置模板（注释形式）
  包含 SSL 证书配置和安全设置说明
  所有计划中的任务已完成。项目结构已完善，配置文件已统一管理，代码规范工具已配置。可以开始开发和部署。


## 个人学习内容(不要分析下面的内容)
* 详细介绍一下如何使用 Docker 容器化部署项目


## 修改backend端口为3001
可以，把后端映射端口调到别的值就行。最简单的做法：
1. 编辑 docker/docker-compose.yml，把 backend 的 ports 段改成例如 - "${BACKEND_PORT:-3001}:3001"，或直接写 - "3001:3001"。
2. 如果你用 .env 覆盖变量，记得在 .env 里加上 BACKEND_PORT=3001 或你想用的任意空闲端口。
3. 保存后重新 docker compose up -d backend frontend（或 docker compose up -d）即可。
保存后重新 docker compose up -d backend frontend（或 docker compose up -d）即可。访问 API 时改用新端口，比如 http://localhost:3001/api/...。

只要宿主机上那个端口没被占用，backend 就会启动成功。

## 文章支持markdown格式预览
```
cd /Users/taopeng/Desktop/Blog
pnpm add -w markdown-it
# 或只在 frontend 包里安装
cd packages/frontend
pnpm add markdown-it
pnpm add dompurify
```

## 优化 element-plus 的按需引入 + 打包
**vite.config.js 中添加了 按需引入插件**
**vite.config.js 中添加了 AutoImport 和 Components 插件，实现按需引入 Element Plus 组件和 API。**
```
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
```

## 优化 ESLint 的自动导入
```
AutoImport({
  resolvers: [ElementPlusResolver()],
  // 生成 ESLint 配置文件，解决 ESLint 报错
  eslintrc: {
    enabled: true, // 启用 ESLint 配置生成
    filepath: './.eslintrc-auto-import.json', // 生成的文件路径
    globalsPropValue: true, // 设置为 true 表示这些是全局变量
  },
}),
```

