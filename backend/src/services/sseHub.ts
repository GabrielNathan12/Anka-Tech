import { EventEmitter } from "node:events";

export type SSEPayload =
    | { event: "start"; data: { totalRows?: number } }
    | { event: "progress"; data: { processed: number; ok: number; errors: number; last?: string } }
    | { event: "log"; data: { message: string } }
    | { event: "error"; data: { message: string } }
    | { event: "done"; data: { processed: number; ok: number; errors: number; durationMs: number } }
    | { event: "heartbeat"; data: { t: number } }

class SSEHub {
    private emitter = new EventEmitter()
    
    subscribe(jobId: string, listener: (msg: SSEPayload) => void) {
        const handler = (p: SSEPayload) => listener(p)
        this.emitter.on(jobId, handler)
        return () => this.emitter.off(jobId, handler)
    }

    publish(jobId: string, payload: SSEPayload) {
        this.emitter.emit(jobId, payload)
    }
}

export const sseHub = new SSEHub()
