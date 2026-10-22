
import "dotenv/config";

export async function askOllama(content, question) {
  const response = await fetch(
    "https://ollama.com/api/chat",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model: "gemma4:31b",

        messages: [
          {
            role: "system",
            content: `Tum ek PDF research assistant ho.
PDF ke content ke aadhar par simple Hindi mein jawab do.
Agar jawab PDF mein nahi hai, to saaf batao.
Apni taraf se facts mat ghadho.`
          },
          {
            role: "user",
            content: `PDF ka content:\n\n${content}\n\nMera sawaal: ${question}`
          }
        ],

        stream: false
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || `Ollama API error: ${response.status}`
    );
  }

  return data.message.content;
}
