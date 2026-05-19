

/**
 * AI Client for calling Groq/OpenAI compatible APIs
 */
const callAi = async (prompt, systemPrompt = 'You are a helpful assistant.') => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment');
  }

  // Detect if it's Groq or OpenAI based on prefix (gsk_ is Groq)
  const isGroq = apiKey.startsWith('gsk_');
  const baseUrl = isGroq 
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';

  const model = isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`AI API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error calling AI:', error);
    throw error;
  }
};

module.exports = { callAi };
