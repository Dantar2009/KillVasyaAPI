import { Router } from "express";
import pool from "../pg.ts";
import getGraves from "../utils/getGraves.ts";
import getRating from "../utils/getRating.ts";

const router = Router()

router.get("/",async(req,res)=>{
    try{
        const [graves,rating]=await Promise.all([getGraves(),getRating()])
        res.json(
            {
                rating,
                graves
            }
        )
    }
    catch(error){
        res.json({
            err:"error"
        })
    }
})


export default router