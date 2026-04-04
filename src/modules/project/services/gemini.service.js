const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const logger = require('../../../shared/utils/logger');

let genAI = null;

const getGenAI = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

const getMimeType = (imagePath) => {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp'
  };
  return mimeTypes[ext] || 'image/png';
};


const generateImageFromSketch = async (sketchPath, prompt) => {
  try {
    const ai = getGenAI();

    const model = ai.getGenerativeModel({
      model: 'gemini-2.5-flash-image'
    });

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE, 
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    const absolutePath = path.resolve(sketchPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Sketch file not found: ${absolutePath}`);
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    const sketchBase64 = imageBuffer.toString('base64');
    const mimeType = getMimeType(sketchPath);

    await validateFashionContext(null, prompt).then(({ valid, reason }) => {
      if (!valid) {
        logger.warn(`Prompt validation failed: ${reason}`);
        throw new Error(`It looks like this image or prompt isn't related to fashion. To get the best results, please try uploading a sketch of a garment or an outfit.`);
      }
    })

    const fullPrompt = `Transform this fashion sketch into a photorealistic dress image.
${prompt}

Requirements:
- Keep the design elements from the sketch
- Make it look like a professional fashion photograph
- High quality, detailed fabric texture
- Realistic lighting and shadows
- No people, just the dress on a plain background, manequin, or invisible ghost mannequin
- Output only the image, no text or watermarks.`;

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: sketchBase64 } },
            { text: fullPrompt }
          ]
        }
      ],
      safetySettings,
      generationConfig: {
        responseModalities: ['image', 'text']
      }
    });

    const response = result.response;
    const parts = response.candidates[0].content.parts;
    const imagePart = parts.find((part) => part.inlineData);

    if (!imagePart) {
      throw new Error('No image generated in response');
    }

    return {
      imageData: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png'
    };
  } catch (error) {
    logger.error('Gemini image generation failed:', error);
    const formattedError = handleGeminiError(error);
    throw formattedError;
  }
};

function handleGeminiError(error) {
  const errorMap = {
    '429': "We're a bit busy! Too many people are designing right now. Please wait a few seconds and try again.",
    '400': "The image or prompt seems to be in an unsupported format. Try a clearer sketch!",
    '500': "Our fashion engine is taking a coffee break (Server Error). We'll be back shortly.",
    'DEADLINE_EXCEEDED': "The design is taking longer than expected. Please try a simpler sketch.",
    'MODEL_EMPTY_RESPONSE': "We couldn't generate a design for this sketch. Try adding more detail to your prompt."
  };

  const status = error.status || error.code || "";
  const friendlyMessage = errorMap[status] || "Oops! Something went wrong while creating your design.";
  
  console.error(`[Gemini Error ${status}]:`, error.message);
  
  return {
    error: true,
    message: friendlyMessage,
    technical: error.message
  };
}

/**
 * Validates if both the image and the prompt belong to the fashion domain by using gemini-flah-2.5 API
 * Returns { valid: boolean, reason: string }
 */
async function validateFashionContext(imageData, userPrompt) {

  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: 'gemini-2.5-flash'
  });

  const basicCriteria = userPrompt?"Analyze the provided image and text prompt. ":"Analyze the provided image. ";
  const validCriteriaPrompt = userPrompt?"AND the text is about styling/colors":"";
  const invalidCriteriaPrompt = userPrompt?"or the text is unrelated to fashion":"";
  let validationPrompt = `
    ${basicCriteria}
    Task: Determine if both are strictly related to fashion, clothing, apparel design, or accessories.
    
    Rules:
    1. If the image is a sketch of a person, or fashion, or clothing, or fabric ${validCriteriaPrompt}: Output "VALID".
    2. If the image is a cat, a car, a landscape, ${invalidCriteriaPrompt}: Output "INVALID".
    
    Response format: Only output "VALID" or "INVALID: [Reason]".
  `;

  if(!imageData && userPrompt){
    validationPrompt = `
      Analyze the provided text prompt.
      Task: Determine if the text is strictly related to fashion, clothing, apparel design, or accessories.
      
      Rules:
      1. If the text is about styling, colors, fashion trends, or design elements: Output "VALID".
      2. If the text is about cooking, sports, technology, or unrelated topics: Output "INVALID".
      
      Response format: Only output "VALID" or "INVALID: [Reason]".
    `;
  }

  if(!imageData && !userPrompt){
    return { valid: true }; // No data to validate, default to true
  }

  try {
    

    if(userPrompt){
        validationPrompt += `\nUser Prompt: "${userPrompt}"`;
    }

    console.log('Validate fashion context with prompt:', validationPrompt);

    let payload = [
      { inlineData: { mimeType: "image/jpeg", data: imageData } },
      { text: validationPrompt }
    ];

    if(!imageData){
      payload = [{ text: validationPrompt }];
    }

    const result = await model.generateContent(payload);

    const responseText = result.response.text().trim();
    
    
    if (responseText.startsWith("VALID")) {
      return { valid: true };
    } else {
      return { 
        valid: false, 
        reason: responseText.replace("INVALID: ", "") || "This doesn't look like a fashion sketch or design prompt." 
      };
    }
  } catch (error) {
    // If validation fails, default to true or handle as a technical error
    return { valid: true }; 
  }
}

module.exports = {
  generateImageFromSketch,
  validateFashionContext
};
