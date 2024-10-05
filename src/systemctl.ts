import { $, ShellPromise } from 'bun'
export function run(cmd: string, service_name: string): ShellPromise {
  return $`systemctl ${cmd} ${service_name}`
}

export function daemonReload() {
  return $`systemctl daemon-reload`
}

export function disable(serviceName: string) {
  return run('disable', serviceName)
}

export function enable(serviceName: string) {
  return run('enable', serviceName)
}

export async function isEnabled(serviceName: string) {
  const result = await run('is-enabled', serviceName).text()
  return result === 'enabled'
}

export function restart(serviceName: string) {
  return run('restart', serviceName)
}

export function start(serviceName: string) {
  return run('start', serviceName)
}

export function stop(serviceName: string) {
  return run('stop', serviceName)
}

export async function status(serviceName: string) {
  return await run('is-active', serviceName).text()
}

export default {
  daemonReload,
  disable,
  enable,
  isEnabled,
  restart,
  start,
  stop,
  status,
}
