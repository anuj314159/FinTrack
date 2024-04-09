import axios from "axios";

export const analyzeTextData = async (combinedText, apiKey, model = "nvidia/llama-3.1-nemotron-ultra-253b-v1:free") => {
  try {
    if (!apiKey) {
      throw new Error("API key is required");
    }

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model,
        messages: [
          {
            role: "system",
            content: "You're an expert data analyst. Analyze and summarize the given text-based data.  Each section is labeled with its original AsyncStorage key.",
          },
          {
            role: "user",
            content: `Here is the data from of my personal financial activity help me analyze it so I can plan better in the future and suggest a better spending plan which you think will improve my finances:\n\n${combinedText}`,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "Budget Buddy",
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { data: response.data.choices[0].message.content, error: null };

  } catch (error) {
    return { data: null, error: error };
  }
};