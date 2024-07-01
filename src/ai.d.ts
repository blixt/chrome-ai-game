declare global {
    interface Window {
        ai: {
            canCreateTextSession: () => Promise<AIModelAvailability>
            createTextSession: (options?: AITextSessionOptions) => Promise<AITextSession>
            defaultTextSessionOptions: () => Promise<AITextSessionOptions>
        }
    }
}

type AIModelAvailability = "readily" | "after-download" | "no"

interface AITextSession {
    prompt: (input: string) => Promise<string>
    // Should be ReadableStream<string> but TypeScript doesn't define the asyncIterator.
    promptStreaming: (input: string) => AsyncIterableIterator<string>
    destroy: () => void
    clone: () => AITextSession
}

interface AITextSessionOptions {
    topK?: number
    temperature?: number
}

// biome-ignore lint/style/useExportType: This makes TypeScript pick up this file.
export {}
