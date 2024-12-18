import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { Headscale } from './Headscale'

if (Bun.env.HEADSCALE_API_KEY == undefined) throw 'HEADSCALE_API_KEY is not set'
if (Bun.env.QUASASCALE_FRONTEND_URLS == undefined) throw 'QUASASCALE_FRONTEND_URLS is not set'
if (Bun.env.HEADSCALE_API_URL == undefined) throw 'HEADSCALE_API_URL is not set'
const proxy_url = Bun.env.HEADSCALE_API_URL
const token = Bun.env.HEADSCALE_API_KEY
const headscale = await Headscale.Instance()
const app = new Hono().basePath('/api')
const origins = Bun.env.QUASASCALE_FRONTEND_URLS.split(',')
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
    token,
    invalidTokenMessage: 'Invalid Token',
  })
)

app.use(logger())

app.patch('/domain/:index', async (c) => {
  const body = await c.req.json()
  const index = c.req.param('index')
  await headscale.updateDomain(body.domain, parseInt(index))
  return c.json({ message: 'Domain updated successfully' }, 200)
})

app.post('/domain', async (c) => {
  const body = await c.req.json()
  await headscale.addDomain(body.domain)
  return c.json({ message: 'Domain added successfully' }, 201)
})

app.delete('/domain/:index', async (c) => {
  const index = c.req.param('index')
  await headscale.deleteDomain(parseInt(index))
  return c.json({ message: 'Domain deleted successfully' }, 204)
})

app.get('/domains', async (c) => {
  const extra_records = await headscale.getDomains()
  return c.json({ domains: extra_records }, 200)
})

app.patch('/ip/:nodeId', async (c) => {
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

app.get('/version', async (c) => {
  const resp = await headscale.version()
  return c.json(resp, 200)
})

app.post('/restart', async (c) => {
  try {
    const message = await headscale.restart()
    return c.json({ message }, 200)
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.patch('/nameservers', async (c) => {
  const { servers } = await c.req.json()
  await headscale.updateNameServers(servers)
  return c.json({ message: 'Nameservers updated successfully' }, 200)
})

app.patch('/search-domains', async (c) => {
  const { domains } = await c.req.json()
  await headscale.updateSearchDomains(domains)
  return c.json({ message: 'Search domains updated successfully' }, 200)
})

app.patch('/tailnet-name', async (c) => {
  const { name } = await c.req.json()
  await headscale.updateTailnetName(name)
  return c.json({ message: 'Tailnet name updated successfully' }, 200)
})

app.patch('/magic-dns', async (c) => {
  const { magic_dns } = await c.req.json()
  await headscale.updateMagicDNS(magic_dns)
  return c.json({ message: 'Magic DNS updated successfully' }, 200)
})

// app.patch('/api/override-local-dns', async (c) => {
//   const { override_local_dns } = await c.req.json()
//   await headscale.updateOverrideLocalDNS(override_local_dns)
//   return c.json({ message: 'Override local DNS updated successfully' }, 200)
// })

app.get('/dns-settings', async (c) => {
  try {
    const dns_settings = await headscale.getDNSSettings()
    return c.json({ dns_settings: dns_settings })
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.get('/acls', async (c) => {
  try {
    const acls = await headscale.getACLs()
    return c.json({ acls })
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.get('/nodes', async (c) => {
  try {
    const resp = await fetch(`${proxy_url}/node`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    const hnodes = await resp.json()
    const nodes = await headscale.getNodes(hnodes.nodes)
    return c.json(nodes)
  } catch (err) {
    return c.json({ message: err }, 500)
  }
})

app.patch('/acls', async (c) => {
  try {
    const { data } = await c.req.json()
    await headscale.updateACLs(data)
    const acls = await headscale.getACLs()
    return c.json({ acls }, 200)
  } catch (ex) {
    return c.json({ message: ex }, 500)
  }
})

app.all('/*', async (c) => {
  try {
    let path = c.req.path
    path = path.replace(new RegExp(`^${c.req.routePath.replace('*', '')}`), '/')
    let url = proxy_url ? proxy_url + path : c.req.url
    // add params to URL
    if (Object.keys(c.req.query()).length > 0)
      url = url + '?' + new URLSearchParams(c.req.query())
    let bodyJson = undefined
    try {
      bodyJson = await c.req.json()
    } catch { }
    c.req.raw.headers.delete('host')
    let fetchInit: RequestInit = {
      method: c.req.method,
      headers: c.req.raw.headers,
    }
    if (bodyJson !== undefined) {
      fetchInit.body = JSON.stringify(bodyJson)
    }
    // request
    const rep = await fetch(url, fetchInit)
    if (rep.status === 101) return rep
    return new Response(rep.body, rep)
  } catch (ex) {
    console.log(ex)
    return c.json({ message: 'unknown error' }, 500)
  }
})

export default {
  port: Bun.env.QUASASCALE_PORT ?? 3000,
  fetch: app.fetch,
}
