const SYSTEM_PROMPT = [
    "Your task is to creatively combine two words into another new word.",
    "This is for an exploration game, so be creative and there are no wrong answers.",
    "Always respond with a word followed by the most illustrative emoji for that word in parentheses.",
].join(" ")

export const DEFAULT_WORDS = ["air", "water", "earth", "fire"]

interface Example {
    a: string
    b: string
    equals: string
}

// Set up some fairly obvious combinations to "train" the model.
const examples: Example[] = [
    // Physical processes
    { a: "water", b: "fire", equals: "steam" },
    { a: "fire", b: "water", equals: "steam" },
    { a: "steam", b: "steam", equals: "mist" },
    { a: "earth", b: "water", equals: "mud" },
    { a: "mist", b: "earth", equals: "plant" },
    { a: "steam", b: "earth", equals: "plant" },
    { a: "earth", b: "fire", equals: "lava" },
    { a: "sand", b: "fire", equals: "glass" },
    { a: "fire", b: "tree", equals: "charcoal" },
    // Scaling concepts
    { a: "fire", b: "fire", equals: "star" },
    { a: "water", b: "water", equals: "lake" },
    { a: "lake", b: "lake", equals: "ocean" },
    { a: "ocean", b: "earth", equals: "planet" },
    { a: "cloud", b: "planet", equals: "sky" },
    { a: "sky", b: "sky", equals: "space" },
    { a: "plant", b: "plant", equals: "tree" },
    { a: "tree", b: "tree", equals: "forest" },
    { a: "star", b: "planet", equals: "space" },
    // Logical deduction
    { a: "air", b: "mist", equals: "cloud" },
    { a: "air", b: "water", equals: "rain" },
    { a: "heat", b: "forest", equals: "jungle" },
    { a: "water", b: "cold", equals: "ice" },
    { a: "sun", b: "plant", equals: "growth" },
    { a: "rain", b: "sun", equals: "rainbow" },
    // Abstractions
    { a: "energy", b: "water", equals: "life" },
    { a: "life", b: "time", equals: "death" },
    { a: "small", b: "infinity", equals: "time" },
    { a: "knowledge", b: "experience", equals: "wisdom" },
    { a: "imagination", b: "reality", equals: "dream" },
    { a: "emotion", b: "logic", equals: "balance" },
    { a: "tree", b: "time", equals: "growth" },
    { a: "rainbow", b: "emotion", equals: "joy" },
    // Relative terms
    { a: "small", b: "big", equals: "size" },
    { a: "heat", b: "cold", equals: "opposite" },
    { a: "opposite", b: "opposite", equals: "same" },
    { a: "opposite", b: "heat", equals: "cold" },
    { a: "fast", b: "slow", equals: "speed" },
    { a: "light", b: "dark", equals: "contrast" },
    { a: "high", b: "low", equals: "elevation" },
    { a: "ground", b: "sky", equals: "low" },
    { a: "sky", b: "ground", equals: "high" },
    // Rabbit hole combinations
    { a: "tree", b: "wind", equals: "stick" },
    { a: "stick", b: "water", equals: "fishing rod" },
    { a: "fishing rod", b: "water", equals: "salmon" },
    { a: "salmon", b: "waterfall", equals: "bear" },
    { a: "bear", b: "bear", equals: "honey" },
    { a: "honey", b: "honey", equals: "bee" },
    { a: "bee", b: "honey", equals: "flower" },
]

const emojis: { [key: string]: string } = {
    air: "💨",
    balance: "⚖️",
    bear: "🐻",
    bee: "🐝",
    big: "🔭",
    charcoal: "🪵",
    cloud: "☁️",
    cold: "❄️",
    contrast: "🎭",
    dark: "🌑",
    death: "💀",
    dream: "💭",
    earth: "🌎",
    elevation: "📏",
    emotion: "😢",
    energy: "⚡",
    experience: "🧠",
    fast: "🏎️",
    fire: "🔥",
    "fishing rod": "🎣",
    flower: "🌸",
    forest: "🌲",
    glass: "🥃",
    ground: "🌎",
    growth: "🌱",
    heat: "🔥",
    high: "🏔️",
    honey: "🍯",
    ice: "🧊",
    imagination: "🌈",
    infinity: "♾️",
    joy: "😊",
    jungle: "🌴",
    knowledge: "📚",
    lake: "🏞️",
    lava: "🌋",
    life: "🧬",
    light: "💡",
    logic: "🧠",
    low: "🏞️",
    mist: "🌫️",
    mud: "🥾",
    ocean: "🌊",
    opposite: "🔄",
    planet: "🪐",
    plant: "🌱",
    rain: "🌧️",
    rainbow: "🌈",
    reality: "🌍",
    salmon: "🐟",
    same: "🟰",
    sand: "🏖️",
    size: "📏",
    sky: "🌌",
    slow: "🐢",
    small: "🔬",
    space: "🌠",
    speed: "⏱️",
    star: "⭐",
    steam: "💨",
    stick: "🥢",
    sun: "☀️",
    time: "⏳",
    tree: "🌳",
    water: "💧",
    waterfall: "💦",
    wind: "💨",
    wisdom: "🦉",
}

function shuffled<T>(array: T[]): T[] {
    const shuffledArray = [...array]
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]
    }
    return shuffledArray
}

function clean(word: string): string {
    return word.trim().toLowerCase()
}

function cleanEmoji(emoji: string): string {
    return emoji.trim().replaceAll(reAllNonEmoji, "")
}

function serializeUserPrompt(a: string, b: string): string {
    return `Combine "${clean(a)}" and "${clean(b)}".\n`
}

function serializeAssistantResponse(a: string, b: string, equals: string, emoji?: string): string {
    const cleaned = clean(equals)
    return `${clean(a)} + ${clean(b)} = ${cleaned} (${emojiForWord(cleaned, emoji)})! Ready for next word pair.`
}

function createExamplePrompts(): (AIAssistantUserPrompt | AIAssistantAssistantPrompt)[] {
    return shuffled(examples).flatMap(({ a, b, equals }) => [
        { role: "user", content: serializeUserPrompt(a, b) },
        { role: "assistant", content: serializeAssistantResponse(a, b, equals) },
    ])
}

const reParseAssistantResponse = /^[^=]+=[^\p{L}\p{N}]*([\p{L}\p{N} ]*)[^(\n]*\(([^)]+)\)/u
// Keeping ZWJ and VS16 characters to support combination emoji.
const reAllNonEmoji = /[^\p{Emoji}\p{Emoji_Presentation}\uFE0F\u200D]+/gv

let baseAssistant: AIAssistant | undefined

export async function combineWords(a: string, b: string): Promise<string | undefined> {
    const start = performance.now()
    const capabilities = await window.ai.assistant.capabilities()

    if (capabilities.available === "no") {
        throw new Error("No AI model available")
    }

    const abortController = new AbortController()
    const signal = AbortSignal.any([abortController.signal, AbortSignal.timeout(10_000)])

    if (!baseAssistant) {
        // This config will allow some randomness in the responses, meaning the
        // same combination of words could sometimes change. You could set
        // temperature to 0 to avoid this, but I think it's more fun this way.
        baseAssistant = await window.ai.assistant.create({
            initialPrompts: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                },
                ...createExamplePrompts(),
            ],
        })
    }

    // Clone the base assistant to make sure we always have the same message
    // history, which leverages the token cache in the browser.
    const assistant = await baseAssistant.clone({ signal })

    let prompt = serializeUserPrompt(a, b)
    let result: string | undefined
    let emoji: string | undefined
    let lastOutput: string | undefined
    for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt === 1) {
            // If the first attempt was wrong, try again with a slightly different prompt.
            prompt = `That wasn't quite right. Please answer in the format: "${serializeAssistantResponse("this", "that", "something", "🤷🏼")}" and you must reply with a word and an emoji. Let's try again!\n${prompt}`
        }
        const streamAbortController = new AbortController()
        const streamSignal = AbortSignal.any([streamAbortController.signal, signal])
        // The ReadableStream<string> type is not typed to support async iteration.
        type IterableStream<T> = ReadableStream<T> & AsyncIterable<T>
        const stream = assistant.promptStreaming(prompt, { signal: streamSignal }) as unknown as IterableStream<string>
        // Note: This is not a typical stream of chunks; instead each read will
        // receive the concatenation of the old data plus the new data.
        for await (const output of stream) {
            lastOutput = output
            const match = output.match(reParseAssistantResponse)
            if (!match) continue
            if (match[1]) {
                result = match[1].trim()
            }
            if (match[2]) {
                emoji = cleanEmoji(match[2])
                streamAbortController.abort()
                break
            }
        }
        // We've found a great candidate if there's a unique result with an actual emoji.
        if (result && result !== a && result !== b && emoji) {
            break
        }
    }

    abortController.abort()
    assistant.destroy()

    const time = performance.now() - start
    if (result) {
        const finalEmoji = emojiForWord(result, emoji)
        if (emoji !== finalEmoji) {
            // Note: If it looks as if this shows the same emoji twice, that's
            // probably because there's an invisible variant selector character
            // in one of them.
            console.debug(
                "Chrome wanted emoji",
                JSON.stringify(emoji),
                "instead of pre-existing",
                JSON.stringify(finalEmoji),
            )
        }
        const cardStyle =
            "background: white; color: black; font-weight: bold; padding: 2px 4px 1px; border: 1px solid black;"
        console.info(
            `Combined %c${emojiForWord(a)} ${a}%c + %c${emojiForWord(b)} ${b}%c into %c${finalEmoji} ${result}%c in ${time.toFixed(0)}ms`,
            cardStyle,
            "",
            cardStyle,
            "",
            cardStyle,
            "",
        )
    } else {
        console.warn(`Failed to combine ${a} + ${b} (got ${JSON.stringify(lastOutput)}) after ${time.toFixed(0)}ms`)
    }

    return result
}

export function emojiForWord(word: string, addIfMissing?: string): string {
    const cleaned = clean(word)
    const emoji = emojis[cleaned]
    if (emoji) return emoji
    const emojiToAdd = addIfMissing ? cleanEmoji(addIfMissing) : undefined
    if (emojiToAdd) {
        emojis[cleaned] = emojiToAdd
        return emojiToAdd
    }
    return "❓"
}

export async function canCombineWords(): Promise<"yes" | "needs-setup" | "no"> {
    if (!("ai" in window) || !window.ai.assistant) {
        console.warn("Unsupported window.ai value:", window.ai)
        return "no"
    }
    const capabilities = await window.ai.assistant.capabilities()
    if (capabilities.available === "readily") {
        return "yes"
    }
    console.warn("Unable to create AI assistant:", capabilities.available)
    return "needs-setup"
}
