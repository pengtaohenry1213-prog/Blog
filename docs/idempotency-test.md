# 点赞和投票功能幂等性验证文档

## 概述

本文档说明如何验证点赞和投票功能的幂等性实现，确保同一操作不会重复执行。

## 幂等性实现机制

### 1. 前端幂等键生成

**位置**: `packages/frontend/src/views/frontend/ArticleDetail.vue`

```javascript
// 生成基于操作的幂等键（同一操作使用相同键）
function generateIdempotencyKey(action, articleId) {
  const userId = authStore.user?.id || 'guest';
  return `${action}:${articleId}:${userId}`;
}
```

**特点**:
- 同一用户对同一文章的同一操作，幂等键相同
- 格式：`{action}:{articleId}:{userId}`
- 示例：`like:123:456`、`vote:1:123:456`

### 2. 后端幂等性中间件

**位置**: `packages/backend/middleware/idempotency.js`

**流程**:
1. 检查 `Idempotency-Key` 请求头
2. 使用 Redis 存储幂等键状态
3. 第一次请求：设置 `processing` 状态
4. 重复请求：返回已缓存的结果（200）或 `processing` 状态（409）
5. 成功响应：更新为 `succeeded` 状态
6. 失败响应（5xx）：删除键，允许重试

### 3. API 接口配置

**点赞接口**:
- `POST /api/articles/:id/like` - 带 `idempotencyGuard` 中间件
- `POST /api/articles/:id/unlike` - 带 `idempotencyGuard` 中间件

**投票接口**:
- `POST /api/articles/:id/vote` - 带 `idempotencyGuard` 中间件

## 验证方法

### 1. 手动测试

#### 测试场景 1: 快速连续点击点赞按钮

**步骤**:
1. 打开文章详情页
2. 快速连续点击点赞按钮 3-5 次
3. 观察结果

**预期结果**:
- 只有第一次点击生效
- 后续点击返回 409 或直接返回第一次的结果
- 点赞数只增加 1
- 前端显示 "操作已完成，正在刷新数据..."

#### 测试场景 2: 网络重试模拟

**步骤**:
1. 打开浏览器开发者工具 -> Network
2. 设置为 "Slow 3G" 或 "Offline"
3. 点击点赞按钮
4. 在网络请求发送后，快速切换回正常网络
5. 观察是否有重复请求

**预期结果**:
- 如果请求已发送，重复请求会被幂等中间件拦截
- 返回已缓存的结果

#### 测试场景 3: 投票切换测试

**步骤**:
1. 点击"赞成"按钮
2. 立即点击"反对"按钮
3. 观察结果

**预期结果**:
- 每个操作使用不同的幂等键（`vote:1:123:456` vs `vote:-1:123:456`）
- 两个操作都能正常执行
- 得分正确更新

### 2. 使用浏览器控制台测试

打开浏览器控制台，执行以下代码：

```javascript
// 测试快速连续请求
async function testIdempotency() {
  const articleId = 1; // 替换为实际文章ID
  const token = localStorage.getItem('token'); // 或从 authStore 获取
  
  // 生成相同的幂等键
  const idempotencyKey = `like:${articleId}:test-user`;
  
  // 同时发送 5 个相同请求
  const promises = Array(5).fill(null).map(() => 
    fetch(`http://localhost:3001/api/articles/${articleId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json'
      }
    })
  );
  
  const results = await Promise.all(promises);
  console.log('所有请求状态:', results.map(r => r.status));
  console.log('响应内容:', await Promise.all(results.map(r => r.json())));
}

testIdempotency();
```

**预期结果**:
- 第一个请求返回 200（成功）
- 后续请求返回 200（返回缓存结果）或 409（处理中）

### 3. 使用 Postman/curl 测试

#### 测试 1: 相同幂等键的重复请求

```bash
# 第一次请求
curl -X POST http://localhost:3001/api/articles/1/like \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: test-like-key-123" \
  -H "Content-Type: application/json"

# 立即发送相同幂等键的请求
curl -X POST http://localhost:3001/api/articles/1/like \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: test-like-key-123" \
  -H "Content-Type: application/json"
```

**预期结果**:
- 第一个请求：200 OK，执行点赞操作
- 第二个请求：200 OK，返回第一次的结果（不重复执行）

#### 测试 2: 不同幂等键的请求

```bash
# 使用不同的幂等键
curl -X POST http://localhost:3001/api/articles/1/like \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Idempotency-Key: test-like-key-456" \
  -H "Content-Type: application/json"
```

**预期结果**:
- 如果文章已点赞，可能返回错误或状态信息
- 如果未点赞，正常执行点赞操作

### 4. Redis 验证

检查 Redis 中的幂等键状态：

```bash
# 连接 Redis
redis-cli

# 查看所有幂等键
KEYS idem:*

# 查看特定键的值
GET idem:user123:like:1:user123

# 查看 TTL
TTL idem:user123:like:1:user123
```

**预期结果**:
- 幂等键格式：`idem:{userId}:{idempotencyKey}`
- 状态为 `succeeded` 时，包含 `response` 字段
- TTL 约为 300 秒（5分钟）

## 验证检查清单

### 前端验证

- [ ] 点赞按钮快速连续点击，只执行一次
- [ ] 投票按钮快速连续点击，只执行一次
- [ ] 网络慢速时，重复请求被正确处理
- [ ] 409 状态码时，显示友好提示并刷新数据
- [ ] 幂等键正确生成（同一操作使用相同键）

### 后端验证

- [ ] 相同幂等键的请求，只执行一次业务逻辑
- [ ] 重复请求返回缓存的结果（200）或处理中（409）
- [ ] Redis 中正确存储幂等键状态
- [ ] 幂等键 TTL 正确设置（5分钟）
- [ ] 5xx 错误时，删除幂等键允许重试

### 数据库验证

- [ ] 快速连续点赞，数据库只插入一条记录
- [ ] 快速连续投票，数据库只更新一次
- [ ] 唯一约束正常工作（防止重复数据）

## 常见问题

### Q1: 为什么快速点击还是会执行多次？

**A**: 检查以下几点：
1. 前端是否正确生成了幂等键
2. 请求拦截器是否正确添加了 `Idempotency-Key` header
3. 后端中间件是否正确配置
4. Redis 连接是否正常

### Q2: 409 错误是什么意思？

**A**: 409 Conflict 表示请求正在处理中或已处理。这是正常的幂等性保护机制。

### Q3: 如何测试网络重试场景？

**A**: 
1. 使用浏览器开发者工具模拟慢速网络
2. 使用 Postman 的 "Send and Download" 功能
3. 使用 curl 发送请求后立即中断

### Q4: 幂等键过期后会发生什么？

**A**: 幂等键过期（5分钟后）后，相同的操作可以再次执行。这是正常的，因为：
- 5分钟足够覆盖正常的网络重试窗口
- 过期后允许用户重新执行操作（如重新点赞）

## 性能考虑

- Redis 操作是原子性的，性能影响很小
- 幂等键 TTL 设置为 5 分钟，避免 Redis 内存占用过大
- 使用 `SET NX` 确保原子性，避免并发问题

## 总结

通过以上验证方法，可以确保点赞和投票功能的幂等性正常工作。关键点：

1. **前端**: 为每个操作生成稳定的幂等键
2. **后端**: 使用 Redis 存储和处理幂等键状态
3. **错误处理**: 正确处理 409 状态码，刷新数据
4. **数据库**: 使用唯一约束作为最终保障

