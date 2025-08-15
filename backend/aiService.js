const { GoogleGenerativeAI } = require('@google/genai');

const getGeminiApiKey = () => {
    // A more robust system could cycle through multiple keys if they are provided.
    // For now, we'll use the one from the environment variables.
    // The user will be instructed to set this up in the README.
    return process.env.GEMINI_API_KEY;
}

const getLeadScoreFromAI = async (customer) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        console.warn('GEMINI_API_KEY not set. Skipping AI lead scoring.');
        return { score: null, reasoning: 'AI scoring is disabled because the API key is not configured.' };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-preview-0514" });

    const prompt = `
        As an expert real estate sales manager, your task is to score a new lead based on their profile and requirements.
        Provide a score from 1 (very low potential) to 10 (very high potential).
        Also provide a short, one-sentence reasoning for your score.

        The response MUST be a single, valid JSON object with two keys: "score" (number) and "reasoning" (string).
        Do not add any text before or after the JSON.

        Lead Profile:
        - Name: ${customer.name}
        - Status: ${customer.status}
        - Requirements:
            - Transaction Type: ${customer.requirements.transactionType}
            - Property Type: ${customer.requirements.propertyType}
            - Budget/Rent: ${customer.requirements.transactionType === 'Sale' ? `Budget ${customer.requirements.budget}` : `Max Rahn ${customer.requirements.maxRahn}, Max Rent ${customer.requirements.maxRent}`}
            - Desired Area: ${customer.requirements.minArea}-${customer.requirements.maxArea} sqm
            - Desired Bedrooms: ${customer.requirements.bedrooms}
            - Desired Neighborhoods: ${customer.requirements.neighborhoods?.join(', ')}
            - Desired Features: ${customer.requirements.features?.join(', ')}
        - Notes: ${customer.requirements.notes}

        ---
        JSON Response:
    `;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("AI did not return valid JSON. Response:", responseText);
            throw new Error("AI did not return valid JSON.");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            score: typeof parsed.score === 'number' ? parsed.score : null,
            reasoning: parsed.reasoning || 'No reasoning provided.'
        };
    } catch (error) {
        console.error("Error getting lead score from AI:", error);
        return { score: null, reasoning: 'An error occurred during the AI scoring process.' };
    }
};

module.exports = { getLeadScoreFromAI };
