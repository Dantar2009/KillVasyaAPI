export type User = {
    id: number,
    name: string,
    pass: string,
    rating: number
}

export type playerInfo = {
    name: string,
    rating: number
}

export type Room = {
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
export type RatingUser = {
    id: string,
    name: string,
    rating: number
}
export type Grave = {
    id: string,
    date: string,
    epitaph: string
}
export type AIAnswer = {
    winner: "killer" | "bodyguard",
    description: string,
    epitaph: string
}
export type WinnerAndLoser = {
    winner: number,
    loser: number
}