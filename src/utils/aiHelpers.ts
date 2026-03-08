import { supabase } from '@/integrations/supabase/client';

// AI Helper functions using Lovable AI Gateway

/**
 * Generate summary using Lovable AI
 */
export const generateSummary = async (text: string): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-summarize-text', {
      body: { text }
    });

    if (error) throw error;
    return data.summary;
  } catch (error) {
    console.error('Summary generation error:', error);
    // Fallback to simple truncation
    if (text.length <= 150) return text;
    return text.substring(0, 150) + '...';
  }
};

/**
 * Classify image using AI (placeholder for now)
 */
export const classifyImage = async (imageFile: File): Promise<{
  category: string;
  confidence: number;
}> => {
  // For now, use text-based classification
  // In future, can use Lovable AI with vision models
  const categories = ['Roads', 'Water', 'Electricity', 'Sanitation', 'Safety'];
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  
  return {
    category: randomCategory,
    confidence: 0.75 + Math.random() * 0.2,
  };
};

/**
 * TODO: Connect to translation API
 * Options: Google Translate API, DeepL, or LLM-based translation
 */
export const translateText = async (
  text: string,
  targetLanguage: 'en' | 'hi' | 'te'
): Promise<string> => {
  // Placeholder: Return original text
  console.log(`TODO: Translate \"${text}\" to ${targetLanguage}`);
  return text;
  
  // TODO: Implement real translation
  // Example with Google Translate:
  // const response = await fetch('https://translation.googleapis.com/language/translate/v2', {
  //   method: 'POST',
  //   body: JSON.stringify({ q: text, target: targetLanguage }
  // });
  // return response.data.translations[0].translatedText;
};

/**
 * TODO: Connect to image captioning service
 * Options: OpenAI Vision API, Google Cloud Vision API, or custom model
 */
export const generateImageCaption = async (imageFile: File): Promise<string> => {
  // Placeholder: Return generic caption
  return 'Image uploaded by user';
  
  // TODO: Implement real image captioning
  // Example with OpenAI Vision:
  // const base64Image = await fileToBase64(imageFile);
  // const response = await openai.chat.completions.create({
  //   model: \"gpt-4-vision-preview\",
  //   messages: [{ role: \"user\", content: [
  //     { type: \"text\", text: \"Describe this image briefly\" },
  //     { type: \"image_url\", image_url: { url: base64Image } }
  //   ]}]
  // });
  // return response.choices[0].message.content;
};

/**
 * Combine text and AI classification for better categorization
 */
export const categorizeIssue = async (
  title: string,
  description: string,
  images: File[]
): Promise<{ category: string; confidence: number; reasoning?: string }> => {
  try {
    // Convert images to base64 data URIs for the vision model
    const imageBase64List: string[] = [];
    for (const img of images.slice(0, 3)) { // Max 3 images to keep payload manageable
      const base64 = await fileToBase64(img);
      imageBase64List.push(base64);
    }

    const { data, error } = await supabase.functions.invoke('ai-categorize-issue', {
      body: { 
        title, 
        description,
        imageBase64List
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('AI categorization error:', error);
    
    // Fallback to keyword-based classification
    const text = `${title} ${description}`.toLowerCase();
    
    if (/road|pothole|traffic|highway|bridge/.test(text)) {
      return { category: 'Roads & Transport', confidence: 0.8 };
    } else if (/water|drainage|sewage|leak|pipe|flood/.test(text)) {
      return { category: 'Water & Drainage', confidence: 0.8 };
    } else if (/electric|power|light|transformer|wire/.test(text)) {
      return { category: 'Electricity', confidence: 0.8 };
    } else if (/garbage|trash|waste|dustbin|litter|dump/.test(text)) {
      return { category: 'Waste Management', confidence: 0.8 };
    } else if (/safety|crime|fire|accident|security|theft/.test(text)) {
      return { category: 'Public Safety', confidence: 0.8 };
    } else if (/park|playground|garden|recreation/.test(text)) {
      return { category: 'Parks & Recreation', confidence: 0.8 };
    } else if (/health|mosquito|sanitation|disease|hygien/.test(text)) {
      return { category: 'Health & Sanitation', confidence: 0.8 };
    }
    
    return { category: 'Other', confidence: 0.5 };
  }
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
