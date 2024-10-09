import type { IEngine } from './IEngine'
import { $, ShellError } from 'bun'
import systemctl from '../systemctl'
export class LocalEngine implements IEngine {
  /**
   *
   */
  constructor(private headscale_service: string) {}
  async reload(): Promise<string> {
    const pid = (await $`pidof ${this.headscale_service}`.text()).trim()
    if (pid.length) {
      await $`kill -HUP ${pid}`
      return `${this.headscale_service} reloaded`
    }
    return `${this.headscale_service} not running`
  }
  async restart(): Promise<string> {
    try {
      const resp = await systemctl.restart(this.headscale_service).text()
      if (resp === '') return `${this.headscale_service} restarted`
      else return resp
    } catch (ex) {
      if (ex instanceof ShellError) {
        throw ex.stderr
      }
      throw 'unknown error'
    }
  }
}
