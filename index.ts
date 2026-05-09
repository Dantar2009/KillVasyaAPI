import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import pool from "./pg.ts"
import loginRouter from "./Routers/usersRouter.ts"
import { disconnect } from "cluster"
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
type User = {
    id: number,
    name: string,
    pass: string,
    rating: number
}
type playerInfo={
    name:string,
    rating:number
}
type Room={
    id:string,
    killer:playerInfo|null,
    bodyguard:playerInfo|null,

}


const rooms:Room[]=[]
io.on("connection", async (socket) => {
    const name = socket.handshake.query.name as string
    const pass = socket.handshake.query.pass as string

    const searchUser = await pool.query(
        "SELECT * FROM killvasyausers WHERE name = $1 AND pass = $2",
        [name, pass]
    )
    let user: User|null=null
    if (searchUser.rows.length> 0) {
        user=searchUser.rows[0]
        console.log("Подключился:", user.name, "Рейтинг:", user.rating)
    }

    
    
    socket.data.user = user
    const list = rooms.filter(room => !room.killer || !room.bodyguard)
    socket.emit("roomsList", list) 
    socket.on("createRoom",async(data)=>{
        if(!socket.data.user){
            return
        }
        
        if(data.role!=="killer"&&data.role!=="bodyguard"){
            return
        }
        const player:playerInfo={
            name:socket.data.user.name,
            rating:socket.data.user.rating
        }
        const newRoom:Room={
            id:Date.now().toString(),
            killer:data.role==="killer"?player:null,
            bodyguard:data.role==="bodyguard"?player:null
        }
        rooms.push(newRoom)
        const list = rooms.filter(room => !room.killer || !room.bodyguard)
        io.emit("roomsList", list) 

        socket.join(newRoom.id)
    })
    socket.on("disconnect", () => {
        console.log("Отключился:", socket.id)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
    console.log(`🚀 Сервер на порту ${PORT}`)
})