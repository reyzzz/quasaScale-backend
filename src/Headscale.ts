import type {
  HeadscaleConfig,
  ExtraRecord,
  DNSSettings,
  ACLConfig,
  Groups,
  TagOwners,
  Hosts,
  HeadscaleNode,
  QuasascaleNode,
} from './types'
import { dump, load } from 'js-yaml'
import { Database } from 'bun:sqlite'
import { $ } from 'bun'
import { parse, stringify } from 'hjson'
import type { IEngine } from './engine/IEngine'
import { LocalEngine } from './engine/LocalEngine'
import { DockerEngine } from './engine/DockerEngine'

export class Headscale {
  private headscale_config_path: string
  private config: HeadscaleConfig
  private acls: ACLConfig
  private db: Database
  private static headscale: Headscale | null = null
  private engine: IEngine
  /**
   *
   */
  constructor(config: HeadscaleConfig, acls: ACLConfig) {
    if (Bun.env.DOCKER === undefined) throw new Error('DOCKER is not set')
    if (Bun.env.HEADSCALE_SQLITE_PATH === undefined)
      throw new Error('HEADSCALE_SQLITE_PATH is not set')
    if (Bun.env.HEADSCALE_ACL_PATH === undefined)
      throw new Error('HEADSCALE_ACL_PATH is not set')
    if (Bun.env.DOCKER === 'false') {
      if (
        Bun.env.HEADSCALE_SERVICE == undefined ||
        Bun.env.HEADSCALE_SERVICE == ''
      )
        throw new Error('HEADSCALE_SERVICE is not set')
      this.engine = new LocalEngine(Bun.env.HEADSCALE_SERVICE)
    } else {
      if (Bun.env.CONTAINER_NAME == undefined || Bun.env.CONTAINER_NAME == '')
        throw new Error('CONTAINER_NAME is not set')
      this.engine = new DockerEngine(Bun.env.CONTAINER_NAME)
    }
    this.headscale_config_path = Bun.env.HEADSCALE_CONFIG_PATH
    this.config = config
    this.acls = acls
    this.db = new Database(Bun.env.HEADSCALE_SQLITE_PATH, { strict: true })
  }

  public static async Instance() {
    if (this.headscale) return this.headscale
    const config = await this.readConfig()
    const acls = await this.readAcls()
    this.headscale = new Headscale(config, acls)
    return this.headscale
  }

  private static async readConfig(): Promise<HeadscaleConfig> {
    if (
      Bun.env.HEADSCALE_CONFIG_PATH == undefined ||
      Bun.env.HEADSCALE_CONFIG_PATH == ''
    )
      throw new Error('HEADSCALE_CONFIG_YAML is not set')
    const fileContent = await Bun.file(Bun.env.HEADSCALE_CONFIG_PATH).text()
    const config = load(fileContent) as HeadscaleConfig
    return config
  }

  private static async readAcls() {
    if (
      Bun.env.HEADSCALE_ACL_PATH == undefined ||
      Bun.env.HEADSCALE_ACL_PATH == ''
    )
      throw new Error('HEADSCALE_CONFIG_YAML is not set')
    const acls_text = await Bun.file(Bun.env.HEADSCALE_ACL_PATH).text()
    const acls = parse(acls_text, { keepWsc: true }) as ACLConfig
    return acls
  }

  async getDomains(): Promise<ExtraRecord[]> {
    return this.config.dns.extra_records
  }
  async addDomain(domainRecord: ExtraRecord) {
    this.config.dns.extra_records.push(domainRecord)
  }
  async updateDomain(domainRecord: ExtraRecord, index: number) {
    this.config.dns.extra_records[index] = domainRecord
  }

  async deleteDomain(index: number) {
    this.config.dns.extra_records.splice(index, 1)
  }
  async updateIPv4(id: number, IPv4: string) {
    try {
      const resp = this.db
        .query('SELECT * FROM nodes WHERE ipv4 = $ip;')
        .all({ ip: IPv4 })
      if (resp.length > 0) {
        return false
      }
      this.db.query('UPDATE nodes SET ipv4 = $ip where id = $id;').run({
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
      const resp = this.db
        .query('SELECT * FROM nodes WHERE ipv6 = $ip;')
        .all({ ip: IPv6 })
      if (resp.length > 0) {
        return false
      }
      this.db.query('UPDATE nodes SET ipv6 = $ip where id = $id;').run({
        ip: IPv6,
        id: id,
      })
      return true
    } catch {
      return false
    }
  }

  async version(): Promise<Record<'version', string>> {
    return await this.engine.version()
  }

  async getDNSSettings(): Promise<DNSSettings> {
    return {
      tailnet_name: this.config.dns.base_domain,
      is_magic_dns: this.config.dns.magic_dns,
      name_servers: this.config.dns.nameservers.global,
      search_domains: this.config.dns.search_domains,
    }
  }

  async updateNameServers(nameServers: string[]) {
    this.config.dns.nameservers.global = nameServers
  }

  async updateSearchDomains(domains: string[]) {
    this.config.dns.search_domains = domains
  }

  async updateTailnetName(name: string) {
    this.config.dns.base_domain = name
  }

  async updateMagicDNS(is_magic_dns: boolean) {
    this.config.dns.magic_dns = is_magic_dns
  }

  async getACLs() {
    return this.acls
  }

  async getNodes(hnodes: HeadscaleNode[]) {
    const nodes = this.db
      .query(
        `SELECT nodes.id as id, given_name as name, ipv4,ipv6,
           count(routes.node_id) as routes FROM nodes 
          left join routes on nodes.id = routes.node_id
          group by nodes.id;`
      )
      .all() as QuasascaleNode[]
    return nodes.map((node) => {
      const hsnode = hnodes.find((hnode) => hnode.id === node.id.toString())
      if (hsnode)
        return {
          ...node,
          online: hsnode.online,
          user: hsnode.user,
          forced_tags: hsnode.forcedTags,
          last_seen: hsnode.lastSeen,
          machine_key: hsnode.machineKey,
        }
    })
  }

  async updateACLs(data: Partial<ACLConfig>) {
    if ('acls' in data && Array.isArray(data.acls)) this.acls.acls = data.acls
    if ('groups' in data) this.acls.groups = data.groups as Groups
    if ('tagOwners' in data) this.acls.tagOwners = data.tagOwners as TagOwners
    if ('Hosts' in data) this.acls.Hosts = data.Hosts as Hosts
    await Bun.write(
      Bun.env.HEADSCALE_ACL_PATH,
      stringify(this.acls, {
        keepWsc: true,
        separator: true,
        quotes: 'all',
        space: 2,
        bracesSameLine: true,
      })
    )
    return await this.engine.reload()
  }

  async restart() {
    await Bun.write(this.headscale_config_path, dump(this.config))
    return await this.engine.restart()
  }
  // async updateOverrideLocalDNS(override_local_dns: boolean) {
  //
  //   data.dns.override_local_dns = override_local_dns
  //   await Bun.write(path, dump(data))
  // }
}
