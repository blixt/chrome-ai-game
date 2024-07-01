interface Example {
    a: string
    b: string
    equals: string
}

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

export const DEFAULT_WORDS = ["air", "water", "earth", "fire"]

const END_OF_TURN = "<ctrl23>"

// Note: Since we have a pretty long prompt prefix, we should make sure to keep
// it constant because Chrome will detect that it's the same across multiple
// runs and finish faster this way.
const promptPrefix = shuffled(examples)
    .map(({ a, b, equals }) => serialize(a, b, equals))
    .join(END_OF_TURN)

function createPrompt(a: string, b: string): string {
    return `${promptPrefix}${END_OF_TURN}${serialize(a, b)}`
}

function shuffled<T>(array: T[]): T[] {
    const shuffledArray = [...array]
    for (let i = shuffledArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]]
    }
    return shuffledArray
}

function word(word: string): `${string}(${string})` {
    const cleaned = word.trim().toLowerCase()
    return `${cleaned}(${emojiForWord(cleaned)})`
}

function serialize(a: string, b: string, result?: string): string {
    const prefix = [a, b].join(" + ")
    return result ? `${prefix} = ${word(result)}\n` : `${prefix} =`
}

const reResult = /^\s*=*\s*([\w ]*)\(([^)]+)\)\s*([\n=])?/u

export async function combineWords(a: string, b: string): Promise<string | undefined> {
    const start = performance.now()
    const canCreate = await window.ai.canCreateTextSession()

    if (canCreate === "no") {
        throw new Error("No AI model available")
    }

    // This session will allow some randomness in the responses, meaning the
    // same combination of words could sometimes change. You could set
    // temperature to 0 to avoid this, but I think it's more fun this way.
    const session = await window.ai.createTextSession()

    const prompt = createPrompt(a, b)

    let result: string | undefined
    let emoji: string | undefined
    let lastChunk: string | undefined
    for (let attempt = 0; attempt < 5; attempt++) {
        const stream = session.promptStreaming(prompt)
        for await (const chunk of stream) {
            lastChunk = chunk
            const match = chunk.match(reResult)
            if (!match) continue
            if (match[1]) {
                result = match[1].trim()
            }
            if (match[2]) {
                emoji = match[2].trim()
            }
            if (match[3]) {
                // This means the LLM generated an unsupported character so we can safely early exit.
                console.debug("Early exiting after chunk:", JSON.stringify(chunk), "because:", JSON.stringify(match[2]))
                break
            }
        }
        // We've found a great candidate if there's a unique result with an actual emoji.
        if (result && result !== a && result !== b && emoji && !emoji.match(/\w/)) {
            break
        }
    }

    session.destroy()

    const time = performance.now() - start
    if (result) {
        const finalEmoji = emojiForWord(result, emoji)
        if (emoji !== finalEmoji) {
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
        console.warn(`Failed to combine ${a} + ${b} (got ${JSON.stringify(lastChunk)}) after ${time.toFixed(0)}ms`)
    }

    return result
}

export function emojiForWord(word: string, addIfMissing?: string): string {
    const cleaned = word.trim().toLowerCase()
    const emoji = emojis[cleaned]
    if (emoji) return emoji
    const emojiToAdd = addIfMissing?.trim()
    if (emojiToAdd) {
        emojis[cleaned] = emojiToAdd
        return emojiToAdd
    }
    return "❓"
}

export async function canCombineWords(): Promise<"yes" | "needs-setup" | "no"> {
    if (!("ai" in window) || !window.ai.canCreateTextSession || !window.ai.createTextSession) {
        console.warn("Unsupported window.ai value:", window.ai)
        return "no"
    }
    const modelAvailability = await window.ai.canCreateTextSession()
    if (modelAvailability === "readily") {
        return "yes"
    }
    console.warn("Unable to create text session:", modelAvailability)
    return "needs-setup"
}
