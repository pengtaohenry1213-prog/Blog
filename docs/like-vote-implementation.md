# 点赞和投票功能实现文档

## 概述

本文档说明已实现的文章点赞和投票功能，包括后端 API、前端 UI 和幂等性保障。该功能支持用户对文章进行点赞/取消点赞，以及投票（赞成/反对/取消），并确保操作的幂等性和数据一致性。

## 已完成的工作

### 1. 后端模型

#### ArticleReaction 模型 (`packages/backend/models/ArticleReaction.js`)
- **用途**：存储文章反应（点赞、收藏等）
- **表名**：`article_reactions`
- **字段**：
  - `id`：主键，自增
  - `article_id`：文章ID（外键关联 `articles` 表）
  - `user_id`：用户ID（外键关联 `users` 表）
  - `type`：反应类型（目前仅支持 `'like'`）
  - `value`：反应值（默认 1，表示点赞）
  - `created_at`：创建时间
  - `updated_at`：更新时间
- **索引**：
  - 唯一索引：`idx_article_reactions_unique` (`article_id`, `user_id`, `type`) - 防止重复点赞
  - 普通索引：`idx_article_reactions_article_id` (`article_id`)
  - 普通索引：`idx_article_reactions_user_id` (`user_id`)
- **关联关系**：
  - `belongsTo Article` (as: 'article')
  - `belongsTo User` (as: 'user')

#### ArticleVote 模型 (`packages/backend/models/ArticleVote.js`)
- **用途**：存储文章投票
- **表名**：`article_votes`
- **字段**：
  - `id`：主键，自增
  - `article_id`：文章ID（外键关联 `articles` 表）
  - `user_id`：用户ID（外键关联 `users` 表）
  - `value`：投票值（1=赞成，-1=反对，0=取消）
  - `created_at`：创建时间
  - `updated_at`：更新时间
- **索引**：
  - 唯一索引：`idx_article_votes_unique` (`article_id`, `user_id`) - 确保每个用户只能投一次票
  - 普通索引：`idx_article_votes_article_id` (`article_id`)
  - 普通索引：`idx_article_votes_user_id` (`user_id`)
- **关联关系**：
  - `belongsTo Article` (as: 'article')
  - `belongsTo User` (as: 'user')

### 2. 后端 API

#### 路由 (`packages/backend/modules/article/router.js`)

##### 点赞相关接口

**POST `/api/articles/:id/like`**
- **功能**：点赞文章
- **认证**：需要登录（`authenticate` 中间件）
- **幂等性**：使用 `idempotencyGuard` 中间件
- **参数**：
  - `id`（路径参数）：文章ID
  - `Idempotency-Key`（请求头）：幂等键（自动生成或手动指定）
- **响应**：
  ```json
  {
    "code": 200,
    "message": "点赞成功",
    "data": {
      "articleId": 1,
      "liked": true,
      "likeCount": 5
    }
  }
  ```

**POST `/api/articles/:id/unlike`**
- **功能**：取消点赞
- **认证**：需要登录（`authenticate` 中间件）
- **幂等性**：使用 `idempotencyGuard` 中间件
- **参数**：
  - `id`（路径参数）：文章ID
  - `Idempotency-Key`（请求头）：幂等键（自动生成或手动指定）
- **响应**：
  ```json
  {
    "code": 200,
    "message": "取消点赞成功",
    "data": {
      "articleId": 1,
      "liked": false,
      "likeCount": 4
    }
  }
  ```

##### 投票相关接口

**POST `/api/articles/:id/vote`**
- **功能**：投票文章（赞成/反对/取消）
- **认证**：需要登录（`authenticate` 中间件）
- **幂等性**：使用 `idempotencyGuard` 中间件
- **参数**：
  - `id`（路径参数）：文章ID
  - `value`（请求体）：投票值（1=赞成，-1=反对，0=取消投票）
  - `Idempotency-Key`（请求头）：幂等键（自动生成或手动指定）
- **请求体示例**：
  ```json
  {
    "value": 1
  }
  ```
- **响应**：
  ```json
  {
    "code": 200,
    "message": "投票成功",
    "data": {
      "articleId": 1,
      "vote": 1,
      "voteScore": 10,
      "up": 15,
      "down": 5
    }
  }
  ```

#### 控制器 (`packages/backend/modules/article/controller.js`)

- **`like(req, res, next)`**：处理点赞请求
  - 从 `req.userId` 获取用户ID
  - 调用 `articleService.like(articleId, userId)`
  - 返回点赞结果

- **`unlike(req, res, next)`**：处理取消点赞请求
  - 从 `req.userId` 获取用户ID
  - 调用 `articleService.unlike(articleId, userId)`
  - 返回取消点赞结果

- **`vote(req, res, next)`**：处理投票请求
  - 从 `req.userId` 获取用户ID
  - 从 `req.body.value` 获取投票值
  - 调用 `articleService.vote(articleId, userId, value)`
  - 返回投票结果

#### 服务层 (`packages/backend/modules/article/service.js`)

##### `like(articleId, userId)`
- **功能**：点赞文章
- **逻辑**：
  1. 检查是否已点赞（通过唯一约束防止重复）
  2. 如果已点赞，返回当前状态
  3. 如果未点赞，创建点赞记录
  4. 统计点赞数
  5. 清除文章缓存
- **返回**：`{ articleId, liked: true, likeCount }`

##### `unlike(articleId, userId)`
- **功能**：取消点赞
- **逻辑**：
  1. 查找点赞记录
  2. 如果未点赞，返回当前状态
  3. 如果已点赞，删除点赞记录
  4. 统计点赞数
  5. 清除文章缓存
- **返回**：`{ articleId, liked: false, likeCount }`

##### `vote(articleId, userId, value)`
- **功能**：投票文章
- **参数**：`value` 必须是 `1`（赞成）、`-1`（反对）或 `0`（取消）
- **逻辑**：
  1. 验证投票值
  2. 查找现有投票记录
  3. 如果 `value === 0`，删除投票记录
  4. 如果 `value !== 0`，创建或更新投票记录（唯一约束防止重复）
  5. 统计投票数（赞成数、反对数、得分）
  6. 清除文章缓存
- **返回**：`{ articleId, vote, voteScore, up, down }`

##### `getArticleById(id, userId)`
- **功能**：获取文章详情（包含点赞和投票统计）
- **参数**：`userId` 可选，如果提供则返回用户特定的点赞/投票状态
- **返回字段**：
  - `likeCount`：点赞总数
  - `liked`：当前用户是否已点赞（仅当 `userId` 存在时）
  - `voteScore`：投票得分（赞成数 - 反对数）
  - `vote`：当前用户的投票值（1/-1/0，仅当 `userId` 存在时）
  - `up`：赞成数
  - `down`：反对数

### 3. 前端实现

#### API 封装 (`packages/frontend/src/api/article.js`)

##### `likeArticle(id, idempotencyKey)`
- **功能**：点赞文章
- **参数**：
  - `id`：文章ID
  - `idempotencyKey`：幂等键（可选，如果不提供，请求拦截器会自动生成）
- **实现**：`POST /api/articles/:id/like`

##### `unlikeArticle(id, idempotencyKey)`
- **功能**：取消点赞
- **参数**：
  - `id`：文章ID
  - `idempotencyKey`：幂等键（可选）
- **实现**：`POST /api/articles/:id/unlike`

##### `voteArticle(id, value, idempotencyKey)`
- **功能**：投票文章
- **参数**：
  - `id`：文章ID
  - `value`：投票值（1=赞成，-1=反对，0=取消）
  - `idempotencyKey`：幂等键（可选）
- **实现**：`POST /api/articles/:id/vote`，请求体：`{ value }`

#### 请求拦截器 (`packages/frontend/src/utils/request.js`)

**自动幂等键生成**：
- 对所有写操作（POST、PUT、PATCH、DELETE）自动添加 `Idempotency-Key` 请求头
- 如果请求头中已存在 `Idempotency-Key`，则使用已有的值
- 如果不存在，则自动生成一个 UUID（使用 `crypto.randomUUID()` 或时间戳+随机数）

**错误处理**：
- **409 Conflict**：幂等性冲突（请求已处理或正在处理中），显示提示信息
- **400 Bad Request**：缺少幂等键（开发环境会明确提示）

#### UI 组件 (`packages/frontend/src/views/frontend/ArticleDetail.vue`)

##### 点赞功能
- **UI 元素**：点赞按钮，显示点赞数和状态
- **状态管理**：
  - `liked`：是否已点赞
  - `likeCount`：点赞数
  - `likeLoading`：加载状态（防止重复点击）
- **交互逻辑**：
  1. 点击时检查登录状态，未登录则跳转登录页
  2. **乐观更新**：立即更新 UI（切换点赞状态，更新点赞数）
  3. 生成幂等键：`${action}:${articleId}:${userId}`（同一操作使用相同键）
  4. 调用 API
  5. 如果失败（非 409），回滚 UI 状态
  6. 如果 409（请求已处理），刷新数据获取最新状态

##### 投票功能
- **UI 元素**：
  - 赞成按钮（显示赞成数）
  - 反对按钮（显示反对数）
  - 得分显示（赞成数 - 反对数）
- **状态管理**：
  - `vote`：当前投票值（1/-1/0）
  - `voteScore`：投票得分
  - `up`：赞成数
  - `down`：反对数
  - `voteLoading`：加载状态
- **交互逻辑**：
  1. 点击时检查登录状态
  2. **智能切换**：如果点击相同方向则取消投票（`value = 0`），否则切换
  3. **乐观更新**：立即更新 UI（计算得分和数量变化）
  4. 生成幂等键：`vote:${newVote}:${articleId}:${userId}`
  5. 调用 API
  6. 使用服务器返回的最新数据更新状态
  7. 如果失败（非 409），回滚 UI 状态
  8. 如果 409，刷新数据获取最新状态

### 4. 幂等性保障

#### 后端中间件 (`packages/backend/middleware/idempotency.js`)

**`idempotencyGuard` 中间件**：

1. **幂等键获取**：
   - 优先从请求头 `Idempotency-Key` 获取
   - 其次从请求体 `idempotencyKey` 获取
   - 如果不存在，返回 400 错误（生产环境）或提示（开发环境）

2. **Redis 键格式**：`idem:${userId}:${idempotencyKey}`
   - 每个用户的操作使用独立的幂等键空间
   - TTL：5 分钟（覆盖客户端重试窗口）

3. **处理流程**：
   - **首次请求**：使用 `SET NX` 原子操作设置占位符（`status: 'processing'`）
   - **重复请求**：
     - 如果状态为 `'succeeded'`，直接返回缓存的响应（200）
     - 如果状态为 `'processing'`，返回 409 Conflict
     - 如果状态为 `'failed'`，返回 409 Conflict

4. **响应拦截**：
   - 拦截 `res.json()` 方法
   - 成功响应（2xx）：更新 Redis 缓存为 `'succeeded'` 状态，保存响应数据
   - 服务器错误（5xx）：删除 Redis 键，允许重试

5. **错误处理**：
   - Redis 连接失败：返回 500 错误
   - 统一日志记录

#### 前端幂等键生成策略

**策略**：基于操作类型、文章ID和用户ID生成稳定的幂等键
- **格式**：`${action}:${articleId}:${userId}`
- **示例**：
  - 点赞：`like:1:123`
  - 取消点赞：`unlike:1:123`
  - 投票（赞成）：`vote:1:1:123`
  - 投票（反对）：`vote:-1:1:123`
  - 取消投票：`vote:0:1:123`

**优势**：
- 同一用户对同一文章的同一操作使用相同键
- 不同操作使用不同键（可以切换操作）
- 不同用户的操作互不影响

## 数据库迁移

表结构通过 Sequelize 模型自动管理：

- **开发环境**：应用启动时会自动执行 `sequelize.sync({ alter: true })`，根据模型自动创建/更新表结构
- **生产环境**：建议使用数据库迁移工具（如 Sequelize Migrations）来管理表结构变更

相关模型文件：
- `packages/backend/models/ArticleReaction.js` - 文章反应表（点赞、收藏等）
- `packages/backend/models/ArticleVote.js` - 文章投票表

## API 使用示例

### 点赞文章

```javascript
// 前端调用
const idempotencyKey = `like:${articleId}:${userId}`;
await articleApi.likeArticle(articleId, idempotencyKey);

// 响应
{
  code: 200,
  message: '点赞成功',
  data: {
    articleId: 1,
    liked: true,
    likeCount: 5
  }
}
```

### 取消点赞

```javascript
// 前端调用
const idempotencyKey = `unlike:${articleId}:${userId}`;
await articleApi.unlikeArticle(articleId, idempotencyKey);

// 响应
{
  code: 200,
  message: '取消点赞成功',
  data: {
    articleId: 1,
    liked: false,
    likeCount: 4
  }
}
```

### 投票文章

```javascript
// 前端调用 - 赞成
const idempotencyKey = `vote:1:${articleId}:${userId}`;
await articleApi.voteArticle(articleId, 1, idempotencyKey);

// 响应
{
  code: 200,
  message: '投票成功',
  data: {
    articleId: 1,
    vote: 1,
    voteScore: 10,
    up: 15,
    down: 5
  }
}

// 前端调用 - 反对
const idempotencyKey = `vote:-1:${articleId}:${userId}`;
await articleApi.voteArticle(articleId, -1, idempotencyKey);

// 前端调用 - 取消投票
const idempotencyKey = `vote:0:${articleId}:${userId}`;
await articleApi.voteArticle(articleId, 0, idempotencyKey);
```

### 获取文章详情（包含点赞/投票信息）

```javascript
// 前端调用
const article = await articleApi.getDetail(articleId);

// 响应（如果用户已登录）
{
  code: 200,
  message: '获取成功',
  data: {
    id: 1,
    title: '文章标题',
    content: '...',
    author: { id: 1, username: 'author', avatar: '...' },
    category: { id: 1, name: '技术', slug: 'tech' },
    publish_time: '2024-01-01T00:00:00.000Z',
    read_count: 100,
    likeCount: 5,        // 点赞总数
    liked: true,         // 当前用户是否已点赞（仅登录时）
    voteScore: 10,       // 投票得分（赞成数 - 反对数）
    vote: 1,             // 当前用户的投票（1/-1/0，仅登录时）
    up: 15,              // 赞成数
    down: 5              // 反对数
  }
}
```

## 测试建议

### 1. 功能测试

- [x] 点赞/取消点赞功能正常
- [x] 投票（赞成/反对/取消）功能正常
- [x] 未登录用户可以看到统计但不能操作
- [x] 已登录用户可以看到自己的状态
- [x] 点赞/投票后统计信息实时更新
- [x] 文章详情页正确显示点赞和投票状态

### 2. 幂等性测试

- [x] 快速连续点击点赞按钮，只记录一次
- [x] 网络重试时，使用相同的 `Idempotency-Key` 不会重复处理
- [x] 不同操作使用不同幂等键，可以正常切换
- [x] 使用 JMeter/Locust 进行并发测试
- [x] 验证 Redis 缓存正确存储和返回响应

### 3. 边界情况

- [x] 点赞已点赞的文章（应该返回当前状态，不重复创建）
- [x] 取消点赞未点赞的文章（应该返回当前状态）
- [x] 投票已投票的文章（应该更新投票）
- [x] 取消投票未投票的文章（应该返回当前状态）
- [x] 无效的投票值（应该返回 400 错误）
- [x] 不存在的文章ID（应该返回 404 错误）

### 4. 性能测试

- [ ] 大量并发点赞/投票请求的处理能力
- [ ] Redis 缓存命中率
- [ ] 数据库查询性能（统计查询）
- [ ] 缓存清理对性能的影响

## 注意事项

1. **缓存清理**：点赞/投票操作后会清除文章缓存（`article:${id}`），确保统计信息实时
2. **唯一约束**：数据库层面的唯一约束是最终保障，防止数据不一致
   - `article_reactions`：`(article_id, user_id, type)` 唯一
   - `article_votes`：`(article_id, user_id)` 唯一
3. **用户认证**：点赞和投票接口需要用户登录（`authenticate` 中间件）
4. **幂等键**：
   - 前端请求拦截器会自动为写操作添加幂等键
   - 对于点赞/投票操作，建议使用基于操作的稳定键（如 `like:${articleId}:${userId}`）
   - 幂等键 TTL 为 5 分钟，超过时间后可以重新操作
5. **乐观更新**：前端使用乐观更新提升用户体验，失败时会回滚
6. **错误处理**：
   - 409 Conflict：请求已处理，前端会刷新数据
   - 400 Bad Request：缺少幂等键或参数错误
   - 500 Internal Server Error：服务器错误，会释放幂等键允许重试

## 技术细节

### 数据库设计

- **外键约束**：使用 `ON DELETE CASCADE`，删除文章或用户时自动删除相关记录
- **索引优化**：为常用查询字段（`article_id`、`user_id`）建立索引
- **唯一约束**：防止重复操作，保证数据一致性

### 缓存策略

- **文章详情缓存**：1 小时过期
- **点赞/投票操作**：操作后立即清除相关缓存
- **热门文章缓存**：5 分钟过期

### 幂等性实现

- **Redis 原子操作**：使用 `SET NX` 确保只有一个请求能设置占位符
- **状态机**：`processing` → `succeeded` / `failed`
- **响应缓存**：成功响应缓存 5 分钟，重复请求直接返回

## 后续优化建议

1. **实时更新**：可以考虑使用 WebSocket 实现点赞/投票的实时更新
2. **批量查询**：文章列表页可以批量查询点赞/投票统计，减少数据库查询
3. **缓存优化**：
   - 点赞/投票统计可以单独缓存，减少数据库压力
   - 使用 Redis 缓存统计信息，定期更新
4. **限流**：可以添加更细粒度的限流策略，防止恶意刷赞/刷票
5. **统计优化**：考虑使用 Redis 计数器或数据库触发器优化统计查询
6. **通知功能**：点赞/投票后可以通知文章作者
7. **数据分析**：记录点赞/投票的时间分布，用于内容推荐
