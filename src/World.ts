import { type b2Body, b2BodyType, b2PolygonShape, b2TestOverlap, b2Vec2, b2WeldJointDef, b2World } from "@box2d/core"

// Scaling factor between Box2D units (meters) and SVG rendering space (pixels)
const SCALE = 40 // 40 pixels = 1 meter

interface Word {
    id: number
    word: string
    body: b2Body
    width: number
    height: number
}

interface Particle {
    body: b2Body
    color: string
}

export class World {
    // Box2D simulation properties for physics-based interactions.
    private world: b2World
    private words: Word[] = []
    private particles: Particle[] = []
    private nextWordId = 1

    // Rendering properties for SVG-based visualization.
    private svg: SVGSVGElement
    private width = 0
    private height = 0

    // Animation properties to manage frame updates.
    private lastTime: number | null = null
    private animationFrameId: number | null = null

    // User interaction properties to handle mouse events and word manipulation.
    private grabbedWordId: number | null = null
    private hoveredWordId: number | null = null
    private mousePosition = { x: 0, y: 0 }
    private mouseDelta = { x: 0, y: 0 }

    // Event handler for word combination, to be set by the parent component.
    public onCombineWords?: (word1: string, word2: string) => Promise<string>

    constructor(container: HTMLDivElement) {
        this.world = b2World.Create({ x: 0.0, y: 0.0 }) // Remove gravity.
        this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        this.svg.setAttribute("style", "width: 100%; height: 100%; touch-action: none;")
        container.appendChild(this.svg)

        // Create particles.
        for (let i = 0; i < 200; i++) {
            this.addParticle((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5)
        }

        // Setup event listeners.
        this.svg.addEventListener("pointerdown", this.handlePointerDown.bind(this))
        this.svg.addEventListener("pointermove", this.handlePointerMove.bind(this))
        this.svg.addEventListener("pointerup", this.handlePointerUp.bind(this))
        this.svg.addEventListener("pointerleave", this.handlePointerUp.bind(this))
        this.svg.addEventListener("contextmenu", this.handleRightClick.bind(this))
    }

    /**
     * Initiates the animation loop for the world simulation.
     * Uses requestAnimationFrame for smooth rendering and updates.
     */
    begin() {
        const tick = (time: number) => {
            if (this.lastTime !== null) {
                const deltaTime = (time - this.lastTime) / 1000 // Convert to seconds.
                this.step(deltaTime)
            }
            this.lastTime = time
            this.animationFrameId = requestAnimationFrame(tick)
        }
        this.animationFrameId = requestAnimationFrame(tick)
    }

    /**
     * Cleans up resources and stops the animation loop.
     * Removes all bodies from the world and clears the SVG.
     */
    destroy() {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId)
            this.animationFrameId = null
        }
        destroyBodies(
            this.world,
            this.words.map(w => w.body),
        )
        destroyBodies(
            this.world,
            this.particles.map(p => p.body),
        )
        this.words = []
        this.particles = []
        if (this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg)
        }
    }

    /**
     * Creates a new word object and adds it to the world.
     * @param word The text content of the word.
     * @param position Optional initial position for the word.
     * @returns The created Word object.
     */
    addWord(word: string, position?: { x: number; y: number }): Word {
        const id = this.nextWordId++
        // Estimate size based on word length (adjust as needed).
        const width = Math.max(word.length * 10, 50) / SCALE // Convert pixels to meters.
        const height = 30 / SCALE // Assuming 30px height, convert to meters.

        const body = this.world.CreateBody({
            type: b2BodyType.b2_dynamicBody,
            position: position || { x: 0, y: 0 },
            angle: Math.random() * Math.PI * 2,
        })

        body.CreateFixture({
            shape: new b2PolygonShape().SetAsBox(width / 2, height / 2),
            density: 1.0,
            friction: 0.3, // Add friction to reduce slipperiness.
            restitution: 0.1, // Add a small amount of restitution (bounciness).
        })

        // Apply linear damping to simulate air resistance.
        body.SetLinearDamping(0.5)

        if (!position) {
            placeBodyWithoutOverlap(
                body,
                this.words.map(w => w.body),
            )
        }
        const wordObject: Word = { id, word, body, width, height }
        this.words.push(wordObject)
        return wordObject
    }

    /**
     * Removes a word from the world by its ID.
     * @param id The ID of the word to remove.
     */
    removeWord(id: number) {
        const index = this.words.findIndex(w => w.id === id)
        if (index !== -1) {
            const { body } = this.words[index]
            this.world.DestroyBody(body)
            this.words.splice(index, 1)
        }
    }

    /**
     * Creates a new particle and adds it to the world.
     * @param x The x-coordinate for the particle.
     * @param y The y-coordinate for the particle.
     * @param velocity Optional initial velocity for the particle.
     * @returns The created Particle object.
     */
    private addParticle(x: number, y: number, velocity?: b2Vec2): Particle {
        const body = this.world.CreateBody({
            type: b2BodyType.b2_dynamicBody,
            position: { x, y },
            angle: Math.random() * Math.PI * 2,
        })
        body.CreateFixture({
            shape: new b2PolygonShape().SetAsBox(0.05, 0.05),
            density: 0.1,
            friction: 0.1,
            restitution: 0.1,
        })
        body.SetLinearDamping(0.5)
        if (velocity) {
            body.SetLinearVelocity(velocity)
        }

        const color = `hsl(${Math.round(Math.random() * 360)}, 100%, 75%)`
        const particle: Particle = { body, color }
        this.particles.push(particle)
        return particle
    }

    /**
     * Handles the pointer down event, initiating word grabbing.
     * @param event The PointerEvent object.
     */
    private handlePointerDown(event: PointerEvent) {
        if (event.button !== 0) return // Only handle left mouse button or touch

        const target = event.target as SVGElement
        const wordElement = target.closest("[data-word-id]")
        if (!wordElement) return

        const grabbedWordId = wordElement.getAttribute("data-word-id")
        if (!grabbedWordId) return

        this.grabbedWordId = Number.parseInt(grabbedWordId, 10)
        const word = this.words.find(w => w.id === this.grabbedWordId)
        if (!word) return

        word.body.SetType(b2BodyType.b2_kinematicBody)
        word.body.GetFixtureList()?.SetSensor(true) // Make the body a sensor to pass through other bodies.
    }

    /**
     * Handles pointer movement, updating positions and checking for word hovering.
     * @param event The PointerEvent object.
     */
    private handlePointerMove(event: PointerEvent) {
        const rect = this.svg.getBoundingClientRect()
        const newMousePosition = {
            x: (event.clientX - rect.left - this.width / 2) / SCALE,
            y: -(event.clientY - rect.top - this.height / 2) / SCALE,
        }

        // Calculate the current delta.
        const currentDelta = {
            x: newMousePosition.x - this.mousePosition.x,
            y: newMousePosition.y - this.mousePosition.y,
        }

        // Keep track of a rolling average of the mouse delta.
        this.mouseDelta = {
            x: this.mouseDelta.x * 0.8 + currentDelta.x * 0.2,
            y: this.mouseDelta.y * 0.8 + currentDelta.y * 0.2,
        }

        this.mousePosition = newMousePosition

        if (this.grabbedWordId === null) return

        // While a word is being grabbed, check for other words being hovered.
        const elements = document.elementsFromPoint(event.clientX, event.clientY)
        const hoveredWordId = elements
            .map(el => el.getAttribute("data-word-id"))
            .find(id => id && Number.parseInt(id, 10) !== this.grabbedWordId)
        if (hoveredWordId) {
            this.hoveredWordId = Number.parseInt(hoveredWordId, 10)
        } else {
            this.hoveredWordId = null
        }
    }

    /**
     * Handles the release of a grabbed word, potentially combining it with a hovered word.
     */
    private handlePointerUp(event: PointerEvent) {
        if (event.button !== 0) return // Only handle left mouse button or touch
        if (this.grabbedWordId === null) return

        const originalGrabbedId = this.grabbedWordId
        const originalHoveredId = this.hoveredWordId

        // Reset grabbed and hovered states immediately.
        this.grabbedWordId = null
        this.hoveredWordId = null

        const grabbed = this.words.find(w => w.id === originalGrabbedId)
        if (!grabbed) return

        if (originalHoveredId !== null && this.onCombineWords) {
            const hovered = this.words.find(w => w.id === originalHoveredId)
            if (hovered) {
                // Create a weld joint to fuse the words together
                const weldJointDef = new b2WeldJointDef()
                weldJointDef.Initialize(grabbed.body, hovered.body, grabbed.body.GetWorldCenter())
                const weldJoint = this.world.CreateJoint(weldJointDef)

                // Start the combination process in parallel.
                this.onCombineWords(grabbed.word, hovered.word)
                    .then(newWord => {
                        const grabbed = this.words.find(w => w.id === originalGrabbedId)
                        const hovered = this.words.find(w => w.id === originalHoveredId)

                        let position: { x: number; y: number } | undefined

                        if (grabbed && hovered) {
                            position = {
                                x: (grabbed.body.GetPosition().x + hovered.body.GetPosition().x) / 2,
                                y: (grabbed.body.GetPosition().y + hovered.body.GetPosition().y) / 2,
                            }
                            this.removeWord(originalGrabbedId)
                            this.removeWord(originalHoveredId)
                        } else if (grabbed) {
                            position = grabbed.body.GetPosition()
                            this.removeWord(originalGrabbedId)
                        } else if (hovered) {
                            position = hovered.body.GetPosition()
                            this.removeWord(originalHoveredId)
                        }

                        this.addWord(newWord, position)
                    })
                    .catch(error => {
                        console.error("Word combination failed:", error)
                        // Remove the weld joint if combination fails
                        this.world.DestroyJoint(weldJoint)
                    })
            }
        }

        // Apply physics to the released word.
        grabbed.body.SetType(b2BodyType.b2_dynamicBody)
        grabbed.body.GetFixtureList()?.SetSensor(false) // Make the body solid again.

        // Calculate and apply velocity based on average mouse delta.
        const velocity = new b2Vec2(
            this.mouseDelta.x / (1 / 60), // Assuming 60 FPS.
            this.mouseDelta.y / (1 / 60),
        )
        grabbed.body.SetLinearVelocity(velocity)

        // Apply a small random angular velocity.
        const randomAngularVelocity = (Math.random() - 0.5) * 2
        grabbed.body.SetAngularVelocity(randomAngularVelocity)

        // Reset the mouse delta after releasing the word.
        this.mouseDelta = { x: 0, y: 0 }
    }

    /**
     * Handles right-click events on words, removing the clicked word and creating an explosion effect.
     */
    private handleRightClick(event: MouseEvent) {
        event.preventDefault()
        const target = event.target as SVGElement
        const wordElement = target.closest("[data-word-id]")
        if (!wordElement) return

        const wordId = Number.parseInt(wordElement.getAttribute("data-word-id") ?? "", 10)
        if (Number.isNaN(wordId)) return

        const clicked = this.words.find(w => w.id === wordId)
        if (!clicked) return

        const position = clicked.body.GetPosition()

        // Remove the word.
        this.removeWord(wordId)

        // Update existing particles for explosion effect.
        const particlesToUpdate = Math.min(25, this.particles.length)
        for (let i = 0; i < particlesToUpdate; i++) {
            const randomIndex = Math.floor(Math.random() * this.particles.length)
            const particle = this.particles[randomIndex]
            const angle = Math.random() * Math.PI * 2
            const speed = 50 + Math.random() * 50
            const velocity = new b2Vec2(Math.cos(angle) * speed, Math.sin(angle) * speed)
            particle.body.SetTransformVec(new b2Vec2(position.x, position.y), 0)
            particle.body.SetLinearVelocity(velocity)
        }
    }

    /**
     * Advances the simulation by one time step, updating physics and rendering.
     */
    step(deltaTime: number) {
        this.applyForces()
        this.world.Step(deltaTime, { velocityIterations: 8, positionIterations: 3 })
        this.updateGrabbedWord()
        this.updateHoveredWord()
        this.render()
    }

    /**
     * Applies centering forces to words and particles to keep them within the visible area.
     */
    private applyForces() {
        const applyForceToBody = (body: b2Body, forceFactor: number) => {
            const position = body.GetPosition()
            const centerForce = new b2Vec2(-position.x * forceFactor, -position.y * forceFactor)
            body.ApplyForceToCenter(centerForce, true)
        }

        for (const word of this.words) {
            if (word.id !== this.grabbedWordId && word.id !== this.hoveredWordId) {
                applyForceToBody(word.body, 10)
            }
        }
        for (const particle of this.particles) {
            applyForceToBody(particle.body, 0.005)
        }
    }

    /**
     * Updates the position and rotation of the currently grabbed word to follow the mouse.
     */
    private updateGrabbedWord() {
        if (this.grabbedWordId === null) return

        const grabbed = this.words.find(w => w.id === this.grabbedWordId)
        if (!grabbed) return

        grabbed.body.SetTransformVec(new b2Vec2(this.mousePosition.x, this.mousePosition.y), grabbed.body.GetAngle())
        grabbed.body.SetLinearVelocity(new b2Vec2(0, 0))
        grabbed.body.SetAngularVelocity(0)

        // Rotate the body 10% towards being upright.
        const currentAngle = grabbed.body.GetAngle() % (2 * Math.PI)
        let d = -currentAngle
        d = d > Math.PI ? d - 2 * Math.PI : d < -Math.PI ? d + 2 * Math.PI : d
        grabbed.body.SetTransformVec(grabbed.body.GetPosition(), currentAngle + d * 0.1)
    }

    /**
     * Applies an attractive force to the hovered word, pulling it towards the grabbed word.
     */
    private updateHoveredWord() {
        if (this.hoveredWordId === null || this.grabbedWordId === null) return

        const hovered = this.words.find(w => w.id === this.hoveredWordId)
        if (!hovered) return

        const position = hovered.body.GetPosition()
        const toMouse = new b2Vec2(this.mousePosition.x - position.x, this.mousePosition.y - position.y)
        toMouse.Normalize()
        toMouse.Scale(5) // Adjust this value to change the strength of the attraction
        hovered.body.ApplyForceToCenter(toMouse, true)
    }

    /**
     * Renders the current state of the world, including words and particles.
     */
    private render() {
        this.svg.innerHTML = "" // Clear previous content.

        // Create drop shadow filter only when a word is being dragged.
        if (this.grabbedWordId !== null) {
            const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
            const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter")
            filter.setAttribute("id", "drop-shadow")
            filter.innerHTML = `
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="2" dy="2" result="offsetblur"/>
                <feFlood flood-color="rgba(0,0,0,0.5)"/>
                <feComposite in2="offsetblur" operator="in"/>
                <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            `
            defs.appendChild(filter)
            this.svg.appendChild(defs)
        }

        const svgRect = this.svg.getBoundingClientRect()
        this.width = svgRect.width
        this.height = svgRect.height

        for (const particle of this.particles) {
            this.renderBody(particle.body, { fill: particle.color })
        }

        // Render non-grabbed words.
        for (const word of this.words) {
            if (word.id === this.grabbedWordId) continue
            this.renderBody(word.body, {
                fill: word.id === this.hoveredWordId ? "yellow" : "white",
                label: word.word,
                cursor: "grab",
                stroke: "black",
                isGrabbed: false,
                wordId: word.id,
            })
        }

        // Render grabbed word last to ensure it's on top.
        if (this.grabbedWordId !== null) {
            const grabbed = this.words.find(w => w.id === this.grabbedWordId)
            if (grabbed) {
                this.renderBody(grabbed.body, {
                    fill: this.hoveredWordId !== null ? "yellow" : "white",
                    label: grabbed.word,
                    cursor: "grabbing",
                    stroke: "black",
                    isGrabbed: true,
                    wordId: grabbed.id,
                })
            }
        }
    }

    /**
     * Renders a single body (word or particle) to the SVG canvas.
     */
    private renderBody(body: b2Body, options: RenderBodyOptions) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
        const position = body.GetPosition()
        const x = position.x * SCALE + this.width / 2
        const y = -position.y * SCALE + this.height / 2
        g.setAttribute("transform", `translate(${x}, ${y})`)
        const rotate = (options.rotate ?? 0) + body.GetAngle()
        renderBox(g, body, { ...options, rotate })
        this.svg.appendChild(g)
    }
}

function placeBodyWithoutOverlap(body: b2Body, existingBodies: b2Body[]) {
    let i = 0
    let radius = 1
    const maxAttempts = 1000
    while (checkOverlap(body, existingBodies)) {
        const angle = Math.random() * Math.PI * 2
        body.SetTransformVec({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }, Math.random() * Math.PI * 2)
        i++
        if (i % 20 === 0) {
            radius *= 1.1
        }
        if (i >= maxAttempts) {
            console.warn(`Failed to place word after ${maxAttempts} attempts.`)
            break
        }
    }
}

function checkOverlap(newBody: b2Body, existingBodies: b2Body[]): boolean {
    for (const existingBody of existingBodies) {
        const newFixture = newBody.GetFixtureList()
        const existingFixture = existingBody.GetFixtureList()
        if (newFixture && existingFixture) {
            if (
                b2TestOverlap(
                    newFixture.GetShape(),
                    0,
                    existingFixture.GetShape(),
                    0,
                    newBody.GetTransform(),
                    existingBody.GetTransform(),
                )
            ) {
                return true
            }
        }
    }
    return false
}

interface RenderBodyOptions {
    fill: string
    label?: string
    cursor?: string
    stroke?: string
    strokeWidth?: string
    isGrabbed?: boolean
    rotate?: number
    wordId?: number
}

function renderBox(g: SVGGElement, body: b2Body, options: RenderBodyOptions) {
    const fixture = body.GetFixtureList()
    if (!fixture) return
    const shape = fixture.GetShape() as b2PolygonShape
    const vertex = shape.m_vertices[0]
    const boxWidth = Math.abs(vertex.x * 2) * 40
    const boxHeight = Math.abs(vertex.y * 2) * 40

    const scale = options.isGrabbed ? 1.1 : 1
    const transform =
        options.rotate !== undefined
            ? `rotate(${(-options.rotate * 180) / Math.PI}) scale(${scale})`
            : `scale(${scale})`

    const rect = createSvgElement(g, "rect", {
        x: `${-boxWidth / 2}`,
        y: `${-boxHeight / 2}`,
        width: `${boxWidth}`,
        height: `${boxHeight}`,
        fill: options.fill,
        stroke: options.stroke,
        "stroke-width": options.strokeWidth || "1",
        cursor: options.cursor,
        transform,
        "data-word-id": options.wordId?.toString(),
    })

    if (options.isGrabbed) {
        rect.setAttribute("filter", "url(#drop-shadow)")
    }

    if (options.label) {
        createSvgElement(
            g,
            "text",
            {
                x: "0",
                y: "0",
                "text-anchor": "middle",
                "dominant-baseline": "central",
                "font-size": "14",
                "font-weight": "bold",
                cursor: options.cursor || "default",
                transform,
                "pointer-events": "none",
            },
            options.label,
        )
    }
}

function createSvgElement(
    parent: SVGElement,
    type: string,
    attributes: Record<string, string | undefined>,
    textContent?: string,
) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", type)
    for (const [key, value] of Object.entries(attributes)) {
        if (value === undefined) continue
        element.setAttribute(key, value)
    }
    if (textContent) element.textContent = textContent
    parent.appendChild(element)
    return element
}

function destroyBodies(world: b2World, bodies: Iterable<b2Body>) {
    for (const body of bodies) {
        world.DestroyBody(body)
    }
}
