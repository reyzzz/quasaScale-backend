import type { IEngine } from './IEngine'
import type { ContainerInfo } from 'dockerode'
import { FetchError, ofetch, type $Fetch } from 'ofetch'
export class DockerEngine implements IEngine {
  private container_id: string | null = null
  private docker: $Fetch
  constructor(private container_name: string) {
    this.docker = ofetch.create({
      baseURL: 'http://localhost',
      // @ts-expect-error no unix key
      unix: '/var/run/docker.sock',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
  async reload(): Promise<string> {
    const container_id = await this.getContainerId(this.container_name)
    if (container_id) {
      try {
        const resp = await this.docker(
          `/containers/${container_id}/kill?signal=SIGHUP`,
          {
            method: 'POST',
          }
        )
        if (resp.status === 204) {
          return 'container reloaded successfully'
        }
        return 'failed to reload container'
      } catch (ex) {
        if (ex instanceof FetchError) {
          throw ex.message
        }
      }
    }
    return 'failed to get container id'
  }
  async restart(): Promise<string> {
    const container_id = await this.getContainerId(this.container_name)
    if (container_id) {
      try {
        const resp = await this.docker(`/containers/${container_id}/restart`, {
          method: 'POST',
        })
        if (resp.status === 204) {
          return 'container restarted successfully'
        }
        return 'failed to restart container'
      } catch (ex) {
        if (ex instanceof FetchError) {
          throw ex.message
        }
      }
    }
    return 'failed to get container id'
  }

  private async getContainerId(container_name: string) {
    if (this.container_id) return this.container_id
    const data = await this.docker<ContainerInfo[]>(
      `/containers/json?filters={"name":["${container_name}"]}`
    )
    if (data.length) this.container_id = data[0].Id
    return this.container_id
  }

  async version(): Promise<Record<'version', string>> {
    const execId = await this.createExecInstance()
    const version = await this.startExecInstance(execId)
    return version
  }

  async createExecInstance() {
    const execId = await this.docker(`/containers/${this.container_name}/exec`, {
      method: 'POST',
      body: JSON.stringify(
        {
          "AttachStdout": true,
          "Tty": true,
          "Cmd": ["headscale", "-o", "json", "version"]
        }
      )
    })
    return execId.Id
  }

  async startExecInstance(execId: string) {
    const resp = await this.docker(`/exec/${execId}/start`, {
      method: 'POST',
      body: JSON.stringify({
        "Detach": false,
        "Tty": true,
      })
    })
    return JSON.parse(await resp.text())
  }
}
