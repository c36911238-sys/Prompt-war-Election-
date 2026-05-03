import { VertexAI } from '@google-cloud/vertexai';

export async function generateElectionResponse(message, language) {
  const hasFilePath = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasJsonString = !!process.env.GOOGLE_CREDENTIALS_JSON;

  if (!hasFilePath && !hasJsonString) {
    throw new Error("Missing Google Cloud Credentials");
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'your-project-id';
  
  // Configure Auth for Vercel (JSON string) vs Local (File path)
  const authConfig = hasJsonString ? {
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON)
  } : undefined;

  const vertex_ai = new VertexAI({ 
    project: projectId, 
    location: 'us-central1',
    googleAuthOptions: authConfig
  });
  
  // Advanced configuration for Vertex AI
  const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: 'gemini-1.5-pro-preview-0409',
    generationConfig: {
      temperature: 0.2, // Low temperature for more deterministic, factual responses about elections
      maxOutputTokens: 500, // Limit output to keep responses concise and control costs
      topP: 0.8,
    }
  });

  const prompt = `You are a helpful, professional, and completely objective AI Election Process Assistant. 
  Your primary goal is to educate the user on democratic election processes, timelines, and general voting procedures.
  Do not endorse any specific political party or candidate.
  
  The user is asking: "${message}".
  Provide a concise, easy-to-understand answer.
  
  IMPORTANT: You must respond in the language code: ${language}.`;

  const resp = await generativeModel.generateContent(prompt);
  return resp.response.candidates[0].content.parts[0].text;
}
