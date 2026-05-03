import { generateElectionResponse } from '@/lib/vertexService';

export async function POST(req) {
  let message = "Unknown";
  let language = "en";

  try {
    const body = await req.json();
    message = body.message || message;
    language = body.language || language;
    
    // Call the newly extracted and optimized service
    const content = await generateElectionResponse(message, language);
    return Response.json({ response: content });
    
  } catch (error) {
    // SECURITY: Log sensitive errors to the server console, but DO NOT expose them to the client
    console.error("[API Error] Vertex AI generation failed:", error.message);
    
    const mockDelay = new Promise(resolve => setTimeout(resolve, 1200));
    await mockDelay;
    
    // Simple rule-based mock responses for demonstration
    const lowerMessage = message.toLowerCase();
    let mockText = `[Mock AI] To enable real AI, add Google Cloud Credentials. You asked about: "${message}". In general, elections involve registration, campaigning, and voting.`;
    
    if (lowerMessage.includes('register') || lowerMessage.includes('registration')) {
      mockText = "[Mock AI] Voter registration is the first crucial step. You usually need valid ID and proof of address to register online or at a local office.";
    } else if (lowerMessage.includes('vote') || lowerMessage.includes('voting')) {
      mockText = "[Mock AI] Voting day requires you to bring valid identification to your designated polling station. Every vote counts!";
    } else if (lowerMessage.includes('who') || lowerMessage.includes('candidate')) {
      mockText = "[Mock AI] Candidates are individuals running for office. They campaign to share their manifestos with the public before election day.";
    }

    const localizedMock = {
      en: mockText,
      es: `[IA Simulada] ${mockText} (Traducción simulada: El proceso de registro es crucial...)`,
      hi: `[मॉक एआई] ${mockText} (सिम्युलेटेड हिंदी: मतदान बहुत महत्वपूर्ण है...)`,
      fr: `[IA Simulée] ${mockText} (Traduction simulée: L'inscription est cruciale...)`
    };

    return Response.json({ response: localizedMock[language] || localizedMock.en }, { status: 200 });
  }
}
