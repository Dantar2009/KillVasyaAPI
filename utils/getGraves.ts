import pool from "../pg.ts"

type Grave = {
    id: string,
    date: string,
    epitaph: string
}
const getGraves=async()=>{
    const cemeteryObj = await pool.query(`SELECT * FROM cemetery`)
    const cemetery: Grave[] = cemeteryObj.rows.reverse()
    return cemetery
}
export default getGraves