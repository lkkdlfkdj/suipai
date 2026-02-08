# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [Supabase](https://supabase.com) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目名称和密码，选择区域（建议选择离你最近的区域）
4. 等待项目创建完成

## 2. 获取 API 密钥

1. 进入项目 Dashboard
2. 点击左侧菜单 "Project Settings" → "API"
3. 复制以下值：
   - **Project URL**: `https://your-project.supabase.co`
   - **anon public**: `eyJhbG...` (以 eyJhbG 开头的长字符串)

## 3. 配置环境变量

1. 复制 `.env.example` 为 `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. 编辑 `.env.local`，填入你的 Supabase 配置:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

## 4. 创建数据库表

### 方法 A: 使用 SQL 编辑器 (推荐)

1. 在 Supabase Dashboard 中，点击左侧 "SQL Editor"
2. 点击 "New query"
3. 打开 `supabase/schema.sql` 文件，复制全部内容
4. 粘贴到 SQL Editor 中
5. 点击 "Run" 执行

### 方法 B: 使用 Migrations

如果你使用 Supabase CLI:

```bash
# 安装 Supabase CLI
npm install -g supabase

# 登录
supabase login

# 链接项目
supabase link --project-ref your-project-ref

# 执行 migrations
supabase db push
```

## 5. 创建 Storage 存储桶

1. 在 Supabase Dashboard 中，点击左侧 "Storage"
2. 点击 "New bucket" 创建以下存储桶：

### photos (原始照片)
- **Name**: `photos`
- **Public**: 取消勾选 (私有)
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png, image/heic`

### edited-works (编辑后的作品)
- **Name**: `edited-works`
- **Public**: 勾选 (公开)
- **File size limit**: 10MB
- **Allowed MIME types**: `image/jpeg, image/png`

### avatars (用户头像)
- **Name**: `avatars`
- **Public**: 勾选 (公开)
- **File size limit**: 2MB
- **Allowed MIME types**: `image/jpeg, image/png`

## 6. 配置 Storage 权限

### photos 存储桶权限

在 Storage → photos → Policies 中添加：

**SELECT 策略**:
```sql
(auth.uid() = owner)
```

**INSERT 策略**:
```sql
(auth.uid() = owner)
```

**UPDATE 策略**:
```sql
(auth.uid() = owner)
```

**DELETE 策略**:
```sql
(auth.uid() = owner)
```

### edited-works 存储桶权限

**SELECT 策略**: 允许所有人读取
```sql
(true)
```

**INSERT 策略**:
```sql
(auth.uid() = owner)
```

**UPDATE 策略**:
```sql
(auth.uid() = owner)
```

**DELETE 策略**:
```sql
(auth.uid() = owner)
```

### avatars 存储桶权限

**SELECT 策略**: 允许所有人读取
```sql
(true)
```

**INSERT 策略**:
```sql
(auth.uid() = owner)
```

**UPDATE 策略**:
```sql
(auth.uid() = owner)
```

**DELETE 策略**:
```sql
(auth.uid() = owner)
```

## 7. 启用认证

1. 在 Supabase Dashboard 中，点击左侧 "Authentication"
2. 在 "Providers" 标签页中，启用以下登录方式：
   - **Email**: 启用 (默认)
   - **Google**: 可选，如需启用需要配置 OAuth

3. 在 "Settings" → "Email Templates" 中自定义邮件模板（可选）

## 8. 安装依赖

```bash
npm install
```

## 9. 启动开发服务器

```bash
npm run dev
```

## 10. 验证设置

1. 打开应用 `http://localhost:5173`
2. 尝试注册新用户
3. 拍摄照片并保存
4. 检查 Supabase Dashboard 中：
   - Authentication → Users 中是否有新用户
   - Table Editor → photos 表中是否有新记录
   - Storage → photos 中是否有上传的文件

## 故障排除

### 问题: "Error connecting to Supabase"
- 检查 `.env.local` 中的 URL 和密钥是否正确
- 确保没有多余的空格

### 问题: "Permission denied"
- 检查 RLS 策略是否正确设置
- 确认用户已登录

### 问题: "Bucket not found"
- 确保已在 Storage 中创建相应的存储桶
- 检查存储桶名称是否正确

### 问题: 照片上传失败
- 检查 Storage 存储桶的权限设置
- 确认文件大小未超过限制
- 检查 MIME 类型是否允许

## 免费额度说明

Supabase 免费套餐包含：
- **数据库**: 500MB
- **Storage**: 1GB
- **带宽**: 2GB/月
- **Auth 用户**: 无限

如需更多资源，可升级到 Pro 套餐。

## 安全建议

1. **永远不要**将 `SERVICE_ROLE_KEY` 暴露在前端代码中
2. 使用 RLS 策略保护数据
3. 定期备份数据库
4. 启用 2FA 保护你的 Supabase 账户
