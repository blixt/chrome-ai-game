import { Theme } from "@radix-ui/themes"
import { Game } from "./Game"
import { useIsDarkMode } from "./useIsDarkMode"

export default function App() {
    const isDarkMode = useIsDarkMode()
    return (
        <Theme appearance={isDarkMode ? "dark" : "light"} style={{ minHeight: "unset" }}>
            <Game />
        </Theme>
    )
}
