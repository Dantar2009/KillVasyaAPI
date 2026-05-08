import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import pool from "./pg.ts"
import loginRouter from "./Routers/usersRouter.ts"
dotenv.config()

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: { origin: "*" }
})

app.use(cors())
app.use(express.json())
app.use("/users",loginRouter)
app.get("/", (req, res) => {
    res.json({ ok: true })
})

io.on("connection", (socket) => {
    console.log("Подключился:", socket.id)

    socket.on("message", (data) => {
        console.log("Сообщение:", data)
        io.emit("message", data)
    })

    socket.on("disconnect", () => {
        console.log("Отключился:", socket.id)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`🚀 Сервер на порту ${PORT}`)
})