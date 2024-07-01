import { Box, Button, Card, Flex, Link, Spinner, Text } from "@radix-ui/themes"
import { useEffect, useRef, useState } from "react"
import { World } from "./World"
import { DEFAULT_WORDS, canCombineWords, combineWords, emojiForWord } from "./combineWords"

export function Game() {
    const [world, setWorld] = useState<World | null>(null)
    const [uniqueWords, setUniqueWords] = useState<Set<string>>(new Set())
    const [canPlay, setCanPlay] = useState<"yes" | "needs-setup" | "no" | "loading">("loading")
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        canCombineWords().then(result => {
            setCanPlay(result)
        })
    }, [])

    useEffect(() => {
        if (!containerRef.current || canPlay !== "yes") return
        const newWorld = new World(containerRef.current)
        newWorld.onCombineWords = async (word1, word2) => {
            const result = await combineWords(word1, word2)
            if (!result) {
                throw new Error("Word combination failed")
            }
            setUniqueWords(prev => (prev.has(result) ? prev : new Set(prev).add(result)))
            return result
        }
        setWorld(newWorld)
        newWorld.begin()
        for (const word of DEFAULT_WORDS) {
            newWorld.addWord(word)
            setUniqueWords(prev => new Set(prev).add(word))
        }

        return () => {
            newWorld.destroy()
        }
    }, [canPlay])

    if (canPlay === "loading") {
        return (
            <Flex align="center" justify="center" p="2" height="100vh">
                <Spinner size="3" />
            </Flex>
        )
    }

    if (canPlay !== "yes") {
        return (
            <Flex align="center" justify="center" p="2" height="100vh">
                <Box maxWidth="400px">
                    <Card>
                        <Flex direction="column" gap="2">
                            <Text size="3">
                                {canPlay === "needs-setup"
                                    ? "Your browser has support for AI features but they are not enabled yet. You need to follow a guide to set up AI support in your browser."
                                    : "Sorry, you can't play the game with this browser, because it does not support AI functionality."}
                            </Text>
                            {canPlay === "needs-setup" && (
                                <Link
                                    href="https://docs.google.com/document/d/1VG8HIyz361zGduWgNG7R_R8Xkv0OOJ8b5C9QKeCjU0c/view#heading=h.pghp86scw27"
                                    target="_blank"
                                >
                                    Click here for setup instructions.
                                </Link>
                            )}
                        </Flex>
                    </Card>
                </Box>
            </Flex>
        )
    }

    const addWord = (word: string) => {
        if (world) {
            world.addWord(word)
            setUniqueWords(prev => new Set(prev).add(word))
        }
    }

    return (
        <Flex direction="column" p="2" gap="2" height="100vh">
            <Flex wrap="wrap" justify="center" gap="2">
                {Array.from(uniqueWords).map(word => (
                    <Button key={word} onClick={() => addWord(word)}>
                        {emojiForWord(word)} {word}
                    </Button>
                ))}
            </Flex>
            <Box ref={containerRef} flexGrow="1" />
        </Flex>
    )
}
