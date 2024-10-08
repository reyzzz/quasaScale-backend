import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { Headscale } from './Headscale'

if (Bun.env.HEADSCALE_TOKEN == undefined) throw 'HEADSCALE_TOKEN is not set'
if (Bun.env.QUASASCALE_URL == undefined) throw 'QUASASCALE_URL is not set'
if (Bun.env.HEADSCALE_API_URL == undefined) throw 'HEADSCALE_API_URL is not set'
const proxy_url = Bun.env.HEADSCALE_API_URL
const headscale = await Headscale.Instance()
const app = new Hono()
const origins = Bun.env.QUASASCALE_URL.split(',')
app.use(
  '/*',
  cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400, // Optional: Cache the preflight request for 24 hours
  })
)

app.use(
  '/api/*',
  bearerAuth({
    token: Bun.env.HEADSCALE_TOKEN,
    invalidTokenMessage: 'Invalid Token',
  })
)

app.use(logger())

app.patch('/api/domain/:index', async (c) => {
  const body = await c.req.json()
  const index = c.req.param('index')
  await headscale.updateDomain(body.domain, parseInt(index))
  return c.json({ message: 'Domain updated successfully' }, 200)
})

app.post('/api/domain', async (c) => {
  const body = await c.req.json()
  await headscale.addDomain(body.domain)
  return c.json({ message: 'Domain added successfully' }, 201)
})

app.delete('/api/domain/:index', async (c) => {
  const index = c.req.param('index')
  await headscale.deleteDomain(parseInt(index))
  return c.json({ message: 'Domain deleted successfully' }, 204)
})

app.get('/api/domains', async (c) => {
  const extra_records = await headscale.getDomains()
  return c.json({ domains: extra_records }, 200)
})

app.patch('/api/ip/:nodeId', async (c) => {
  const nodeId = c.req.param('nodeId')
  const body = await c.req.json()
  let update = false
  if (body.IPv4 && body.IPv6) {
    update = await headscale.updateIPv4(parseInt(nodeId), body.IPv4)
    update = await headscale.updateIPv6(parseInt(nodeId), body.IPv6)
  } else if (body.IPv4) {
    update = await headscale.updateIPv4(parseInt(nodeId), body.IPv4)
  } else if (body.IPv6) {
    update = await headscale.updateIPv6(parseInt(nodeId), body.IPv6)
  }
  if (update) return c.json({ message: 'IP updated successfully' }, 200)
  else
    return c.json(
      { message: 'IP not updated, check if other node already has the IP' },
      500
    )
})

app.get('/api/version', async (c) => {
  const resp = await headscale.version()
  return c.json(resp, 200)
})

app.post('/api/restart', async (c) => {
  try {
    const message = await headscale.restart()
    return c.json({ message }, 200)
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.patch('/api/nameservers', async (c) => {
  const { servers } = await c.req.json()
  await headscale.updateNameServers(servers)
  return c.json({ message: 'Nameservers updated successfully' }, 200)
})

app.patch('/api/search-domains', async (c) => {
  const { domains } = await c.req.json()
  await headscale.updateSearchDomains(domains)
  return c.json({ message: 'Search domains updated successfully' }, 200)
})

app.patch('/api/tailnet-name', async (c) => {
  const { name } = await c.req.json()
  await headscale.updateTailnetName(name)
  return c.json({ message: 'Tailnet name updated successfully' }, 200)
})

app.patch('/api/magic-dns', async (c) => {
  const { magic_dns } = await c.req.json()
  await headscale.updateMagicDNS(magic_dns)
  return c.json({ message: 'Magic DNS updated successfully' }, 200)
})

// app.patch('/api/override-local-dns', async (c) => {
//   const { override_local_dns } = await c.req.json()
//   await headscale.updateOverrideLocalDNS(override_local_dns)
//   return c.json({ message: 'Override local DNS updated successfully' }, 200)
// })

app.get('/api/dns-settings', async (c) => {
  try {
    const dns_settings = await headscale.getDNSSettings()
    return c.json({ dns_settings: dns_settings })
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.get('/api/acls', async (c) => {
  try {
    const acls = await headscale.getACLs()
    return c.json({ acls })
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.patch('/api/acls', async (c) => {
  try {
    const { data } = await c.req.json()
    await headscale.updateACLs(data)
    return c.json({ message: 'ACLs updated successfully' }, 200)
  } catch (ex) {
    return c.json({ message: ex }, 500)
  }
})

app.all('/api/*', async (c) => {
  let path = c.req.path
  path = path.replace(new RegExp(`^${c.req.routePath.replace('*', '')}`), '/')
  let url = proxy_url ? proxy_url + path : c.req.url
  // add params to URL
  if (c.req.query()) url = url + '?' + new URLSearchParams(c.req.query())
  // request
  const rep = await fetch(url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  })
  if (rep.status === 101) return rep
  return new Response(rep.body, rep)
})

export default app
