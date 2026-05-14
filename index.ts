import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import pool from "./pg.ts"
import loginRouter from "./Routers/usersRouter.ts"
import { getRandomLocation } from "./locations.ts"
import askAI from "./utils/askAI.ts"
import getAPIKey from "./utils/getAPIKey.ts"
import updateRatings from "./utils/updateRating.ts"

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: { origin: "*" }
})

app.use(cors())
app.use(express.json())
app.use("/users", loginRouter)
app.get("/", (req, res) => {
    res.json({ ok: true })
})

type User = {
    id: number,
    name: string,
    pass: string,
    rating: number
}

type playerInfo = {
    name: string,
    rating: number
}

type Room = {
    id: string,
    killer: playerInfo | null,
    bodyguard: playerInfo | null,
    killerText: string | null,
    bodyguardText: string | null,
    location: string,
    winner: "killer" | "bodyguard" | "nowinner",
    aiOtvet: string
}

let rooms: Room[] = []

io.on("connection", async (socket) => {
    const name = socket.handshake.query.name as string
    const pass = socket.handshake.query.pass as string

    const searchUser = await pool.query(
        "SELECT * FROM killvasyausers WHERE name = $1 AND pass = $2",
        [name, pass]
    )
    let user: User | null = null
    if (searchUser.rows.length > 0) {
        user = searchUser.rows[0]
        console.log("Подключился:", user.name, "Рейтинг:", user.rating)
    }
    socket.data.user = user
    socket.emit("roomsList", rooms)

    socket.on("createRoom", async (data) => {
        if (!socket.data.user) return

        if (data.role !== "killer" && data.role !== "bodyguard") return

        const player: playerInfo = {
            name: socket.data.user.name,
            rating: socket.data.user.rating
        }
        const newRoom: Room = {
            id: Date.now().toString(),
            killer: data.role === "killer" ? player : null,
            bodyguard: data.role === "bodyguard" ? player : null,
            bodyguardText: null,
            killerText: null,
            location: getRandomLocation(),
            winner: "nowinner",
            aiOtvet: ""
        }
        rooms.push(newRoom)
        io.emit("roomsList", rooms)

        socket.join(newRoom.id)
        socket.emit("openRoom", newRoom.id)
    })

    socket.on("joinRoom", async (roomId) => {
        if (!socket.data.user) return

        const currentRoom = rooms.find(room => room.id === roomId)
        if (!currentRoom) return

        socket.join(currentRoom.id)
        const player: playerInfo = {
            name: socket.data.user.name,
            rating: socket.data.user.rating
        }
        if (currentRoom.killer === null) {
            currentRoom.killer = player
        } else if (currentRoom.bodyguard === null) {
            currentRoom.bodyguard = player
        } else {
            socket.emit("error", "Комната заполнена")
            return
        }
        socket.emit("openRoom", roomId)
        io.emit("roomsList", rooms)
    })

    socket.on("sendMessage", async (data: { messageText: string, roomId: string }) => {
        if (!socket.data.user) return
        if (data.messageText.trim().length === 0) return

        const currentRoom = rooms.find(r => r.id === data.roomId)
        if (!currentRoom) return

        if (currentRoom.killer?.name === socket.data.user.name) {
            if (currentRoom.killerText !== null) return
            currentRoom.killerText = data.messageText
        }
        else if (currentRoom.bodyguard?.name === socket.data.user.name) {
            if (currentRoom.killerText === null) return
            if (currentRoom.bodyguardText !== null) return
            currentRoom.bodyguardText = data.messageText
        }
        else {
            return
        }
        io.emit("roomsList", rooms)

        if (currentRoom.killerText !== null && currentRoom.bodyguardText !== null) {
            const aiOtvet = await askAI(
                currentRoom.killerText,
                currentRoom.bodyguardText,
                currentRoom.location,
                getAPIKey()
            )

            if (typeof aiOtvet === "string") {
                currentRoom.aiOtvet = aiOtvet
            } else {
                currentRoom.winner = aiOtvet.winner
                currentRoom.aiOtvet = aiOtvet.description

                if (currentRoom.killer && currentRoom.bodyguard) {
                    const isKillerWin = currentRoom.winner === "killer"

                    const newRatings = updateRatings(
                        isKillerWin ? currentRoom.killer.rating : currentRoom.bodyguard.rating,
                        isKillerWin ? currentRoom.bodyguard.rating : currentRoom.killer.rating
                    )

                    currentRoom.killer.rating = isKillerWin ? newRatings.winner : newRatings.loser
                    currentRoom.bodyguard.rating = isKillerWin ? newRatings.loser : newRatings.winner

                    await pool.query(
                        "UPDATE killvasyausers SET rating = $1 WHERE name = $2",
                        [currentRoom.killer.rating, currentRoom.killer.name]
                    )
                    await pool.query(
                        "UPDATE killvasyausers SET rating = $1 WHERE name = $2",
                        [currentRoom.bodyguard.rating, currentRoom.bodyguard.name]
                    )
                }
            }
        }
        io.emit("roomsList", rooms)
    })

    socket.on("leaveRoom", (roomId: string) => {
        if (!socket.data.user) return

        const currentRoom = rooms.find(r => r.id === roomId)
        if (!currentRoom) return

        if (currentRoom.bodyguard?.name === socket.data.user.name) {
            currentRoom.bodyguard = null
        } else if (currentRoom.killer?.name === socket.data.user.name) {
            currentRoom.killer = null
        } else {
            return
        }

        if (currentRoom.killer === null && currentRoom.bodyguard === null) {
            rooms = rooms.filter(room => room.id !== currentRoom.id)
        }

        io.emit("roomsList", rooms)
    })

    socket.on("disconnect", () => {
        console.log("Отключился:", socket.id)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`🚀 Сервер на порту ${PORT}`)
})