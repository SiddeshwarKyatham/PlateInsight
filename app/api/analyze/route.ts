import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function extractMimeAndBase64(imageInput: string) {
  let base64Image = imageInput;
  let mimeType = "image/jpeg";

  if (imageInput.startsWith("data:")) {
    const matches = imageInput.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    if (matches && matches.length > 1) {
      mimeType = matches[1];
    }
    base64Image = imageInput.replace(/^data:image\/\w+;base64,/, "");
  }

  return { base64Image, mimeType };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, image_url: imageUrl, menu_items: menuItems = [] } = body;

    if (!image && !imageUrl) {
      return NextResponse.json({ error: "No image provided (image or image_url required)" }, { status: 400 });
    }

    let base64Image = "";
    let mimeType = "image/jpeg";

    if (imageUrl) {
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        return NextResponse.json({ error: "Failed to fetch image_url for analysis" }, { status: 400 });
      }
      const arrBuf = await imageRes.arrayBuffer();
      base64Image = Buffer.from(arrBuf).toString("base64");
      const fetchedType = imageRes.headers.get("content-type");
      if (fetchedType) {
        mimeType = fetchedType;
      }
    } else {
      const parsed = extractMimeAndBase64(image);
      base64Image = parsed.base64Image;
      mimeType = parsed.mimeType;
    }

    const prompt = `You are an expert food analyzer working for a cafeteria waste tracking system.
    Analyze this image of a student's plate after they have finished eating.
    Identify the distinct dishes left on the plate.
    For each dish, estimate what percentage of a typical full portion of that dish is remaining (wasted).
    Use the provided session menu as the canonical list when possible.

    Session menu items: ${Array.isArray(menuItems) ? menuItems.join(", ") : ""}

    Return ONLY a raw JSON array. Do not include any markdown formatting like \`\`\`json.
    The array must contain objects exactly explicitly following this specific structure:
    [
      {
        "name": "Name of the dish (e.g., Rice, Dal, Chicken Curry)",
        "wastePercent": an integer between 0 and 100 representing the estimated percentage wasted,
        "foodType": "veg" or "nonveg" or null
      }
    ]

    If nothing is on the plate, return []. If you cannot identify the dishes but there is food, use generic names like "Main Dish" or "Side".`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
          temperature: 0.1, // Keep it deterministic
      }
    });

    const aiText = response.text || "[]";
    console.log("Gemini Raw Response:", aiText);

    // Clean up any potential markdown formatting the AI might still inject
    const cleanedJsonString = aiText.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsed = JSON.parse(cleanedJsonString);
      const dishes = Array.isArray(parsed)
        ? parsed.map((dish: any) => ({
            name: String(dish?.name || "Unknown Dish"),
            wastePercent: Math.max(0, Math.min(100, Number(dish?.wastePercent || 0))),
            foodType: dish?.foodType === "veg" || dish?.foodType === "nonveg" ? dish.foodType : null,
          }))
        : [];
      return NextResponse.json({ dishes });
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", cleanedJsonString);
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Gemini Vision API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze image" },
      { status: 500 }
    );
  }
}
