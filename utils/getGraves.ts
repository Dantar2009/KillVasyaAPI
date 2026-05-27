import pool from "../pg.ts"
import { Grave } from "../types.ts"

const getGraves=async()=>{
    const cemeteryObj = await pool.query(`SELECT * FROM cemetery`)
    const cemetery: Grave[] = cemeteryObj.rows.reverse()
    return cemetery
}
export default getGraves