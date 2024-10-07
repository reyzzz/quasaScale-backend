import {
  Config,
  ExtraRecord,
  DNSSettings,
  Groups,
  ACLConfig,
  TagOwners,
  Hosts,
  ACL,
} from './types'
import { load, dump } from 'js-yaml'
import { Database } from 'bun:sqlite'
import { $ } from 'bun'
import { parse, stringify } from 'hjson'
import systemctl from './systemctl'

export class Headscale {
  private HEADSCALE_SERVICE: string
  private IS_DOCKER: boolean
  private CONTAINER_NAME: string
  private CONFIG_PATH: string
  private config: Config | null = null
  private acls: ACLConfig | null = null
  private static headscale: Headscale | null = null
  /**
   *
   */
  private constructor() {
    if (Bun.env.DOCKER == undefined) throw new Error('DOCKER is not set')
    if (Bun.env.DOCKER == false) {
      if (
        Bun.env.HEADSCALE_SERVICE == undefined ||
        Bun.env.HEADSCALE_SERVICE == ''
      )
        throw new Error('HEADSCALE_SERVICE is not set')
    } else {
      if (Bun.env.CONTAINER_NAME == undefined || Bun.env.CONTAINER_NAME == '')
        throw new Error('CONTAINER_NAME is not set')
    }
    if (
      Bun.env.HEADSCALE_CONFIG_YAML == undefined ||
      Bun.env.HEADSCALE_CONFIG_YAML == ''
    )
      throw new Error('HEADSCALE_CONFIG_YAML is not set')

    this.HEADSCALE_SERVICE = Bun.env.HEADSCALE_SERVICE
    this.IS_DOCKER = Bun.env.DOCKER
    this.CONTAINER_NAME = Bun.env.CONTAINER_NAME
    this.CONFIG_PATH = Bun.env.HEADSCALE_CONFIG_YAML
  }

  public static Instance() {
    if (this.headscale) return this.headscale
    return new Headscale()
  }

  private async readConfig() {
    if (this.config) return this.config
    const fileContent = await Bun.file(this.CONFIG_PATH).text()
    this.config = load(fileContent) as Config
    return this.config
  }

  private async applyACLs() {
    const config = await this.readConfig()
    const acls = await this.readAcls()
    await Bun.write(
      config.policy.path,
      stringify(acls, {
        keepWsc: true,
        separator: true,
        quotes: 'all',
        space: 2,
        bracesSameLine: true,
      })
    )
    await this.reload()
  }

  private async readAcls() {
    if (this.acls) return this.acls
    const config = await this.readConfig()
    const acls = await Bun.file(config.policy.path).text()
    this.acls = parse(acls, { keepWsc: true }) as ACLConfig
    return this.acls
  }

  async getDomains(): Promise<ExtraRecord[]> {
    const config = await this.readConfig()
    return config.dns.extra_records
  }
  async addDomain(domainRecord: ExtraRecord) {
    const config = await this.readConfig()
    config.dns.extra_records.push(domainRecord)
  }
  async updateDomain(domainRecord: ExtraRecord, index: number) {
    const config = await this.readConfig()
    config.dns.extra_records[index] = domainRecord
  }

  async deleteDomain(index: number) {
    const config = await this.readConfig()
    config.dns.extra_records.splice(index, 1)
  }
  async updateIPv4(id: number, IPv4: string) {
    try {
      const config = await this.readConfig()
      const db = new Database(config.database.sqlite.path, { strict: true })
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

  async updateIPv6(id: number, IPv6: string) {
    try {
      const config = await this.readConfig()
      const db = new Database(config.database.sqlite.path, { strict: true })
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

  async version(): Promise<Record<'version', string>> {
    return await $`headscale -o json version`.json()
  }

  async getDNSSettings(): Promise<DNSSettings> {
    const config = await this.readConfig()
    return {
      tailnet_name: config.dns.base_domain,
      is_magic_dns: config.dns.magic_dns,
      name_servers: config.dns.nameservers.global,
      search_domains: config.dns.search_domains,
    }
  }

  async updateNameServers(nameServers: string[]) {
    const config = await this.readConfig()
    config.dns.nameservers.global = nameServers
  }

  async updateSearchDomains(domains: string[]) {
    const config = await this.readConfig()
    config.dns.search_domains = domains
  }

  async updateTailnetName(name: string) {
    const config = await this.readConfig()
    config.dns.base_domain = name
  }

  async updateMagicDNS(is_magic_dns: boolean) {
    const config = await this.readConfig()
    config.dns.magic_dns = is_magic_dns
  }

  async getACLs() {
    const acls = await this.readAcls()
    return acls
  }

  async updateACLs(data: Partial<ACLConfig>) {
    const acls = await this.readAcls()
    if (Array.isArray(data) && 'acls' in data) acls.acls = data.acls as ACL[]
    else if ('groups' in data) acls.groups = data.groups as Groups
    else if ('tagOwners' in data) acls.tagOwners = data.tagOwners as TagOwners
    else if ('Hosts' in data) acls.Hosts = data.Hosts as Hosts
    await this.applyACLs()
  }

  async reload() {
    const pid = (await $`pidof ${this.HEADSCALE_SERVICE}`.text()).trim()
    if (pid.length) {
      await $`kill -HUP ${pid}`
      return `${this.HEADSCALE_SERVICE} reloaded`
    }
    return `${this.HEADSCALE_SERVICE} not running`
  }
  async restart() {
    const config = await this.readConfig()
    await Bun.write(this.CONFIG_PATH, dump(config))
    if (this.IS_DOCKER) {
      await $`docker exec ${this.CONTAINER_NAME} service ${this.HEADSCALE_SERVICE} restart`
    } else await systemctl.restart(this.HEADSCALE_SERVICE)
    return `${this.HEADSCALE_SERVICE} restarted`
  }
  // async updateOverrideLocalDNS(override_local_dns: boolean) {
  //
  //   data.dns.override_local_dns = override_local_dns
  //   await Bun.write(path, dump(data))
  // }
}
