import promptText from "../data/promptText.ts"
import pool from "../pg.ts"
import { AIAnswer } from "../types.ts"

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
            model: "openai/gpt-oss-120b:free",
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