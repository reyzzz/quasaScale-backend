declare module 'bun' {
  interface Env {
    HEADSCALE_TOKEN: string
    HEADSCALE_CONFIG_YAML: string
    HEADSCALE_SQLITE_PATH: string
    QUASCALE_URL: string
    HEADSCALE_API_URL: string
    HEADSCALE_SERVICE: string
    DOCKER: boolean
    CONTAINER_NAME: string
  }
}

export interface Config {
  server_url: string
  listen_addr: string
  metrics_listen_addr: string
  grpc_listen_addr: string
  grpc_allow_insecure: boolean
  noise: Noise
  prefixes: Prefixes
  derp: Derp
  disable_check_updates: boolean
  ephemeral_node_inactivity_timeout: string
  database: Database
  acme_url: string
  acme_email: string
  tls_letsencrypt_hostname: string
  tls_letsencrypt_cache_dir: string
  tls_letsencrypt_challenge_type: string
  tls_letsencrypt_listen: string
  tls_cert_path: string
  tls_key_path: string
  log: Log
  policy: Policy
  dns: DNS
  unix_socket: string
  unix_socket_permission: string
  logtail: Logtail
  randomize_client_port: boolean
}

export interface Database {
  type: string
  sqlite: Sqlite
}

export interface Sqlite {
  path: string
}

export interface Derp {
  server: Server
  urls: string[]
  paths: any[]
  auto_update_enabled: boolean
  update_frequency: string
}

export interface Server {
  enabled: boolean
  region_id: number
  region_code: string
  region_name: string
  stun_listen_addr: string
  private_key_path: string
  automatically_add_embedded_derp_region: boolean
  ipv4: string
  ipv6: string
}

export interface DNS {
  magic_dns: boolean
  base_domain: string
  nameservers: Nameservers
  search_domains: any[]
  extra_records: any[]
  use_username_in_magic_dns: boolean
}
export interface Nameservers {
  global: string[]
  split: { [key: string]: string[] }
}
export interface ExtraRecord {
  name: string
  type: string
  value: string
  active?: boolean
}

export interface Log {
  format: string
  level: string
}

export interface Logtail {
  enabled: boolean
}

export interface Noise {
  private_key_path: string
}

export interface Policy {
  mode: string
  path: string
}

export interface Prefixes {
  v6: string
  v4: string
  allocation: string
}

export interface DNSSettings {
  tailnet_name: string
  is_magic_dns: boolean
  name_servers: string[]
  search_domains: string[]
}

type WithPrefix<T extends string> = `${T}${string}`

export interface Groups {
  [key: WithPrefix<'group:'>]: string[]
}

export interface TagOwners {
  [key: WithPrefix<'tag:'>]: string[]
}

export interface Hosts {
  [key: string]: string
}

export interface Host {
  [
    key:
      | WithPrefix<'group'>
      | WithPrefix<'tag'>
      | WithPrefix<'autogroup:'>
      | string
  ]: string
}
export interface ACL {
  action: 'accept'
  proto:
    | 'igmp'
    | 'ipv4'
    | 'ip-in-ip'
    | 'tcp'
    | 'egp'
    | 'igp'
    | 'udp'
    | 'gre'
    | 'esp'
    | 'ah'
    | 'sctp'
    | (string & {})
  src: Host[]
  dst: Host[]
}

export interface ACLConfig {
  groups: Groups
  tagOwners: TagOwners
  Hosts: Hosts
  acls: ACL[]
}
