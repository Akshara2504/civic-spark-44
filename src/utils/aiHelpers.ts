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
): Promise<{ category: string; confidence: number }> => {
  try {
    const { data, error } = await supabase.functions.invoke('ai-categorize-issue', {
      body: { 
        title, 
        description,
        imageUrls: [] // Images already uploaded, can add URLs if needed
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('AI categorization error:', error);
    
    // Fallback to keyword-based classification
    const text = `${title} ${description}`.toLowerCase();
    
    if (text.includes('road') || text.includes('pothole') || text.includes('traffic')) {
      return { category: 'Roads', confidence: 0.8 };
    } else if (text.includes('water') || text.includes('drainage') || text.includes('leak')) {
      return { category: 'Water', confidence: 0.8 };
    } else if (text.includes('electric') || text.includes('power') || text.includes('light')) {
      return { category: 'Electricity', confidence: 0.8 };
    } else if (text.includes('garbage') || text.includes('sanitation') || text.includes('waste')) {
      return { category: 'Sanitation', confidence: 0.8 };
    } else if (text.includes('safety') || text.includes('crime') || text.includes('security')) {
      return { category: 'Safety', confidence: 0.8 };
    }
    
    return { category: 'Other', confidence: 0.5 };
  }
};
