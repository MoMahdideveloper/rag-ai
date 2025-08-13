import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Customer, Requirement, MatchResult, Property, PropertyMatchResult, ChatMessage, Task, TransactionType } from '../types';
import { api } from './api';

let currentApiKeyIndex = 0;

const makeGeminiRequest = async (
    apiKeys: string[],
    model: string,
    contents: any,
    config?: any
): Promise<GenerateContentResponse> => {
    if (!apiKeys || apiKeys.length === 0) {
        throw new Error("No Gemini API keys provided. Please add one in Settings.");
    }

    const initialIndex = currentApiKeyIndex;
    for (let i = 0; i < apiKeys.length; i++) {
        const keyIndex = (initialIndex + i) % apiKeys.length;
        const apiKey = apiKeys[keyIndex];

        try {
            console.log(`Attempting API call with key index: ${keyIndex}`);
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model,
                contents,
                config,
            });
            currentApiKeyIndex = (keyIndex + 1) % apiKeys.length;
            return response;
        } catch (error) {
            console.warn(`API key at index ${keyIndex} failed. Trying next key.`, error);
        }
    }

    throw new Error("All provided Gemini API keys failed or are invalid. Please check your keys in Settings.");
};

const parseJsonFromResponse = <T,>(text: string, fallback: T): T => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Raw text:", text);
        return fallback;
    }
};

type ParsedCustomerData = Partial<Omit<Customer, 'requirements' | 'id' | 'createdAt' | 'status' | 'interactions'>> & {
    requirements?: Partial<Omit<Requirement, 'notes' | 'tags'>>;
};

export const parseCustomerNotes = async (
    apiKeys: string[],
    notes: string
): Promise<ParsedCustomerData> => {
    const prompt = `
        You are an expert real estate CRM assistant. Your task is to parse unstructured text about a client and extract structured data.
        Analyze the following client notes and extract key information.
        First, determine the transaction type. If the notes mention "خرید", "فروش", "بودجه", or "قیمت", the transactionType is "Sale".
        If the notes mention "رهن", "اجاره", or "ودیعه", the transactionType is "Rent". Default to "Sale" if unsure.

        The response MUST be a single, valid JSON object. Do not add any text before or after the JSON.
        The JSON object should have the following fields if they can be found in the text:
        - "name": string
        - "phoneNumber": string
        - "requirements": an object containing:
            - "transactionType": "Sale" or "Rent" (MUST be present)
            - "propertyType": string (e.g., "آپارتمان", "ویلایی")
            - "neighborhoods": array of strings
            - "bedrooms": number
            - "minArea": number
            - "maxArea": number
            - "features": array of strings
            - "budget": number (integer, ONLY if transactionType is "Sale")
            - "maxRahn": number (integer, ONLY if transactionType is "Rent")
            - "maxRent": number (integer, ONLY if transactionType is "Rent")

        If a piece of information is not present, omit the key.
        Convert financial values to integers (e.g., "5 میلیارد تومان" becomes 5000000000, "۱۰۰ میلیون رهن" becomes 100000000).
        If an area range is mentioned like "بین ۸۰ تا ۱۰۰ متر", set "minArea" to 80 and "maxArea" to 100.
        All string values must be in Persian.

        ---
        Client Notes:
        "${notes}"
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        const parsed = parseJsonFromResponse<ParsedCustomerData>(response.text, {});
        if (parsed.requirements) {
            if (parsed.requirements.minArea && !parsed.requirements.maxArea) parsed.requirements.maxArea = parsed.requirements.minArea;
            if (parsed.requirements.maxArea && !parsed.requirements.minArea) parsed.requirements.minArea = parsed.requirements.maxArea;
        }
        return parsed;
    } catch (error) {
        console.error("Error parsing customer notes:", error);
        throw error;
    }
};

export const generateTagsForNotes = async (
    apiKeys: string[],
    notes: string
): Promise<string[]> => {
    const prompt = `
        You are a real estate data analyst. Your task is to generate relevant, concise, and useful tags from client notes.
        Analyze the following client notes and create a list of 5-7 descriptive tags in Persian.
        These tags should capture the essence of the client's profile and needs (e.g., "زوج جوان", "سرمایه‌گذار", "خانواده بزرگ", "ویو ابدی", "محیط دنج").
        Do not include tags that are just numbers or neighborhoods, unless it's a very specific landmark.

        The response MUST be a single, valid JSON array of strings. Do not add any text before or after the JSON.

        ---
        Client Notes:
        "${notes}"
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        return parseJsonFromResponse<string[]>(response.text, []);
    } catch (error) {
        console.error("Error generating tags for notes:", error);
        throw error;
    }
};

export const findMatchingCustomers = async (apiKeys: string[], property: Property, customers: Customer[]): Promise<MatchResult[]> => {
    // Filter customers by the same transaction type before sending to AI
    const relevantCustomers = customers.filter(c => c.requirements.transactionType === property.transactionType);
    if (relevantCustomers.length === 0) return [];

    const clientDataForPrompt = relevantCustomers.map(c => ({
        id: c.id,
        requirements: {
            transactionType: c.requirements.transactionType,
            budget: c.requirements.budget,
            maxRahn: c.requirements.maxRahn,
            maxRent: c.requirements.maxRent,
            notes: c.requirements.notes,
            tags: c.requirements.tags,
            propertyType: c.requirements.propertyType,
            neighborhoods: c.requirements.neighborhoods,
            area: `${c.requirements.minArea}-${c.requirements.maxArea}m`,
            bedrooms: c.requirements.bedrooms
        }
    }));

    const prompt = `
        You are a sophisticated AI real estate matchmaker. Your task is to find the most suitable clients for a given property.
        The property's transaction type is "${property.transactionType}". You MUST only consider clients with the exact same transaction type.

        Analyze the property description below. Compare it against the data of each client in the provided list.

        - If transactionType is "Sale", match based on "price" vs "budget". The client's budget should be close to or higher than the property's price.
        - If transactionType is "Rent", match based on "rahn" vs "maxRahn" and "rent" vs "maxRent". The client's max values should be close to or higher than the property's values.

        Return a JSON array of objects, where each object represents a matching client and contains:
        - "customerId": The ID of the client (must be a number).
        - "matchScore": A number from 0 to 100 indicating how well the client's needs match the property.
        - "reasoning": A brief, one-sentence explanation in Persian for why this client is a good match.

        Sort results by 'matchScore' (highest first). Only include clients with a 'matchScore' of 50 or higher. Respond ONLY with a single, valid JSON array.

        ---
        Property Details:
        ${JSON.stringify(property, null, 2)}
        ---
        Client List (JSON format):
        ${JSON.stringify(clientDataForPrompt, null, 2)}
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        return parseJsonFromResponse<MatchResult[]>(response.text, []);
    } catch (error) {
        console.error("Error finding matching customers with all keys:", error);
        throw error;
    }
};

export const findMatchingProperties = async (apiKeys: string[], customer: Customer, properties: Property[]): Promise<PropertyMatchResult[]> => {
    // Filter properties by the same transaction type before sending to AI
    const relevantProperties = properties.filter(p => p.transactionType === customer.requirements.transactionType);
    if (relevantProperties.length === 0) return [];

    const customerRequirements = customer.requirements;

    const prompt = `
        You are an expert AI real estate agent. Your task is to find the most suitable properties for a client based on their detailed requirements.
        The client's transaction type is "${customerRequirements.transactionType}". You MUST only consider properties with the exact same transaction type.

        Analyze the client's needs below and compare them against the list of available properties.
        - If transactionType is "Sale", match based on "budget" vs "price".
        - If transactionType is "Rent", match based on "maxRahn"/"maxRent" vs "rahn"/"rent".

        Return a JSON array of objects, where each object represents a matching property and contains:
        - "propertyId": The ID of the property (must be a number).
        - "matchScore": A number from 0 to 100 indicating how well the property matches the client's needs.
        - "reasoning": A brief, one-sentence explanation in Persian for why this property is a good match.

        Sort results by 'matchScore' (highest first). Only include properties with a 'matchScore' of 50 or higher. Respond ONLY with a single, valid JSON array.

        ---
        Client Requirements:
        ${JSON.stringify(customerRequirements, null, 2)}
        ---
        Available Properties List (JSON format):
        ${JSON.stringify(relevantProperties, null, 2)}
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        return parseJsonFromResponse<PropertyMatchResult[]>(response.text, []);
    } catch (error) {
        console.error("Error finding matching properties with all keys:", error);
        throw error;
    }
};

export const getAiCopilotResponse = async (
    apiKeys: string[],
    history: ChatMessage[],
    query: string,
    token: string | null
): Promise<string> => {
    const conversationHistoryForApi = history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
    }));

    // 1. Get context from backend RAG service
    let context = "No context was retrieved from the CRM.";
    try {
        const ragResponse = await api.post('/api/rag-search', { query }, token);
        if (ragResponse.context && ragResponse.context.length > 0) {
            context = ragResponse.context.join('\n\n');
        }
    } catch (error) {
        console.error("Failed to get RAG context:", error);
        context = "There was an error retrieving context from the CRM.";
    }

    const systemInstruction = `
        You are "هوشمند", an expert AI assistant for a real estate CRM. You are interacting with a real estate agent.
        Your goal is to be helpful, concise, and professional. All your responses must be in Persian.
        You have access to some potentially relevant context from the CRM's dataset below. Use this data to answer the user's question.
        The user's latest question is: "${query}".
        Base your answer on the provided context. If the context is not sufficient, you can use your general knowledge but state that the information is not from the CRM.

        Context from CRM:
        ---
        ${context}
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", conversationHistoryForApi, { systemInstruction });
        return response.text;
    } catch (error) {
        console.error("Error getting AI Copilot response with all keys:", error);
        return "متاسفانه در ارتباط با سرویس هوش مصنوعی مشکلی پیش آمد. لطفاً کلیدهای API خود را در بخش تنظیمات بررسی کرده و دوباره تلاش کنید.";
    }
};

export const getFeatureInsights = async (
    apiKeys: string[],
    customers: Customer[],
    promptTemplate: string,
    existingKeywords: string[]
): Promise<string[]> => {
    const customerRequirements = customers.map(c => ({
        notes: c.requirements.notes,
        features: c.requirements.features,
    }));

    if (customerRequirements.length < 2) return [];

    const prompt = `${promptTemplate.replace('{keywords}', JSON.stringify(existingKeywords))}

    ---
    Client Data:
    ${JSON.stringify(customerRequirements, null, 2)}
    ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        return parseJsonFromResponse<string[]>(response.text, []);
    } catch (error) {
        console.error("Error getting feature insights:", error);
        return [];
    }
};

export const sanitizePropertyData = async (
    apiKeys: string[],
    rawData: any
): Promise<Partial<Property>> => {
     const prompt = `
        You are a data sanitization expert for a real estate CRM. Transform the raw JSON object into a structured Property object.
        - Determine "transactionType" ('Sale' or 'Rent') based on fields like 'price' (Sale) or 'rahn'/'rent' (Rent). Default to 'Sale'.
        - Convert keys to camelCase.
        - Ensure numeric fields (area, bedrooms, price, rahn, rent) are numbers.
        - Extract "propertyType".
        - Generate a concise "description" in Persian.
        - Ensure "features" is an array of strings.
        - The response must be ONLY a single, valid JSON object. Do not add any text before or after it.

        ---
        Raw Data to Sanitize:
        ${JSON.stringify(rawData, null, 2)}
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        return parseJsonFromResponse<Partial<Property>>(response.text, {});
    } catch (error) {
        console.error("Error sanitizing property data:", error);
        throw error;
    }
};

export const sanitizeCustomerData = async (
    apiKeys: string[],
    rawData: any
): Promise<Partial<Customer>> => {
     const prompt = `
        You are a data sanitization expert for a real estate CRM. Transform the raw JSON object into a structured Customer object.
        - Determine "transactionType" ('Sale' or 'Rent') for the requirements based on fields like 'budget' (Sale) or 'maxRahn'/'maxRent' (Rent). Default to 'Sale'.
        - Convert keys to camelCase.
        - Extract all fields as defined in the Customer and Requirement types for the application.
        - The response must be ONLY a single, valid JSON object. Do not add any text before or after it.

        ---
        Raw Data to Sanitize:
        ${JSON.stringify(rawData, null, 2)}
        ---
    `;

    try {
        const response = await makeGeminiRequest(apiKeys, "gemini-2.5-flash-preview-04-17", prompt, { responseMimeType: "application/json" });
        return parseJsonFromResponse<Partial<Customer>>(response.text, {});
    } catch (error) {
        console.error("Error sanitizing customer data:", error);
        throw error;
    }
};
