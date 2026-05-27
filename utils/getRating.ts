import pool from "../pg.ts"

type RatingUser = {
    id: string,
    name: string,
    rating: number
}
const getRating=async()=>{
    const newRating = await pool.query("SELECT id, name, rating FROM killvasyausers")
    const sortedRating: RatingUser[] = newRating.rows.sort((a: RatingUser, b: RatingUser) => b.rating - a.rating)
    return sortedRating
}
export default getRating