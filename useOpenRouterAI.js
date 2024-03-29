// useOpenRouterAI.js
import { useState } from "react";
import axios from "axios";

export default function useOpenRouterAI() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  const askAI = async (message) => {
    setLoading(true);
    try {
      const res = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "openai/gpt-3.5-turbo", // or try 'mistralai/mixtral-8x7b', etc.
          messages: [{ role: "user", content: message }],
        },
        {
          headers: {
            "Authorization": `Bearer YOUR_API_KEY_HERE`,
            "Content-Type": "application/json",
            "HTTP-Referer": "your-app-name", // optional but good practice
          },
        }
      );

      setResponse(res.data.choices[0].message.content);
    } catch (error) {
      console.error("OpenRouter AI error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return { askAI, response, loading };
}
