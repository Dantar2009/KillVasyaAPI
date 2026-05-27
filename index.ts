import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import pool from "./pg.ts"
import loginRouter from "./Routers/usersRouter.ts"
import statsRouter from "./Routers/statsRouter.ts"
import { getRandomLocation } from "./utils/getRandomLocation.ts"
import askAI from "./utils/askAI.ts"
import getAPIKey from "./utils/getAPIKey.ts"
import updateRatings from "./utils/updateRating.ts"
import getRating from "./utils/getRating.ts"
import getGraves from "./utils/getGraves.ts"

dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: [process.env.FRONTEND_URL || "http://localhost:5173", "http://localhost:5173"]
    }
})

app.use(cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:5173","http://localhost:5173"]
}))
app.use(express.json())
app.use("/users", loginRouter)
app.use("/stats", statsRouter)
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
    killerReady: boolean,
    bodyguardReady: boolean,
    location: string,
    winner: "killer" | "bodyguard" | "nowinner",
    aiOtvet: string
}
type RatingUser = {
    id: string,
    name: string,
    rating: number
}
type Grave = {
    id: string,
    date: string,
    epitaph: string
}
let rooms: Room[] = []

io.on("connection", async (socket) => {
    const name = socket.handshake.query.name as string
    const pass = socket.handshake.query.pass as string
    
    socket.emit("updateRatings", await getRating())
    
    socket.emit("cemeteryUpdate", await getGraves())
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
            killerReady: false,
            bodyguardReady: false,
            location: null,
            winner: "nowinner",
            aiOtvet: "",

        }
        rooms.push(newRoom)
        io.emit("createRoom", newRoom)

        socket.join(newRoom.id)
        socket.emit("openRoom", newRoom.id)
    })

    socket.on("joinRoom", async (roomId) => {
        if (!socket.data.user) return

        const currentRoom = rooms.find(room => room.id === roomId)
        if (!currentRoom) return

        if (currentRoom.killer?.name === socket.data.user?.name || currentRoom.bodyguard?.name === socket.data.user?.name) {
            socket.emit("error", "Ты уже в этой комнате")
            return
        }

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

        if (currentRoom.killer && currentRoom.bodyguard) {
            currentRoom.location = getRandomLocation()
        }

        socket.emit("openRoom", roomId)
        io.emit("updateRoom", currentRoom)
    })

    socket.on("sendMessage", async (data: { messageText: string, roomId: string }) => {
        if (!socket.data.user) return
        if (data.messageText.trim().length === 0) return
        const currentRoom = rooms.find(r => r.id === data.roomId)
        if (!currentRoom) return
        if(!(currentRoom.bodyguard&&currentRoom.killer)) return

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
        io.emit("updateRoom", currentRoom)

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
                    if (isKillerWin) {
                        const cemeteryObj = await pool.query(`SELECT * FROM cemetery`)
                        const cemetery: Grave[] = cemeteryObj.rows
                        io.emit("cemeteryUpdate", cemetery)
                    }
                }
            }
        }
        io.emit("updateRoom", currentRoom)
        const newRating = await pool.query("SELECT id, name, rating FROM killvasyausers")
        const sortedRating: RatingUser[] = newRating.rows.sort((a: RatingUser, b: RatingUser) => b.rating - a.rating)
        io.emit("updateRatings", sortedRating)

    })

    socket.on("leaveRoom", async (roomId: string) => {
        if (!socket.data.user) return

        const currentRoom = rooms.find(r => r.id === roomId)
        if (!currentRoom) return

        if (currentRoom.winner === "nowinner" && currentRoom.killer && currentRoom.bodyguard) {
            const leaverIsKiller = currentRoom.killer.name === socket.data.user.name
            const winner = leaverIsKiller ? currentRoom.bodyguard : currentRoom.killer
            const loser = leaverIsKiller ? currentRoom.killer : currentRoom.bodyguard

            const newRatings = updateRatings(winner.rating, loser.rating)
            winner.rating = newRatings.winner
            loser.rating = newRatings.loser

            await pool.query("UPDATE killvasyausers SET rating = $1 WHERE name = $2", [winner.rating, winner.name])
            await pool.query("UPDATE killvasyausers SET rating = $1 WHERE name = $2", [loser.rating, loser.name])
            socket.emit("ratingUpdate", loser.rating)
        }

        if (currentRoom.killer?.name === socket.data.user.name) {
            currentRoom.killer = null
            currentRoom.killerReady = false
        } else if (currentRoom.bodyguard?.name === socket.data.user.name) {
            currentRoom.bodyguard = null
            currentRoom.bodyguardReady = false
        }

        if (!currentRoom.killer && !currentRoom.bodyguard) {
            rooms = rooms.filter(room => room.id !== currentRoom.id)
            io.emit("deleteRoom", roomId)
        } else {
            io.emit("updateRoom", currentRoom)
        }

        const newRating = await pool.query("SELECT id, name, rating FROM killvasyausers")
        const sortedRating: RatingUser[] = newRating.rows.sort((a: RatingUser, b: RatingUser) => b.rating - a.rating)
        io.emit("updateRatings", sortedRating)
    })
    socket.on("ready", (roomId: string) => {
        if (!socket.data.user) return

        const currentRoom = rooms.find(r => r.id === roomId)
        if (!currentRoom) return

        if (currentRoom.killer?.name === socket.data.user.name) {
            currentRoom.killerReady = !currentRoom.killerReady
        } else if (currentRoom.bodyguard?.name === socket.data.user.name) {
            currentRoom.bodyguardReady = !currentRoom.bodyguardReady
        }

        if (currentRoom.killerReady && currentRoom.bodyguardReady) {
            currentRoom.killerText = null
            currentRoom.bodyguardText = null
            currentRoom.killerReady = false
            currentRoom.bodyguardReady = false
            currentRoom.aiOtvet = ""
            currentRoom.winner = "nowinner"
            currentRoom.location = getRandomLocation()
        }

        io.emit("updateRoom", currentRoom)

    })

    socket.on("disconnect", () => {
        console.log("Отключился:", socket.id)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`🚀 Сервер на порту ${PORT}`)
})