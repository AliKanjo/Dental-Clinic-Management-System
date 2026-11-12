const { z } = require('zod');
const { config } = require('../config/env');
const db = require('../db');
const { AppError } = require('../middleware/errorHandler');

const suggestedPlanResponseSchema = z.array(
  z.object({
    treatmentId: z.coerce.number().int().positive(),
    toothNumber: z.string().optional().default(''),
    notes: z.string().optional().default(''),
    cost: z.coerce.number().min(0),
  })
);

const optimizeNotesResponseSchema = z.object({
  formattedNotes: z.string(),
  allergies: z.string(),
});

function extractJsonText(rawText) {
  let cleaned = String(rawText || '').trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  return cleaned;
}

function safeParseJson(rawText, schema) {
  let parsed;
  try {
    parsed = JSON.parse(extractJsonText(rawText));
  } catch (err) {
    throw new AppError(502, 'AI provider returned invalid JSON.');
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new AppError(502, 'AI provider returned an unexpected response format.');
  }
  return validated.data;
}

async function callChatCompletion(messages) {
  if (!config.ai.apiKey) {
    throw new AppError(503, 'AI assistant is not configured.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);

  try {
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.2,
      }),
      signal: controller.signal,
    });

    const rawBody = await response.text();
    let aiData = null;
    try {
      aiData = JSON.parse(rawBody);
    } catch {
      aiData = null;
    }

    if (!response.ok) {
      throw new AppError(502, 'AI service request failed.');
    }

    const content = aiData?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new AppError(502, 'AI service returned an empty response.');
    }

    return content;
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err.name === 'AbortError') {
      throw new AppError(504, 'AI service request timed out.');
    }
    throw new AppError(502, 'Unable to reach AI service.');
  } finally {
    clearTimeout(timeout);
  }
}

async function suggestPlan(symptoms) {
  if (config.isTest) {
    return [
      {
        treatmentId: 2,
        toothNumber: '14',
        notes: 'AI Mock: Cavity composite restoration suggested.',
        cost: 150,
      },
    ];
  }

  const treatments = await db.query('SELECT * FROM treatments ORDER BY name ASC');
  const systemPrompt = `You are a professional dental care plan assistant.
Your task is to analyze the patient's symptoms or needs and suggest a structured dental treatment plan.
You must ONLY choose treatments from the following clinic catalog:
${JSON.stringify(treatments)}

For each suggested treatment item, specify:
1. The "treatmentId" matching the catalog item.
2. The "toothNumber" (1-32 for adult teeth, or "All" or a comma-separated list if multiple, or empty if general).
3. Short clinical "notes" justifying the choice.
4. The "cost" (should match the catalog's base_cost unless there is a reason to adjust it).

Respond ONLY with a valid JSON array of objects, containing:
[
  {
    "treatmentId": number,
    "toothNumber": "string",
    "notes": "string",
    "cost": number
  }
]
Do not include any markdown styling, triple backticks, or explanatory text. Just the raw JSON array.`;

  const content = await callChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: symptoms },
  ]);

  return safeParseJson(content, suggestedPlanResponseSchema);
}

async function optimizeNotes(notes) {
  if (config.isTest) {
    return {
      formattedNotes: '<p>AI Mock: Chief complaint of toothache.</p>',
      allergies: 'Penicillin',
    };
  }

  const systemPrompt = `You are a clinical dental records optimizer.
Your task is to take raw, messy clinical diagnostic notes inputted by the dentist, clean up spelling and grammar, and format them into a professional structure (e.g. Chief Complaint, Findings, Diagnosis).
Also, detect and extract any medical or drug allergies mentioned in the notes.

Respond ONLY with a valid JSON object matching the following schema:
{
  "formattedNotes": "string (formatted with HTML paragraphs/bullets, clean and professional)",
  "allergies": "string (comma-separated list of identified drug or medical allergies, or 'None' if none found)"
}
Do not include any markdown styling (like triple backticks or \`\`\`json) or chat explanations. Just raw JSON output.`;

  const content = await callChatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: notes },
  ]);

  return safeParseJson(content, optimizeNotesResponseSchema);
}

module.exports = {
  suggestPlan,
  optimizeNotes,
};

