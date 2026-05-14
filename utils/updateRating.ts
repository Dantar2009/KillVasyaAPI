export type WinnerAndLoser = {
    winner: number,
    loser: number
}

function updateRatings(winnerRating: number, loserRating: number):WinnerAndLoser {
    const expected = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400))
    const delta = Math.round(32 * (1 - expected))

    return {
        winner: winnerRating + delta,
        loser: loserRating - delta
    }
}
export default updateRatings