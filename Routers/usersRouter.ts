import { Router } from "express"
import pool from "../pg.ts"
import bcrypt from "bcrypt"
import {rateLimit} from "express-rate-limit"
const router = Router()
const limiter = rateLimit({
    windowMs: 60 * 1000, 
    limit: 5,            
    message: { error: "Слишком много запросов. Попробуйте позже." },
    standardHeaders: true,
    legacyHeaders: false,
})
router.get("/test", (req, res) => {
    res.json({ message: "Роутер работает" })
})

router.post("/register",limiter, async(req, res) => { 
    try {
        let { name, pass }: { name: string, pass: string } = req.body
        
        if(name.trim().length < 4){
            return res.json({ otvet: "shortName" })
        }
        
        const user = await pool.query(
            "SELECT * FROM killvasyausers WHERE name = $1", 
            [name]
        )
        if (user.rows.length > 0) {
            return res.json({ otvet: "userRegistered" })
        }
        if(pass.length < 8){
            return res.json({ otvet: "shortPass" })
        }
        pass = await bcrypt.hash(pass, 10)
        const result = await pool.query(
            "INSERT INTO killvasyausers (name, pass) VALUES ($1, $2) RETURNING id, name, pass, rating",
            [name, pass]
        )
        res.json({ otvet: "OK", user: result.rows[0] })
    } catch(err) {
        res.status(500).json({ otvet: "Ошибка сервера" })
    }
})

router.post("/signin",limiter, async(req, res) => {
    try {
        const { name, pass }: { name: string, pass: string } = req.body
        
        const user = await pool.query(
            "SELECT * FROM killvasyausers WHERE name = $1",
            [name]
        )
        
        if (user.rows.length === 0) {
            return res.json({ otvet: "notFound" })
        }
        
        const validPass = await bcrypt.compare(pass, user.rows[0].pass)
        
        if (!validPass) {
            return res.json({ otvet: "wrongPass" })
        }
        
        res.json({ 
            otvet: "OK", 
            user: user.rows[0]
        })
        
    } catch(err) {
        res.status(500).json({ otvet: "Ошибка сервера" })
    }
})


export default router