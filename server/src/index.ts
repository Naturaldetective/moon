import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Koa from 'koa'
import { koaBody } from 'koa-body'
import koaStatic from 'koa-static'
import dotenv from 'dotenv'
import { router } from './router'
import { exceptionInterceptor, faviconInterceptor } from './middleware'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()
if (process.env.NODE_ENV === 'production')
  dotenv.config({ path: path.resolve(__dirname, '../.env.production') })

const app = new Koa()

app.use(exceptionInterceptor())
  .use(async (ctx, next) => {
    // 前端统一使用 /api 前缀（与 Cloudflare Worker 保持一致），这里去掉前缀后再交给路由与静态目录
    if (ctx.path.startsWith('/api/'))
      ctx.path = ctx.path.replace(/^\/api/, '')
    await next()
  })
  .use(koaBody())
  .use(faviconInterceptor())
  .use(router.routes())
  .use(koaStatic(path.resolve(__dirname, '../public')))

app.listen(process.env.PORT)

// eslint-disable-next-line no-console
console.log(`Server is running on port ${process.env.PORT}`)
