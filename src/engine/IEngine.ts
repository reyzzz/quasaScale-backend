import type { HeadscaleConfig } from '../types'

export interface IEngine {
  reload(): Promise<string>
  restart(): Promise<string>
  version(): Promise<Record<'version', string>>
}
