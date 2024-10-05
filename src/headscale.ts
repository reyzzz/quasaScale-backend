import { Config, ExtraRecord, DNSSettings } from './types'
import { load, dump } from 'js-yaml'
import { Database } from 'bun:sqlite'
import { $ } from 'bun'
const path = Bun.env.HEADSCALE_CONFIG_YAML
const db = new Database(Bun.env.HEADSCALE_SQLITE_PATH, { strict: true })
async function readConfig(): Promise<Config> {
  const fileContent = await Bun.file(path).text()
  const data = load(fileContent) as Config
  return data
}

async function addDomain(domainRecord: ExtraRecord) {
  const data = await readConfig()
  data.dns.extra_records.push(domainRecord)
  await Bun.write(path, dump(data))
}
async function updateDomain(domainRecord: ExtraRecord, index: number) {
  const data = await readConfig()
  data.dns.extra_records[index] = domainRecord
  await Bun.write(path, dump(data))
}

async function deleteDomain(index: number) {
  const data = await readConfig()
  data.dns.extra_records.splice(index, 1)
  await Bun.write(path, dump(data))
}
async function updateIPv4(id: number, IPv4: string) {
  try {
    const resp = db
      .query('SELECT * FROM nodes WHERE ipv4 = $ip;')
      .all({ ip: IPv4 })
    if (resp.length > 0) {
      return false
    }
    db.query('UPDATE nodes SET ipv4 = $ip where id = $id;').run({
      ip: IPv4,
      id: id,
    })
    return true
  } catch {
    return false
  }
}

async function updateIPv6(id: number, IPv6: string) {
  try {
    const resp = db
      .query('SELECT * FROM nodes WHERE ipv6 = $ip;')
      .all({ ip: IPv6 })
    if (resp.length > 0) {
      return false
    }
    db.query('UPDATE nodes SET ipv6 = $ip where id = $id;').run({
      ip: IPv6,
      id: id,
    })
    return true
  } catch {
    return false
  }
}

async function version(): Promise<Record<'version', string>> {
  return await $`headscale -o json version`.json()
}

async function getDNSSettings(): Promise<DNSSettings> {
  const data = await readConfig()
  return {
    tailnet_name: data.dns.base_domain,
    is_magic_dns: data.dns.magic_dns,
    name_servers: data.dns.nameservers.global,
    search_domains: data.dns.search_domains,
  }
}

async function updateNameServers(nameServers: string[]) {
  const data = await readConfig()
  data.dns.nameservers.global = nameServers
  await Bun.write(path, dump(data))
}
async function updateSearchDomains(domains: string[]) {
  const data = await readConfig()
  data.dns.search_domains = domains
  await Bun.write(path, dump(data))
}

async function updateTailnetName(name: string) {
  const data = await readConfig()
  data.dns.base_domain = name
  await Bun.write(path, dump(data))
}

async function updateMagicDNS(is_magic_dns: boolean) {
  const data = await readConfig()
  data.dns.magic_dns = is_magic_dns
  await Bun.write(path, dump(data))
}

// async function updateOverrideLocalDNS(override_local_dns: boolean) {
//   const data = await readConfig()
//   data.dns.override_local_dns = override_local_dns
//   await Bun.write(path, dump(data))
// }
export default {
  readConfig,
  addDomain,
  updateDomain,
  updateSearchDomains,
  deleteDomain,
  updateIPv4,
  updateIPv6,
  version,
  getDNSSettings,
  updateNameServers,
  updateTailnetName,
  updateMagicDNS,
}
