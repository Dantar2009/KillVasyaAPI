import dotenv from "dotenv"
dotenv.config()

const APIkeys: string[] = [
    process.env.APIKEY1,
    process.env.APIKEY2,
    process.env.APIKEY3,
    process.env.APIKEY4,
    process.env.APIKEY5,
    process.env.APIKEY6,
    process.env.APIKEY7,
    process.env.APIKEY8,
    process.env.APIKEY9,
    process.env.APIKEY10,
]

function createBullet() {
    let currentIndex: number = 0
    return function(): string {
        currentIndex++
        if (APIkeys.length <= currentIndex) {
            currentIndex = 0
        }
        return APIkeys[currentIndex]
    }
}

const getAPIKey = createBullet()
export default getAPIKey