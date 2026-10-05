import {GoogleGenAI} from "@google/genai";
import {env} from "@/lib/env";
const client=()=>new GoogleGenAI({apiKey:env.aiToken});
export async function generateImage(input:{prompt:string;aspectRatio?:string;imageSize?:"1K"|"2K"|"4K"}){
 const response=await client().models.generateContent({model:"gemini-3.1-flash-image",contents:input.prompt,config:{responseModalities:["IMAGE"],imageConfig:{aspectRatio:input.aspectRatio||"1:1",imageSize:input.imageSize||"1K"}}});
 for(const part of response.candidates?.[0]?.content?.parts||[]){
  if(part.inlineData?.data)return{mimeType:part.inlineData.mimeType||"image/png",data:part.inlineData.data};
 }
 throw new Error("The image model did not return an image.");
}