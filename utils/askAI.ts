import promptText from "../data/promptText.ts"
import pool from "../pg.ts"

export type AIAnswer = {
    winner: "killer" | "bodyguard",
    description: string,
    epitaph: string
}

const askAI = async (
    killerText: string,
    bodyguardText: string,
    location: string,
    APIkey: string
): Promise<AIAnswer | string> => {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${APIkey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "inclusionai/ling-3.0-flash-sante:free",
            messages: [
                {
                    role: "system",
                    content: promptText
                },
                {
                    role: "user",
                    content: `Локация: ${location}
Убийца: ${killerText}
Телохранитель: ${bodyguardText}

JSON:`
                }
            ]
        })
    })

    try {
        const data = await response.json()
        const jsonVerdict = data.choices[0].message.content
        const verdict: AIAnswer = JSON.parse(jsonVerdict)
        console.log(verdict)

        if (verdict.winner === "killer") {
            await pool.query(
                "INSERT INTO cemetery (date, epitaph) VALUES ($1, $2)",
                [new Date().toLocaleDateString("ru-RU"), verdict.epitaph]
            )
        }

        return verdict
    } catch {
        return "Ошибка сервера"
    }
}

export default askAI
