import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const maxDuration = 120;

const STYLE_DESCRIPTORS: Record<string, string> = {
  fantasy:
    "Background mood: a grounded fantasy environment with real setting detail such as a forest path, quiet courtyard, stone hall, cliffside, market lane, or camp at dusk.",
  modern:
    "Background mood: a believable contemporary place such as a studio, street, cafe, apartment, rooftop, or city walkway with depth.",
  "fantasy-modern":
    "Background mood: a grounded cinematic setting where modern life meets subtle fantasy.",
  celestial:
    "Background mood: moonlit, airy, luminous, and environmental rather than abstract cosmic voids.",
  royal:
    "Background mood: elegant architectural spaces such as palace corridors, gardens, libraries, galleries, or terraces.",
  streetwear:
    "Background mood: vivid urban environments such as sidewalks, murals, storefronts, train platforms, and city corners.",
  futuristic:
    "Background mood: sleek futuristic environments such as transit hubs, observation decks, city streets, or interior corridors.",
  nature:
    "Background mood: a natural environment with real landscape detail such as forest clearings, coastlines, gardens, mountains, or rain-soaked paths.",
  default:
    "Background mood: a coherent environment with real depth and scene detail that fits the user’s chosen theme and character concept.",
};

function normalizeDetail(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[,.;:\s]+|[,.;:\s]+$/g, "")
    .trim();
}

function normalizeStyleKey(styleKey?: string): string {
  return normalizeDetail(styleKey || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

function normalizeFeedback(value?: string): string {
  return normalizeDetail(value || "").slice(0, 1200);
}

function hasCompanionSignal(details: string): boolean {
  const lower = details.toLowerCase();
  return /\bpok[eé]mon-style\b|\bcompanion\b|\bcreature\b|\bfamiliar\b|\bpet\b|\banimal companion\b|\bspirit companion\b|\bsidekick\b|\bby her side\b|\bby his side\b|\bby their side\b|\bon her shoulder\b|\bon his shoulder\b|\bon their shoulder\b|\bfloating beside\b|\borbiting around\b|\bcircling around\b|\brabbit\b|\bbunny\b|\bhare\b|\bfox\b|\bwolf\b|\bcat\b|\bkitten\b|\bdog\b|\bpuppy\b|\bowl\b|\bbird\b|\bcrow\b|\braven\b|\bfalcon\b|\bhawk\b|\bbutterfly\b|\bmoth\b|\bdragon\b|\bdragonet\b|\bserpent\b|\bsnake\b|\bferret\b|\bdeer\b|\bstag\b|\bgoat\b|\blamb\b|\btiger\b|\blion\b|\bleopard\b|\bpanther\b/.test(
    lower
  );
}

function softenPromptForImageSafety(value: string): string {
  return value
    .replace(/\bpok[eé]mon-style\b/gi, "cute magical creature-companion")
    .replace(/\bpok[eé]mon\b/gi, "whimsical creature-companion");
}

function looksLikeFullAvatarDescription(feedback: string): boolean {
  const lower = feedback.toLowerCase();
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  const signals = [
    /\bfull body\b|\bhead to toe\b|\bupright\b|\bfacing forward\b/.test(lower),
    /\bwearing\b|\bdressed\b|\boutfit\b|\bgown\b|\bhoodie\b|\bcargo\b|\bheels\b/.test(lower),
    /\bhair\b|\beyes\b|\bskin\b|\bglasses\b/.test(lower),
    /\bstaff\b|\bsword\b|\bholding\b|\bweapon\b/.test(lower),
    /\bcompanion\b|\bcreature\b|\bpokemon-style\b|\bfamiliar\b/.test(lower),
    /\bbackground\b|\bforest\b|\barcane\b|\bcinematic\b|\b3d\b/.test(lower),
  ].filter(Boolean).length;

  return wordCount >= 25 && signals >= 3;
}

function requestsWholeNewAvatar(feedback: string): boolean {
  if (!feedback) return false;
  return (
    /\b(whole new avatar|completely new avatar|entirely new avatar|totally new avatar|brand new avatar|start over|from scratch|completely different|totally different|change everything|different person|new character)\b/i.test(
      feedback
    ) || looksLikeFullAvatarDescription(feedback)
  );
}

function requestsCompanionAddition(feedback: string): boolean {
  const lower = feedback.toLowerCase();
  return (
    hasCompanionSignal(feedback) &&
    /\b(add|include|with|give|has|have|put)\b/.test(lower)
  );
}

function buildIdentityInstruction(details: string): string {
  const lower = details.toLowerCase();
  if (
    /\b(princess|queen|duchess|empress|goddess|girl|woman|lady|female|feminine|she\/her|she|her)\b/.test(
      lower
    )
  ) {
    return "Render a feminine female-presenting character if that is what the user described. Never swap to a male character.";
  }
  if (
    /\b(prince|king|duke|emperor|god\b|boy|man|male|masculine|he\/him|he|him)\b/.test(
      lower
    )
  ) {
    return "Render a masculine male-presenting character if that is what the user described. Never swap to a female character.";
  }
  return "Preserve the gender and identity words the user provided. Never swap roles or identity markers.";
}

function buildCompanionRules(details: string): string[] {
  const lower = details.toLowerCase();
  const hasCompanion = hasCompanionSignal(details);

  if (!hasCompanion) return [];

  const rules = [
    "The companion is a required part of the character design, not optional background decoration.",
    "The companion must be clearly visible, readable, and intentionally placed in the composition.",
    "Treat this as a two-subject composition: the main character plus the companion.",
    "Reserve visible frame space for the companion instead of letting the main figure fill the entire composition.",
    "The companion must not be tiny, hidden, cropped out, merged into the background, or reduced to an unreadable silhouette.",
    "Keep the companion cute, magical, expressive, and emotionally bonded to the character if that was described.",
  ];

  if (/\bshoulder\b/.test(lower)) {
    rules.push(
      "Keep the companion on or very near the shoulder if that was described."
    );
  }
  if (
    /\bfly\b|\bflying\b|\bflutter\b|\bfluttering\b|\borbit\b|\borbiting\b|\bcircling\b|\baround her\b|\baround him\b|\baround them\b/.test(
      lower
    )
  ) {
    rules.push(
      "If the companion was described as flying, fluttering, circling, or orbiting, show that sense of motion clearly."
    );
  }
  if (/\bglow\b|\bglowing\b|\bluminous\b|\bmagical energy\b/.test(lower)) {
    rules.push(
      "Preserve the companion’s magical glow or luminous energy if it was described."
    );
  }
  if (/\bcolor\b|\bpalette\b|\bvibe\b/.test(lower)) {
    rules.push(
      "If the companion’s colors were described as matching the character’s vibe or palette, keep that harmony."
    );
  }
  if (/\bsmall\b|\btiny\b|\blittle\b/.test(lower)) {
    rules.push(
      "If the companion was described as small, keep it small but still clearly readable in the frame."
    );
  }

  return rules;
}

function buildPreservationClauses(details: string): string[] {
  const lower = details.toLowerCase();
  const rules: string[] = [];

  const speciesMatch = lower.match(
    /\b(pixie|fairy|elf|angel|mermaid|vampire|witch|mage|sorcerer|warrior|princess|queen|goddess|demon|android|cyborg)\b/
  );
  if (speciesMatch) {
    rules.push(
      `Do not remove or replace the ${speciesMatch[1]} identity if it was described.`
    );
  }

  if (
    /\bblack\b|\bwhite\b|\basian\b|\blatina\b|\blatino\b|\bbrown\b|\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\bice blue skin\b|\bblue skin\b/.test(
      lower
    )
  ) {
    rules.push(
      "Do not change the described race, ethnicity, species skin color, complexion, or skin tone."
    );
  }
  if (
    /\bhair\b|\bbraid|\bbraids|\blocs\b|\bdreads\b|\bcurls\b|\bafro\b|\bponytail\b|\bbangs\b/.test(
      lower
    )
  ) {
    rules.push(
      "Do not remove or replace the described hairstyle, hair length, or hair color."
    );
  }
  if (/\beyes?\b/.test(lower)) {
    rules.push("Do not change the described eye color or eye emphasis.");
  }
  if (/\bglasses\b/.test(lower)) {
    rules.push("Do not remove the glasses if they were described.");
  }
  if (/\btattoo|\btattoos\b/.test(lower)) {
    rules.push("Do not remove the tattoos if they were described.");
  }
  if (
    /\bwings?\b|\belf ears?\b|\bpointed ears?\b|\bhorns?\b|\btail\b/.test(lower)
  ) {
    rules.push("Do not remove the described fantasy body features if they were described.");
  }
  if (hasCompanionSignal(details)) {
    rules.push("Do not remove the companion if it was described.");
  }
  if (
    /\bstaff\b|\bsword\b|\bweapon\b|\bwand\b|\bbook\b|\borb\b/.test(lower)
  ) {
    rules.push("Do not remove the described prop or object if it was described.");
  }
  if (
    /\bhoodie\b|\bcargo pants?\b|\bstreetwear\b|\bvest\b|\bgown\b|\bdress\b|\brobes?\b|\barmor\b|\bheels\b|\bboots\b/.test(
      lower
    )
  ) {
    rules.push(
      "Do not replace the described outfit category, styling, or footwear."
    );
  }
  if (
    /\boutfit\b|\bfashion\b|\bwearing\b|\bdressed\b|\bstyle\b/.test(lower)
  ) {
    rules.push(
      "Preserve the fashion direction exactly as described. The user’s clothing and styling choices take priority over default beauty, fantasy, or mood cues."
    );
  }
  if (/\bfull body\b|\bhead to toe\b|\bheels visible\b|\bfeet visible\b/.test(lower)) {
    rules.push("Do not crop the body if full-body framing was described.");
  }

  return [...rules, ...buildCompanionRules(details)];
}

function buildAccuracyGuard(details: string): string {
  const lower = details.toLowerCase();
  const rules: string[] = buildPreservationClauses(details);
  const hasExplicitSkinDescription =
    /\bblack\b|\bwhite\b|\basian\b|\blatina\b|\blatino\b|\bbrown skin\b|\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\blight skin\b|\bfair skin\b|\bpale skin\b|\btan skin\b|\bolive skin\b|\bblue skin\b|\bice blue skin\b|\bgolden skin\b/.test(
      lower
    );

  if (/\bblack\b/.test(lower)) {
    rules.push("If the user described a Black person, the character must visibly read as Black.");
  }
  if (
    /\bdark skin\b|\bdark-skinned\b|\bdeep brown skin\b|\bbrown skin\b/.test(
      lower
    )
  ) {
    rules.push(
      "Keep the described dark or deep-brown skin tone true to the user’s description."
    );
  }
  if (/\bblue skin\b|\bice blue skin\b/.test(lower)) {
    rules.push(
      "Keep the described fantasy skin color exactly as written."
    );
  }
  if (/\bglasses\b/.test(lower)) {
    rules.push("Glasses are required if they were described.");
  }
  if (hasCompanionSignal(details)) {
    rules.push(
      "A companion is required in the image if it was described."
    );
    rules.push(
      "If necessary, make the main figure slightly smaller in frame so both the character and companion are clearly visible."
    );
  }
  if (
    /\bstaff\b|\bsword\b|\bweapon\b|\bwand\b|\bbook\b|\borb\b/.test(lower)
  ) {
    rules.push(
      "The described prop or object must be visibly present if it was described."
    );
  }
  if (!hasExplicitSkinDescription) {
    rules.push(
      "If the user did not specify a skin tone or complexion, choose one intentionally for this specific character and keep it natural to the concept. Do not default to the same complexion across different users."
    );
  }

  rules.push(
    "Do not drift toward a generic pretty portrait or a nearby approximation. Match the user description specifically."
  );
  return rules.join("\n");
}

function buildArtStyleInstruction(details: string, styleKey?: string): string {
  return [
    "High-end cinematic stylized 3D character illustration with painterly surfaces, sculpted forms, rich atmospheric depth, and prestige animated energy in the spirit of Arcane.",
    "The image must read clearly as stylized 3D fantasy art, not photography, not semi-realistic portrait art, and not a live-action person.",
    "Use hand-painted texture treatment, graphic shape language, intentional stylization, expressive features, and art-directed lighting.",
    "Avoid photo-like skin texture, hyper-real pores, naturalistic camera realism, generic beauty-retouch realism, or soft semi-real portrait rendering.",
    "Keep facial structure, skin rendering, hair rendering, and costume rendering visibly stylized and illustrative while still polished, dimensional, and high-end.",
    "Not photoreal. Not semi-realistic. Not flat cartoon.",
  ].join("\n");
}

function buildAvatarPrompt(detailsInput: string[], styleKey?: string): string {
  const details = detailsInput
    .map((a) => softenPromptForImageSafety(normalizeDetail(a)))
    .filter(Boolean)
    .join(", ");
  const normalizedStyle = normalizeStyleKey(styleKey);
  const backgroundMood =
    STYLE_DESCRIPTORS[normalizedStyle] || STYLE_DESCRIPTORS.default;
  const identityInstruction = buildIdentityInstruction(details);
  const accuracyGuard = buildAccuracyGuard(details);
  const artStyleInstruction = buildArtStyleInstruction(details, styleKey);

  return `
SUBJECT:
Render this character exactly as described: ${details || "a mysterious figure"}.

IDENTITY:
${identityInstruction}
The user description is the source of truth. If any later instruction conflicts with the user description, follow the user description.

CLOTHING, HAIR, FEATURES:
Render every clothing item, hairstyle, hair color, skin tone, glasses, shoes, companion, and held object exactly as described.
Do not substitute, simplify, modernize, fantasy-wash, or pretty-wash away specific details.
Do not let the background or style override the user's outfit, hair, skin, race, or companion description.
Do not borrow traits, species, outfits, colors, companions, or aesthetics from prior examples, other users, or hidden references.
Do not invent extra accessories, props, hairstyles, makeup, tattoos, armor pieces, jewelry, companions, or background story elements unless the user asked for them.

ART STYLE:
${artStyleInstruction}
Lean toward bold stylization over realism in every part of the rendering.
No watermarks. No text. No labels.

COMPOSITION:
Vertical portrait, always full body, upright, facing forward by default.
Head at top of frame, feet at bottom of frame.
Show the entire figure head to toe with visible shoes or feet.
Never crop into a bust, half body, or beauty shot unless explicitly requested.
Never rotate the figure sideways.
Full-body head-to-toe visibility is the default rule for avatar generation.

BACKGROUND:
${backgroundMood}
Use a coherent place with environmental depth, not a generic glow field or abstract void.
Avoid halos, magic circles, random signage, UI, labels, or unrelated accessories unless explicitly requested.
If the user did not describe a background, keep the background supportive and secondary so the avatar itself stays faithful and readable.

COMPANION:
If a companion, pet, familiar, or creature was described, it is required in the image and must be clearly visible.
If a companion was described as flying, fluttering, circling, or orbiting, show that motion clearly instead of placing it like a static prop.
If a companion was described, compose the image so the companion is immediately readable on first glance.
Reduce the character's scale slightly if needed so the companion fits naturally in frame.

NON-NEGOTIABLE ACCURACY CHECK:
${accuracyGuard}
`.trim();
}

function buildVisionAnchoredEditPrompt(
  currentAvatarSummary: string,
  feedback: string,
  identityDescription?: string,
  styleKey?: string
): string
{
  // Compose a prompt for vision-anchored avatar editing
  let prompt = `You are editing an avatar image based on the following feedback and context.\n`;
  if (identityDescription) {
    prompt += `Identity Description: ${identityDescription}\n`;
  }
  prompt += `Current Avatar Summary: ${currentAvatarSummary}\n`;
  prompt += `Feedback: ${feedback}\n`;
  if (styleKey) {
    prompt += `Style Key: ${styleKey}\n`;
  }
  prompt += `\nEdit the avatar image to address the feedback while preserving the core identity and style. Ensure all changes are visually clear and faithful to the user's intent.`;
  return prompt;
}

type GenerateAvatarBody = {
  answers?: unknown;
  feedback?: unknown;
  mode?: unknown;
  previousImageUrl?: unknown;
  editCurrentAvatar?: unknown;
  forceNewAvatar?: unknown;
  identityDescription?: unknown;
  style?: unknown;
  userId?: unknown;
};

function normalizeAnswerList(answers: unknown): string[] {
  if (Array.isArray(answers)) {
    return answers
      .map((value) => normalizeDetail(String(value || "")))
      .filter(Boolean)
      .slice(0, 12);
  }

  if (answers && typeof answers === "object") {
    return Object.entries(answers as Record<string, unknown>)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, value]) => normalizeDetail(String(value || "")))
      .filter(Boolean)
      .slice(0, 12);
  }

  return [];
}

function buildCurrentAvatarSummary(
  answers: string[],
  identityDescription?: string
): string {
  const parts = [
    normalizeDetail(identityDescription || ""),
    ...answers.map((answer) => normalizeDetail(answer)),
  ].filter(Boolean);

  return parts.join(", ") || "A stylized full-body avatar";
}

function toDataUrl(b64: string, format: string = "png"): string {
  return `data:image/${format};base64,${b64}`;
}

async function fetchImageAsFile(imageUrl: string): Promise<File> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not fetch previous avatar image (${response.status})`);
  }

  const blob = await response.blob();
  const mimeType = blob.type || "image/png";
  const extension = mimeType.split("/")[1] || "png";

  return new File([blob], `avatar-source.${extension}`, { type: mimeType });
}

function getOpenAIKey(): string | null {
  return process.env.OPENAI_API_KEY || process.env.SHORTAPI_KEY || null;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const openaiKey = getOpenAIKey();
    if (!openaiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY or SHORTAPI_KEY" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as GenerateAvatarBody;
    const answers = normalizeAnswerList(body?.answers);
    const feedback = normalizeFeedback(
      typeof body?.feedback === "string" ? body.feedback : ""
    );
    const identityDescription =
      typeof body?.identityDescription === "string"
        ? normalizeDetail(body.identityDescription)
        : "";
    const style =
      typeof body?.style === "string" ? normalizeDetail(body.style) : "";
    const mode = typeof body?.mode === "string" ? body.mode : "create";
    const previousImageUrl =
      typeof body?.previousImageUrl === "string"
        ? body.previousImageUrl.trim()
        : "";
    const editCurrentAvatar = Boolean(body?.editCurrentAvatar);
    const forceNewAvatar = Boolean(body?.forceNewAvatar);

    const detailInputs = [
      ...answers,
      identityDescription,
      style ? `Style direction: ${style}` : "",
      feedback && (mode === "create" || requestsWholeNewAvatar(feedback))
        ? `Additional direction: ${feedback}`
        : "",
    ].filter(Boolean);

    if (detailInputs.length === 0) {
      return NextResponse.json(
        { error: "No avatar details were provided." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const shouldEditExisting =
      mode === "reimagine" &&
      editCurrentAvatar &&
      !forceNewAvatar &&
      !requestsWholeNewAvatar(feedback) &&
      previousImageUrl;

    if (shouldEditExisting) {
      try {
        const sourceImage = await fetchImageAsFile(previousImageUrl);
        const editPrompt = buildVisionAnchoredEditPrompt(
          buildCurrentAvatarSummary(answers, identityDescription),
          feedback || "Refine the current avatar while preserving identity.",
          identityDescription,
          style
        );

        const edited = await openai.images.edit({
          model: "gpt-image-1",
          image: sourceImage,
          prompt: `${editPrompt}\n\n${buildAvatarPrompt(detailInputs, style)}`,
          quality: "high",
          size: "1024x1536",
        });

        const editedImage = edited.data?.[0];
        if (editedImage?.b64_json) {
          return NextResponse.json({
            imageUrl: toDataUrl(editedImage.b64_json),
            modeUsed: "edit",
          });
        }
        if (editedImage?.url) {
          return NextResponse.json({
            imageUrl: editedImage.url,
            modeUsed: "edit",
          });
        }
      } catch (error) {
        console.error("Avatar edit failed, falling back to fresh generation:", error);
      }
    }

    const prompt = buildAvatarPrompt(detailInputs, style);
    const generated = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      quality: "high",
      size: "1024x1536",
    });

    const image = generated.data?.[0];
    if (image?.b64_json) {
      return NextResponse.json({
        imageUrl: toDataUrl(image.b64_json),
        modeUsed: "generate",
      });
    }
    if (image?.url) {
      return NextResponse.json({
        imageUrl: image.url,
        modeUsed: "generate",
      });
    }

    return NextResponse.json(
      { error: "Image generation returned no image data." },
      { status: 502 }
    );
  } catch (error) {
    console.error("Generate avatar route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate avatar.",
      },
      { status: 500 }
    );
  }
}
