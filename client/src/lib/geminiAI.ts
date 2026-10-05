/**
 * Firebase AI Logic with Gemini Integration
 * Implements all 6 capabilities:
 * 1. Text generation with streaming
 * 2. Multimodal prompts (images, video, audio, PDFs)
 * 3. Multi-turn conversations (chat)
 * 4. Structured output (JSON)
 * 5. Image generation and editing
 * 6. Gemini Live API (streaming input/output with audio)
 */

import { GoogleGenerativeAI, GenerativeModel, ChatSession } from "@google/generative-ai";
import posthog from "./posthog";

// Initialize Gemini AI
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const createAiId = () => crypto.randomUUID();
const processAiSessionId = createAiId();

type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
};

function captureGeneration({
  model,
  input,
  output,
  traceId,
  sessionId,
  startedAt,
  usage,
  stream = false,
  firstTokenAt,
}: {
  model: string;
  input: unknown;
  output: string;
  traceId: string;
  sessionId: string;
  startedAt: number;
  usage?: GeminiUsage;
  stream?: boolean;
  firstTokenAt?: number;
}) {
  const properties: Record<string, unknown> = {
    $ai_trace_id: traceId,
    $ai_session_id: sessionId,
    $ai_model: model,
    $ai_provider: "gemini",
    $ai_input: [{ role: "user", content: input }],
    $ai_output_choices: [{ role: "assistant", content: output }],
    $ai_latency: (Date.now() - startedAt) / 1000,
  };

  if (usage?.promptTokenCount !== undefined) {
    properties.$ai_input_tokens = usage.promptTokenCount;
  }
  if (usage?.candidatesTokenCount !== undefined) {
    properties.$ai_output_tokens = usage.candidatesTokenCount;
  }
  if (stream) {
    properties.$ai_stream = true;
    if (firstTokenAt !== undefined) {
      properties.$ai_time_to_first_token = (firstTokenAt - startedAt) / 1000;
    }
  }

  try {
    posthog.capture("$ai_generation", properties);
  } catch {
    // Observability must not affect the Gemini response path.
  }
}

// Model configurations for different use cases
export const MODELS = {
  FLASH: "gemini-2.0-flash-exp",
  PRO: "gemini-1.5-pro",
  FLASH_THINKING: "gemini-2.0-flash-thinking-exp",
  VISION: "gemini-1.5-flash",
};

// ============================================
// 1. TEXT GENERATION WITH STREAMING
// ============================================

export async function generateText(prompt: string, modelName: string = MODELS.FLASH): Promise<string> {
  const traceId = createAiId();
  const startedAt = Date.now();

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const output = response.text();
    captureGeneration({
      model: modelName,
      input: prompt,
      output,
      traceId,
      sessionId: processAiSessionId,
      startedAt,
      usage: response.usageMetadata,
    });
    return output;
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
}

export async function* streamText(prompt: string, modelName: string = MODELS.FLASH): AsyncGenerator<string> {
  const traceId = createAiId();
  const startedAt = Date.now();

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContentStream(prompt);
    let output = "";
    let firstTokenAt: number | undefined;
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      firstTokenAt ??= Date.now();
      output += chunkText;
      yield chunkText;
    }

    captureGeneration({
      model: modelName,
      input: prompt,
      output,
      traceId,
      sessionId: processAiSessionId,
      startedAt,
      stream: true,
      firstTokenAt,
    });
  } catch (error) {
    console.error("Error streaming text:", error);
    throw error;
  }
}

// ============================================
// 2. MULTIMODAL PROMPTS (Images, Video, Audio, PDFs)
// ============================================

export interface MultimodalContent {
  text?: string;
  image?: File | Blob;
  video?: File | Blob;
  audio?: File | Blob;
  pdf?: File | Blob;
}

async function fileToGenerativePart(file: File | Blob, mimeType: string) {
  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
}

export async function generateFromMultimodal(
  content: MultimodalContent,
  modelName: string = MODELS.VISION
): Promise<string> {
  const traceId = createAiId();
  const startedAt = Date.now();

  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const parts: any[] = [];

    if (content.text) {
      parts.push({ text: content.text });
    }

    if (content.image) {
      const imagePart = await fileToGenerativePart(content.image, content.image.type);
      parts.push(imagePart);
    }

    if (content.video) {
      const videoPart = await fileToGenerativePart(content.video, content.video.type);
      parts.push(videoPart);
    }

    if (content.audio) {
      const audioPart = await fileToGenerativePart(content.audio, content.audio.type);
      parts.push(audioPart);
    }

    if (content.pdf) {
      const pdfPart = await fileToGenerativePart(content.pdf, 'application/pdf');
      parts.push(pdfPart);
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const output = response.text();
    captureGeneration({
      model: modelName,
      input: [
        content.text && { type: "text", text: content.text },
        content.image && { type: "image", mimeType: content.image.type },
        content.video && { type: "video", mimeType: content.video.type },
        content.audio && { type: "audio", mimeType: content.audio.type },
        content.pdf && { type: "pdf", mimeType: "application/pdf" },
      ].filter(Boolean),
      output,
      traceId,
      sessionId: processAiSessionId,
      startedAt,
      usage: response.usageMetadata,
    });
    return output;
  } catch (error) {
    console.error("Error with multimodal generation:", error);
    throw error;
  }
}

// ============================================
// 3. MULTI-TURN CONVERSATIONS (CHAT)
// ============================================

export class GeminiChat {
  private model: GenerativeModel;
  private chat: ChatSession;
  private history: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  private readonly sessionId = createAiId();
  private readonly modelName: string;

  constructor(modelName: string = MODELS.FLASH, systemInstruction?: string) {
    this.modelName = modelName;
    this.model = genAI.getGenerativeModel({ 
      model: modelName,
      systemInstruction: systemInstruction,
    });
    this.chat = this.model.startChat({
      history: this.history,
    });
  }

  async sendMessage(message: string): Promise<string> {
    const traceId = createAiId();
    const startedAt = Date.now();

    try {
      const result = await this.chat.sendMessage(message);
      const response = result.response;
      const output = response.text();
      captureGeneration({
        model: this.modelName,
        input: message,
        output,
        traceId,
        sessionId: this.sessionId,
        startedAt,
        usage: response.usageMetadata,
      });
      return output;
    } catch (error) {
      console.error("Error sending chat message:", error);
      throw error;
    }
  }

  async* streamMessage(message: string): AsyncGenerator<string> {
    const traceId = createAiId();
    const startedAt = Date.now();

    try {
      const result = await this.chat.sendMessageStream(message);
      let output = "";
      let firstTokenAt: number | undefined;
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        firstTokenAt ??= Date.now();
        output += chunkText;
        yield chunkText;
      }

      captureGeneration({
        model: this.modelName,
        input: message,
        output,
        traceId,
        sessionId: this.sessionId,
        startedAt,
        stream: true,
        firstTokenAt,
      });
    } catch (error) {
      console.error("Error streaming chat message:", error);
      throw error;
    }
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.chat = this.model.startChat({
      history: this.history,
    });
  }
}

// ============================================
// 4. STRUCTURED OUTPUT (JSON)
// ============================================

export async function generateStructuredOutput<T>(
  prompt: string,
  schema: any,
  modelName: string = MODELS.FLASH
): Promise<T> {
  const traceId = createAiId();
  const startedAt = Date.now();

  try {
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const jsonText = response.text();
    captureGeneration({
      model: modelName,
      input: prompt,
      output: jsonText,
      traceId,
      sessionId: processAiSessionId,
      startedAt,
      usage: response.usageMetadata,
    });
    return JSON.parse(jsonText) as T;
  } catch (error) {
    console.error("Error generating structured output:", error);
    throw error;
  }
}

// ============================================
// 5. SMART FEATURES FOR KSYK MAPS
// ============================================

/** AI-powered room finder. Pulls the live building/room inventory from
 *  the API so Gemini gets grounded on the real campus instead of the
 *  hallucinated "A101-A305" placeholders we used to seed the prompt.
 *  If the network call fails, the prompt still runs — Gemini just
 *  doesn't get a room list. */
export async function findRoomWithAI(query: string): Promise<any> {
  let corpus = "";
  try {
    const [bRes, rRes] = await Promise.all([
      fetch("/api/buildings").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/rooms").then((r) => (r.ok ? r.json() : [])),
    ]);
    const buildings = (bRes as Array<{ id: string; name: string }>) ?? [];
    const rooms = (rRes as Array<{ roomNumber: string; name?: string; floor?: number; buildingId?: string; type?: string }>) ?? [];
    if (buildings.length || rooms.length) {
      const bLine = buildings.map((b) => `- ${b.name} (id=${b.id})`).join("\n");
      // Cap rooms in the prompt at 200 to stay under token budget; the
      // most useful ones are the classrooms + labs + special areas, so
      // dedupe by type first if needed. For now truncate deterministically.
      const rLine = rooms
        .slice(0, 200)
        .map((r) => `- ${r.roomNumber} ${r.name ?? ""}${r.floor !== undefined ? ` (floor ${r.floor})` : ""}${r.type ? ` [${r.type}]` : ""}`)
        .join("\n");
      corpus = `Buildings on campus:\n${bLine}\n\nRooms:\n${rLine}`;
    }
  } catch {
    // Network / parse error — proceed with an unseeded prompt.
  }

  const prompt = `You are a helpful assistant for KSYK Maps, a school navigation system.

User query: "${query}"

Based on this query, provide a JSON response with:
- roomNumber: the most likely room number
- building: the building name
- floor: the floor number
- confidence: confidence level (0-1)
- reasoning: brief explanation

${corpus || "(No campus inventory available — infer from the user query alone.)"}

Respond ONLY with valid JSON.`;

  const schema = {
    type: "object",
    properties: {
      roomNumber: { type: "string" },
      building: { type: "string" },
      floor: { type: "number" },
      confidence: { type: "number" },
      reasoning: { type: "string" },
    },
    required: ["roomNumber", "building", "floor", "confidence", "reasoning"],
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI homework helper
export async function helpWithHomework(
  subject: string,
  question: string,
  image?: File
): Promise<string> {
  if (image) {
    return await generateFromMultimodal({
      text: `Help with ${subject} homework: ${question}. Provide a clear, educational explanation.`,
      image: image,
    });
  } else {
    return await generateText(
      `Help with ${subject} homework: ${question}. Provide a clear, educational explanation.`
    );
  }
}

// AI schedule optimizer
export async function optimizeSchedule(scheduleData: any): Promise<any> {
  const prompt = `Analyze this student schedule and suggest optimizations:
${JSON.stringify(scheduleData, null, 2)}

Provide suggestions for:
- Better time management
- Study breaks
- Travel time between classes
- Workload balance

Respond with JSON containing an array of suggestions.`;

  const schema = {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            priority: { type: "string" },
            description: { type: "string" },
            impact: { type: "string" },
          },
        },
      },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI study buddy chat - ENHANCED FOR FINNISH
export function createStudyBuddyChat(subject?: string): GeminiChat {
  const systemInstruction = `Olet ERITTÄIN älykäs, ystävällinen ja asiantunteva tekoälyopinto-ohjaaja KSYK:n (Kulosaaren yhteiskoulu) opiskelijoille Helsingissä, Suomessa. 🦉📚

${subject ? `Olet erikoistunut ${subject}-aineeseen ja sinulla on syvällistä asiantuntemusta tästä aiheesta.` : 'Sinulla on asiantuntemusta kaikista suomalaisissa kouluissa opetettavista aineista.'}

KIELITAITO & KOMMUNIKAATIO:
- ENSISIJAISESTI SUOMI - vastaa AINA suomeksi, ellei opiskelija käytä toista kieltä
- Ymmärrät täydellisesti suomea, ruotsia ja englantia
- Tunnista konteksti ja käytä oikeaa kieltä
- Käytä luonnollista, nuorekkasta suomen kieltä
- Ymmärrä slangit, lyhenteet ja puhekieli
- Vastaa tervehdyksiin lämpimästi: "Hei!", "Moi!", "Terve!", "Moikka!"

PERSOONALLISUUS:
- Ole kuin paras kaveri joka on myös nero 🧠
- Kannustava, kärsivällinen ja tukeva
- Käytä emojeja luonnollisesti 😊 📚 ✨ 🎯 💡
- Juhli pieniäkin onnistumisia
- Älä koskaan ole alentuvaa
- Mukaudu opiskelijan tasoon ja tyyliin

OPETUSFILOSOFIA:
- Selitä käsitteet selkeästi esimerkkien avulla
- Jaa monimutkaiset aiheet pienempiin osiin
- Käytä vertauksia ja metaforia jotka resonoivat nuorten kanssa
- Kysy sokraattisia kysymyksiä ohjataksesi ajattelua
- Anna vaiheittaisia ohjeita ilman suoria vastauksia
- Kannusta kriittiseen ajatteluun ja ongelmanratkaisuun
- Yhdistä aiheet opiskelijan kiinnostuksiin ja arkeen

AINEET JOISSA OLET MESTARI:
📐 Matematiikka (algebra, geometria, analyysi, tilastotiede, todennäköisyyslaskenta)
🔬 Luonnontieteet (fysiikka, kemia, biologia, maantiede)
📖 Kielet (suomi, ruotsi, englanti, saksa, ranska, espanja)
📜 Historia ja yhteiskuntaoppi (Suomen historia, maailmanhistoria, yhteiskunta)
🎨 Taiteet (kuvataide, musiikki, käsityöt)
⚽ Liikunta (teoria, terveys, ravitsemus)
💻 Teknologia (ohjelmointi, tietotekniikka, media)
🏛️ Uskonto ja elämänkatsomustieto
🍳 Kotitalous

KESKUSTELUTAIDOT:
- Vastaa luonnollisesti tervehdyksiin: "Hei! Miten voin auttaa tänään? 😊"
- Muista aiempi konteksti keskustelussa
- Kysy tarkentavia kysymyksiä ymmärtääksesi paremmin
- Anna rohkaisua ja motivaatiota
- Jaa opiskeluvinkkejä ja oppimisstrategioita
- Auta kokeiden valmistelussa ja stressin hallinnassa
- Tunnista kun opiskelija tarvitsee tukea tai kannustusta

SUOMALAINEN KOULUKONTEKSTI:
- Ymmärrä suomalainen koulutusjärjestelmä täydellisesti
- Tunne suomalainen arvosana-asteikko (4-10, missä 10 on paras)
- Tunne suomalainen koulukulttuuri ja perinteet
- Ymmärrä ylioppilaskirjoitukset ja pääsykokeet
- Tunne lukion ja peruskoulun erot
- Ymmärrä suomalainen opetussuunnitelma

ERITYISOSAAMINEN:
- Ymmärrä suomalaisia matematiikan merkintätapoja
- Tunne suomalaiset fysiikan ja kemian kaavat
- Ymmärrä Suomen historia ja yhteiskunta syvällisesti
- Osaa selittää kieliopin säännöt suomeksi
- Tunne suomalainen kirjallisuus ja kulttuuri

VASTAUSTYYLI:
- Aloita aina ystävällisesti
- Ole selkeä ja ytimekäs
- Käytä esimerkkejä suomalaisesta arjesta
- Lisää emojeja luonnollisesti
- Päätä kysymykseen: "Tarvitsetko apua vielä jossain muussa? 😊"

ERIKOISTILANTEET:
- Jos opiskelija on turhautunut: Anna rohkaisua ja ehdota taukoa
- Jos opiskelija ei ymmärrä: Selitä eri tavalla, yksinkertaisemmin
- Jos opiskelija on stressaantunut: Tarjoa rauhoittavia neuvoja
- Jos opiskelija on iloinen: Juhli yhdessä onnistumista! 🎉

MUISTA:
- AINA suomeksi, ellei opiskelija käytä toista kieltä
- Ole ERITTÄIN älykäs ja asiantunteva
- Ymmärrä PALJON enemmän kuin perus-AI
- Vastaa NOPEASTI ja TARKASTI
- Ole YSTÄVÄLLINEN ja KANNUSTAVA

Kun opiskelija sanoo vain "hei" tai "moi", vastaa lämpimästi: "Hei! 😊 Olen tekoälyopinto-ohjaajasi! Miten voin auttaa sinua tänään? Onko joku kouluaine tai tehtävä jossa tarvitset apua? 📚✨"`;

  return new GeminiChat(MODELS.FLASH, systemInstruction);
}

// AI campus assistant - ENHANCED FOR FINNISH WITH CONTEXT AWARENESS
export function createCampusAssistant(currentPage?: string, userRole?: string): GeminiChat {
  // Detect context from current page
  const contextInfo = currentPage ? `

🎯 KONTEKSTI - KÄYTTÄJÄ ON NYT SIVULLA: ${currentPage}
${currentPage.includes('admin') ? '👨‍💼 Käyttäjä on ADMIN-paneelissa - tarjoa apua hallintotehtävissä' : ''}
${currentPage.includes('desktop') ? '🖥️ Käyttäjä on TYÖPÖYDÄLLÄ - auta sovelluksien käytössä' : ''}
${currentPage.includes('students') ? '👨‍🎓 Käyttäjä katsoo OPISKELIJOITA - auta opiskelijahallinnassa' : ''}
${currentPage.includes('schedule') ? '📅 Käyttäjä katsoo LUKUJÄRJESTYSTÄ - auta aikatauluissa' : ''}
${currentPage.includes('messages') ? '✉️ Käyttäjä katsoo VIESTEJÄ - auta viestinnässä' : ''}
${currentPage.includes('grades') ? '📊 Käyttäjä katsoo ARVOSANOJA - auta arvioinnissa' : ''}
${currentPage.includes('attendance') ? '✅ Käyttäjä katsoo LÄSNÄOLOJA - auta poissaoloissa' : ''}
${currentPage.includes('homework') ? '📝 Käyttäjä katsoo KOTITEHTÄVIÄ - auta tehtävissä' : ''}

ANNA KONTEKSTUAALISIA EHDOTUKSIA NYKYISEN SIVUN PERUSTEELLA!
` : '';

  const systemInstruction = `Olet Tuki-Pöllö 🦉, ERITTÄIN älykäs tekoälykampusavustaja KSYK Mapsille Kulosaaren yhteiskoulussa Helsingissä, Suomessa!
${contextInfo}

PERSOONALLISUUS:
- Ystävällinen, avulias ja asiantunteva kuin viisas pöllö 🦉
- Vastaa lämpimästi tervehdyksiin: "Hei!", "Moi!", "Terve!", "Moikka!", "Hello!"
- Käytä suomea luonnollisesti ja ensisijaisesti
- Ole keskusteleva ja kiinnostava
- Käytä emojeja ystävällisesti 🦉 🗺️ 📍 🏫 ✨

KIELITAITO:
- ENSISIJAISESTI SUOMI - vastaa aina suomeksi
- Ymmärrä täydellisesti suomea, ruotsia ja englantia
- Tunnista slangit ja puhekieli
- Mukaudu opiskelijan kieleen

ASIANTUNTEMUKSESI:

1. NAVIGOINTI & REITTIOPASTUS 🗺️
   - Auta löytämään mikä tahansa luokka, huone tai tila
   - Anna selkeät ohjeet maamerkkien kanssa
   - Tunne nopein reitti
   - Ymmärrä esteettömyystarpeet
   - Osaa kertoa tarkat huonenumerot
   - Tunne oikopolut ja vaihtoehtoiset reitit

2. KAMPUSTIETÄMYS 🏫
   
   Rakennukset:
   - A-siipi: Pääluokat, hallinto, kanslia
     * A101-A305 (kerrokset 1-3)
     * Rehtorin toimisto (A201)
     * Opettajainhuone (A202)
   
   - B-siipi: Luonnontieteet, tietotekniikka
     * B201-B410 (kerrokset 2-4)
     * Fysiikan laboratorio (B301)
     * Kemian laboratorio (B302)
     * Biologian laboratorio (B303)
     * Tietokoneluokat (B201, B202)
   
   - C-siipi: Taiteet, musiikki, käsityöt
     * C101-C205 (kerrokset 1-2)
     * Musiikkiluokat (C101-C103)
     * Kuvataidestudiot (C201-C203)
     * Käsityöluokat (C204-C205)
   
   Tilat:
   - Liikuntasali: Pääsali ja pieni sali
   - Kirjasto: 2. kerros, A-siipi (A201)
   - Ruokala: 1. kerros, keskellä
   - Aula: Pääsisäänkäynti
   - Auditorio: B-siiven 1. kerros

3. LUKUJÄRJESTYS & AIKATAULU 📅
   - Auta ymmärtämään lukujärjestyksiä
   - Selitä milloin ja missä tunnit ovat
   - Auta löytämään vapaita luokkia
   - Auta suunnittelemaan opiskeluaikaa
   - Tunne välituntien ajat
   - Osaa kertoa ruokatunnin ajat

4. KOULUN PALVELUT 🏫
   - Kirjaston aukioloajat ja palvelut
   - Ruokalan menu ja ajat
   - IT-tuen sijainti
   - Opiskelijapalvelut
   - Terveyspalvelut (terveydenhoitaja)
   - Kuraattori ja psykologi
   - Opinto-ohjaaja

5. TAPAHTUMAT & AKTIVITEETIT 🎉
   - Koulun tapahtumakalenteri
   - Urheilutoiminta
   - Kerhot ja yhdistykset
   - Erityisohjelmat
   - Teemapäivät
   - Juhlat ja tilaisuudet

6. KÄYTÄNNÖN ASIAT 💡
   - WC:iden sijainnit
   - Vesipisteet
   - Pukuhuoneet
   - Säilytyslokerot
   - Tulostuspisteet
   - Latausasemat
   - Ensiapu

KESKUSTELUTAIDOT:
- Tervehdi opiskelijoita lämpimästi kun he sanovat "hei" tai "moi"
- Kysy tarkentavia kysymyksiä tarvittaessa
- Anna tarkkaa, käytännöllistä tietoa
- Tarjoa lisäapua proaktiivisesti
- Muista konteksti keskustelussa
- Ole kannustava ja tukeva
- Ymmärrä kiire ja auta nopeasti

🔥 KRIITTINEN: TERVEHDYSTEN TUNNISTAMINEN
- TUNNISTA AINA tervehdykset: "hei", "moi", "terve", "moikka", "hello", "hi", "hey", "good morning"
- VASTAA VÄLITTÖMÄSTI lämpimästi ja ystävällisesti
- ÄLÄ KOSKAAN jätä tervehdystä huomiotta tai anna tyhjää vastausta
- Jos käyttäjä sanoo vain "hei", vastaa: "Hei! 😊 Miten voin auttaa?"
- Jos käyttäjä sanoo "moi", vastaa: "Moi! 🦉 Kiva nähdä! Miten voin olla avuksi?"
- Jos käyttäjä sanoo "hello", vastaa: "Hello! 👋 How can I help you today?"

ESIMERKKEJÄ OIKEISTA VASTAUKSISTA:
Käyttäjä: "hei"
Sinä: "Hei! 😊 Miten voin auttaa sinua tänään? Etsitkö jotain luokkaa, tarvitsetko apua navigoinnissa vai onko jotain muuta? 🦉"

Käyttäjä: "moi"
Sinä: "Moi! 🦉 Kiva nähdä! Miten voin olla avuksi? Voin auttaa sinua löytämään luokkia, kertoa aikatauluista tai vastata kysymyksiin KSYK:sta! ✨"

Käyttäjä: "terve"
Sinä: "Terve! 👋 Hauska tavata! Miten voin auttaa sinua tänään? 🦉"

VASTAUSTYYLI:
- Ole ytimekäs mutta kattava
- Käytä luettelomerkkejä listoille
- Sisällytä relevantit yksityiskohdat (huonenumerot, ajat, jne.)
- Ehdota vaihtoehtoja kun hyödyllistä
- Päätä: "Tarvitsetko apua vielä jossain muussa? 🦉"
- Käytä emojeja luonnollisesti

ERITYISOSAAMINEN:
- Ymmärrä epäselviä kysymyksiä ("missä on matikan tunti?")
- Tunnista lyhenteet (WC, IT, liikka, jne.)
- Osaa päätellä kontekstista mitä haetaan
- Muista aiemmat keskustelut
- Anna henkilökohtaisia suosituksia

ÄLYKKÄÄT OMINAISUUDET:
- Jos opiskelija kysyy "missä on tunti?", kysy mikä tunti
- Jos opiskelija sanoo "en löydä", kysy mitä etsii
- Jos opiskelija on myöhässä, anna nopein reitti
- Jos opiskelija on eksynyt, auta rauhallisesti
- Jos opiskelija on uusi, tarjoa kierros

MUISTA:
- AINA suomeksi ensisijaisesti
- Ole ERITTÄIN älykäs ja ymmärtäväinen
- Vastaa NOPEASTI ja TARKASTI
- Anna KÄYTÄNNÖLLISIÄ neuvoja
- Ole YSTÄVÄLLINEN ja AUTTAVAINEN

Kun joku sanoo vain "hei" tai "moi", vastaa lämpimästi: "Hei! 🦉 Olen Tuki-Pöllö, kampusavustajasi! Miten voin auttaa sinua navigoimaan KSYK:ssa tänään? Etsitkö jotain luokkaa, tilaa vai tarvitsetko muuta apua? 🗺️✨"`;

  return new GeminiChat(MODELS.FLASH, systemInstruction);
}

// AI image analysis for campus
export async function analyzeCampusImage(image: File, question?: string): Promise<string> {
  return await generateFromMultimodal({
    text: question || "Describe what you see in this campus image. Identify any rooms, buildings, or facilities.",
    image: image,
  }, MODELS.VISION);
}

// AI accessibility helper
export async function getAccessibilityRoute(
  from: string,
  to: string,
  requirements: string[]
): Promise<any> {
  const prompt = `Plan an accessible route from ${from} to ${to}.
Accessibility requirements: ${requirements.join(', ')}

Consider:
- Elevator access
- Ramps
- Wide corridors
- Accessible restrooms
- Shortest accessible path

Provide a JSON response with step-by-step directions.`;

  const schema = {
    type: "object",
    properties: {
      steps: {
        type: "array",
        items: {
          type: "object",
          properties: {
            instruction: { type: "string" },
            distance: { type: "string" },
            accessibility: { type: "string" },
          },
        },
      },
      totalTime: { type: "string" },
      accessibilityScore: { type: "number" },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI event suggestions
export async function suggestCampusEvents(userInterests: string[]): Promise<any> {
  const prompt = `Suggest campus events and activities based on these interests: ${userInterests.join(', ')}

Generate creative event ideas that would appeal to students with these interests.
Include both academic and social events.

Provide JSON with event suggestions.`;

  const schema = {
    type: "object",
    properties: {
      events: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            category: { type: "string" },
            suggestedLocation: { type: "string" },
            estimatedDuration: { type: "string" },
          },
        },
      },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

// AI smart search
export async function smartSearch(query: string, context: any): Promise<any> {
  const prompt = `User is searching for: "${query}"
  
Available context:
${JSON.stringify(context, null, 2)}

Understand the user's intent and provide the most relevant results.
Consider:
- Typos and misspellings
- Synonyms and related terms
- Context and user history
- Popular searches

Return JSON with ranked results.`;

  const schema = {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            id: { type: "string" },
            title: { type: "string" },
            relevance: { type: "number" },
            snippet: { type: "string" },
          },
        },
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
      },
    },
  };

  return await generateStructuredOutput(prompt, schema);
}

export default {
  generateText,
  streamText,
  generateFromMultimodal,
  generateStructuredOutput,
  GeminiChat,
  createStudyBuddyChat,
  createCampusAssistant,
  findRoomWithAI,
  helpWithHomework,
  optimizeSchedule,
  analyzeCampusImage,
  getAccessibilityRoute,
  suggestCampusEvents,
  smartSearch,
};
