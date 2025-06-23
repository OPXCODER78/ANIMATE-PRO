
import React, { useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { GoogleGenAI, Part } from "@google/genai";
import { AnimationVariation, GeminiAnimationResponse, GeneratedUi, GeneratedSite, UiIconFile } from './types';
import { GEMINI_MODEL_NAME } from './constants';
import AnimationCard from './components/AnimationCard';
import Loader from './components/Loader';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { GlobeAltIcon } from './components/icons/GlobeAltIcon';
import { CubeTransparentIcon } from './components/icons/CubeTransparentIcon';
import { FilmIcon } from './components/icons/FilmIcon'; 
import UiDisplayCard from './components/UiDisplayCard';
import ClonedSiteDisplayCard from './components/ClonedSiteDisplayCard';
import UiEditor from './components/UiEditor'; 
import ThreeDSiteDisplayCard from './components/ThreeDSiteDisplayCard';
import SiteEditor from './components/SiteEditor'; 
import UltraSiteDisplayCard from './components/UltraSiteDisplayCard'; 
import UltraAnimationEditor from './components/UltraAnimationEditor'; 
import { replaceIconPlaceholdersInHtml } from './utils/uiUtils';


const readFileAsBase64 = (file: File): Promise<{fileData: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ fileData: result.split(',')[1], mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

type AppMode = 'animation' | 'uiux' | 'websiteCloner' | 'threeD' | 'ultraAnimator'; 

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('animation');

  // Timer state for AI operations
  const [operationStartTime, setOperationStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const timerIntervalRef = useRef<number | null>(null);

  // Animation Coder State
  const [animationDescription, setAnimationDescription] = useState<string>('');
  const [numberOfVariations, setNumberOfVariations] = useState<number>(1);
  const [generatedAnimations, setGeneratedAnimations] = useState<AnimationVariation[]>([]);
  const [isAnimationLoading, setIsAnimationLoading] = useState<boolean>(false);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const [selectedAnimImage, setSelectedAnimImage] = useState<File | null>(null);
  const [animImageBase64, setAnimImageBase64] = useState<string | null>(null);
  const [animImageMimeType, setAnimImageMimeType] = useState<string | null>(null);
  const [selectedAnimVideo, setSelectedAnimVideo] = useState<File | null>(null);
  const [animVideoBase64, setAnimVideoBase64] = useState<string | null>(null);
  const [animVideoMimeType, setAnimVideoMimeType] = useState<string | null>(null);
  const [selectedModelName, setSelectedModelName] = useState<string>('');

  // UI/UX Generator State
  const [uiDescription, setUiDescription] = useState<string>('');
  const [selectedUiImage, setSelectedUiImage] = useState<File | null>(null);
  const [uiImageBase64, setUiImageBase64] = useState<string | null>(null);
  const [uiImageMimeType, setUiImageMimeType] = useState<string | null>(null);
  const [selectedUiVideo, setSelectedUiVideo] = useState<File | null>(null); 
  const [uiVideoBase64, setUiVideoBase64] = useState<string | null>(null);   
  const [uiVideoMimeType, setUiVideoMimeType] = useState<string | null>(null); 
  const [selectedUiIcons, setSelectedUiIcons] = useState<UiIconFile[]>([]);
  const [uiIconError, setUiIconError] = useState<string | null>(null);
  const [generatedUi, setGeneratedUi] = useState<GeneratedUi | null>(null);
  const [isUiLoading, setIsUiLoading] = useState<boolean>(false); 
  const [uiError, setUiError] = useState<string | null>(null);
  const [editingUiContent, setEditingUiContent] = useState<GeneratedUi | null>(null); 
  const [uiRefinementPrompt, setUiRefinementPrompt] = useState<string>(''); 
  const [isRefiningUi, setIsRefiningUi] = useState<boolean>(false); 
  const [refinementError, setRefinementError] = useState<string | null>(null);

  // Website Cloner State
  const [cloneUrl, setCloneUrl] = useState<string>('');
  const [generatedSite, setGeneratedSite] = useState<GeneratedSite | null>(null);
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // 3D Website Creator State
  const [threeDPrompt, setThreeDPrompt] = useState<string>('');
  const [generatedThreeDSite, setGeneratedThreeDSite] = useState<GeneratedSite | null>(null);
  const [isThreeDSiteLoading, setIsThreeDSiteLoading] = useState<boolean>(false);
  const [threeDSiteError, setThreeDSiteError] = useState<string | null>(null);
  
  // Site Editor State (for Cloned and 3D sites)
  const [editingSiteContent, setEditingSiteContent] = useState<GeneratedSite | null>(null); 
  const [siteRefinementPrompt, setSiteRefinementPrompt] = useState<string>('');
  const [isRefiningSite, setIsRefiningSite] = useState<boolean>(false);
  const [siteRefinementError, setSiteRefinementError] = useState<string | null>(null);

  // Ultra Animator State
  const [ultraBasePrompt, setUltraBasePrompt] = useState<string>('');
  const [generatedUltraSite, setGeneratedUltraSite] = useState<GeneratedSite | null>(null);
  const [isUltraBaseLoading, setIsUltraBaseLoading] = useState<boolean>(false);
  const [ultraBaseError, setUltraBaseError] = useState<string | null>(null);
  const [ultraAnimationPrompt, setUltraAnimationPrompt] = useState<string>('');
  const [isUltraAnimating, setIsUltraAnimating] = useState<boolean>(false);
  const [ultraAnimationError, setUltraAnimationError] = useState<string | null>(null);
  const [editingUltraSiteAnimations, setEditingUltraSiteAnimations] = useState<GeneratedSite | null>(null);


  const apiKey = process.env.API_KEY;

  // Timer Logic
  useEffect(() => {
    if (operationStartTime && !timerIntervalRef.current) {
      timerIntervalRef.current = window.setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    } else if (!operationStartTime && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [operationStartTime]);

  const startOperationTimer = () => {
    setElapsedTime(0);
    setOperationStartTime(Date.now());
  };

  const stopOperationTimer = () => {
    setOperationStartTime(null);
  };


  // --- Animation Coder Logic ---
  const handleAnimImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAnimImage(file);
      try {
        const { fileData, mimeType } = await readFileAsBase64(file);
        setAnimImageBase64(fileData);
        setAnimImageMimeType(mimeType);
      } catch (err) {
        setAnimationError("Error reading image file for animation.");
        setSelectedAnimImage(null); setAnimImageBase64(null); setAnimImageMimeType(null);
      }
    } else {
      setSelectedAnimImage(null); setAnimImageBase64(null); setAnimImageMimeType(null);
    }
  };

  const clearAnimImage = () => {
    setSelectedAnimImage(null); setAnimImageBase64(null); setAnimImageMimeType(null);
    const input = document.getElementById('animImageUpload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleAnimVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedAnimVideo(file);
      try {
        const { fileData, mimeType } = await readFileAsBase64(file);
        setAnimVideoBase64(fileData);
        setAnimVideoMimeType(mimeType);
      } catch (err) {
        setAnimationError("Error reading video file for animation.");
        setSelectedAnimVideo(null); setAnimVideoBase64(null); setAnimVideoMimeType(null);
      }
    } else {
      setSelectedAnimVideo(null); setAnimVideoBase64(null); setAnimVideoMimeType(null);
    }
  };

  const clearAnimVideo = () => {
    setSelectedAnimVideo(null); setAnimVideoBase64(null); setAnimVideoMimeType(null);
    const input = document.getElementById('animVideoUpload') as HTMLInputElement;
    if (input) input.value = '';
  };
  
  const clearModelName = () => setSelectedModelName('');

  const generateAnimations = useCallback(async () => {
    if (!apiKey) { setAnimationError("API key is missing."); return; }
    if (!animationDescription.trim()) { setAnimationError("Please provide an animation description."); return; }
    if (numberOfVariations < 1 || numberOfVariations > 5) { setAnimationError("Number of variations must be between 1 and 5."); return; }

    setIsAnimationLoading(true); setAnimationError(null); setGeneratedAnimations([]);
    startOperationTimer();
    const ai = new GoogleGenAI({ apiKey });

    let promptText = `
You are a world-class web animation expert and frontend developer, with a keen eye for modern, visually stunning, and highly polished user experiences. Your task is to generate ${numberOfVariations} distinct animation variations based on the user's request and any provided assets. Each variation should be a complete, self-contained piece of code (HTML, CSS, JS) that is ready to run in a browser.

User's core request: "${animationDescription}"

**Overall Animation Philosophy:**
- Strive for animations that are not just functional but also delightful, engaging, and reflect current design trends.
- If the user's description is brief or simple, interpret it creatively. Elevate the concept to produce something truly impressive and modern that a professional designer would be proud of. Think about how to add "wow" factor.
- Prioritize smoothness, fluidity (aim for 60fps), and clarity of motion.
- Ensure animations serve a purpose: guiding attention, providing feedback, enhancing storytelling, or creating a memorable interaction.

**Asset Integration (If Provided):**
- Image Asset: ${animImageBase64 ? "An image asset IS PROVIDED. This image MUST be incorporated directly into the animation using an <img> tag with a base64 data URL (src='data:image/mime_type;base64,...'). Design the animation AROUND or WITH this image as a central component." : "No image asset provided."}
- Video Asset: ${animVideoBase64 ? "A video asset IS PROVIDED. This video MUST be incorporated using a <video> tag with a base64 data URL (src='data:video/mime_type;base64,...'). Include appropriate attributes like 'autoplay', 'loop', 'muted', 'playsinline', and 'controls' (if sensible for the animation concept). The animation should interact with or be themed around this video." : "No video asset provided."}
- 3D Model Name: ${selectedModelName ? `A 3D model named "${selectedModelName}" IS SPECIFIED. You MUST generate HTML, CSS, and JavaScript to load and animate this model using Three.js. Assume "${selectedModelName}" is available at a relative path (e.g., './${selectedModelName}'). Include CDN links for Three.js (three.module.js) and any necessary loaders (GLTFLoader, OrbitControls if interactive). Your Three.js code MUST include: scene setup, camera (PerspectiveCamera with sensible FOV, aspect, near/far), WebGLRenderer (antialias, pixel ratio, size, append to a canvas in HTML), appropriate lighting (e.g., AmbientLight, DirectionalLight/PointLight, HemisphereLight), model loading (use GLTFLoader for .glb or .gltf), an animation loop (renderer.setAnimationLoop), and handling for window resizing. The animation itself should be creative and relevant to the model and user prompt.` : "No 3D model specified."}

**Technical & Design Guidelines for EACH Variation:**

1.  **HTML Structure:**
    *   Provide semantic and well-structured HTML.
    *   If assets are provided, they are the focal point. Build the HTML around them.
    *   Use Tailwind CSS classes extensively for layout and base styling directly in the HTML.

2.  **CSS Styling (Tailwind CSS First):**
    *   **Tailwind CSS is mandatory** for all primary styling (layout, typography, colors, spacing, etc.).
    *   **Custom CSS (\`customCss\` field):** Should be used *minimally* and only for:
        *   Complex CSS animations (@keyframes, intricate transitions not easily done with Tailwind's utility classes).
        *   Styles that are genuinely difficult or verbose to achieve with Tailwind alone (e.g., very specific pseudo-elements, complex clip-paths if essential).
        *   Always try to achieve the effect with Tailwind first. If custom CSS is used, it should be clean and well-commented if complex.

3.  **JavaScript for Animation & Interaction:**
    *   **Prioritize CSS Animations or the Web Animations API (WAAPI)** for performance and simplicity whenever possible.
    *   If using WAAPI (\`element.animate()\`), ensure it's well-structured.
    *   For more complex timeline control, sequencing, or physics-like effects that go beyond CSS/WAAPI capabilities, you *may* use a well-known, lightweight animation library like **GSAP (GreenSock Animation Platform)**. If GSAP is used, you MUST include its CDN link in the HTML's \`<head>\`. Use GSAP judiciously and only when its power is genuinely beneficial for creating a superior animation that matches the "modern and stunning" requirement.
    *   All JavaScript code MUST be vanilla ES6+ (unless a library like GSAP is used).
    *   Code should be clean, readable, and efficient. Add comments for complex logic.
    *   Ensure JS correctly targets HTML elements (use unique IDs if necessary, which you should define in the HTML).
    *   If the animation is interactive (e.g., on click, on hover), implement the event listeners robustly.

4.  **Modern Animation Principles to Embody:**
    *   **Smoothness & Easing:** Use appropriate easing functions (e.g., 'ease-in-out', 'cubic-bezier()', or GSAP's eases) to make animations feel natural and polished, not linear and robotic.
    *   **Subtlety & Detail:** Consider micro-interactions, subtle parallax effects, staggered animations for groups of elements, and smooth an  chored positioning.
    *   **Performance:** Optimize animations. Favor \`transform\` and \`opacity\` for changes. Avoid layout thrashing.
    *   **Responsiveness:** Animations should look good and perform well on various screen sizes. Ensure UI elements are responsive.
    *   **Accessibility:** While creating visually rich animations, briefly consider users who prefer reduced motion. If the animation is very intense, you might note in comments how a \`prefers-reduced-motion\` query could be used, but prioritize fulfilling the core animation request.

5.  **Variation Naming:** Each variation should have a short, descriptive \`name\` that reflects its unique approach or style (e.g., "Elegant Fade & Slide In", "Dynamic Particle Burst", "Interactive 3D Model Reveal").

**Output Format (Strictly Adhere):**
For each of the ${numberOfVariations} variations, provide a JSON object with the following structure:
\`\`\`json
{
  "id": "unique_animation_id_string_for_this_variation",
  "name": "Short Descriptive Name of the Animation Variation",
  "html": "<!-- Complete HTML markup -->\\n<div class=\\"...\\">...</div>",
  "customCss": "/* Minimal custom CSS, only if absolutely necessary. Tailwind is preferred. */\\n.my-custom-class { ... }",
  "javascript": "// JavaScript for animation and interactivity (vanilla JS or selected library like GSAP)\\nconsole.log('Animation Loaded');"
}
\`\`\`
The entire response MUST be a valid JSON array containing these objects. Do NOT include any other text, explanations, or markdown formatting outside this JSON array.
Ensure all string values within the JSON (keys and values) are enclosed in double quotes, and all special characters within the strings (like newlines, quotes) are properly escaped (e.g., \\n, \\"). No trailing commas.

**Final Check:** Before outputting, mentally review each variation: Is it modern? Is it smooth? Is it visually appealing? Does it effectively use the provided assets? Does it meet the user's core request in a sophisticated way? Is the code clean and functional?

Generate ${numberOfVariations} distinct, high-quality animation variations now.
`;

    const modelParts: Part[] = [{ text: promptText }];
    if (animImageBase64 && animImageMimeType) {
      modelParts.push({ inlineData: { mimeType: animImageMimeType, data: animImageBase64 } });
    }
    if (animVideoBase64 && animVideoMimeType) {
      modelParts.push({ inlineData: { mimeType: animVideoMimeType, data: animVideoBase64 } });
    }
    
    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: { parts: modelParts },
        config: { responseMimeType: "application/json" },
      });
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();

      const parsedData = JSON.parse(jsonStr);
      if (Array.isArray(parsedData)) {
        const validAnimations = parsedData.map((item: any, index: number) => {
            if (item && typeof item === 'object') {
              return {
                id: item.id || `anim_${Date.now()}_${index}`,
                name: item.name || 'Unnamed Animation',
                html: item.html || '',
                customCss: item.customCss,
                javascript: item.javascript,
                ...(animImageBase64 && animImageMimeType && { assetBase64: animImageBase64, assetMimeType: animImageMimeType, assetType: 'image' as 'image' | 'video' }),
                ...(animVideoBase64 && animVideoMimeType && { assetBase64: animVideoBase64, assetMimeType: animVideoMimeType, assetType: 'video' as 'image' | 'video' })
              };
            }
            return null; 
          }).filter(Boolean) as AnimationVariation[]; 
        setGeneratedAnimations(validAnimations);
      } else {
        setAnimationError("Received unexpected data format from AI for animations. Expected an array.");
        setGeneratedAnimations([]);
      }
    } catch (err) {
      console.error("Error generating animations:", err);
      setAnimationError(`Failed to generate animations. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGeneratedAnimations([]);
    } finally {
      setIsAnimationLoading(false);
      stopOperationTimer();
    }
  }, [animationDescription, numberOfVariations, apiKey, animImageBase64, animImageMimeType, animVideoBase64, animVideoMimeType, selectedModelName]);

  // --- UI/UX Generator Logic ---
  const handleUiImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedUiImage(file);
      setUiIconError(null); 
      try {
        const { fileData, mimeType } = await readFileAsBase64(file);
        setUiImageBase64(fileData);
        setUiImageMimeType(mimeType);
      } catch (err) {
        setUiError("Error reading image file for UI design.");
        setSelectedUiImage(null); setUiImageBase64(null); setUiImageMimeType(null);
      }
    } else {
      setSelectedUiImage(null); setUiImageBase64(null); setUiImageMimeType(null);
    }
  };

  const clearUiImage = () => {
    setSelectedUiImage(null); setUiImageBase64(null); setUiImageMimeType(null);
    setUiIconError(null);
    const input = document.getElementById('uiImageUpload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleUiVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedUiVideo(file);
      setUiIconError(null);
      try {
        const { fileData, mimeType } = await readFileAsBase64(file);
        setUiVideoBase64(fileData);
        setUiVideoMimeType(mimeType);
      } catch (err) {
        setUiError("Error reading video/GIF file for UI design.");
        setSelectedUiVideo(null); setUiVideoBase64(null); setUiVideoMimeType(null);
      }
    } else {
      setSelectedUiVideo(null); setUiVideoBase64(null); setUiVideoMimeType(null);
    }
  };

  const clearUiVideo = () => {
    setSelectedUiVideo(null); setUiVideoBase64(null); setUiVideoMimeType(null);
    setUiIconError(null);
    const input = document.getElementById('uiVideoUpload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleUiIconChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newSelectedIcons: UiIconFile[] = [];
      let anyError = false;

      for (const file of Array.from(files)) {
        if (file.type !== "image/svg+xml") {
          setUiIconError(`Invalid file type: ${file.name}. Please upload SVG files only.`);
          anyError = true;
          continue; 
        }
        try {
          const svgString = await readFileAsText(file);
          // Derive conceptual name from filename (e.g., "search-icon.svg" -> "search_icon")
          const conceptualName = file.name.replace(/\.svg$/i, '').replace(/[^a-z0-9_]/gi, '_').toLowerCase() || `icon_${Date.now()}`;
          newSelectedIcons.push({ file, svgString, conceptualName });
        } catch (err) {
          setUiIconError(`Error reading SVG icon file: ${file.name}.`);
          anyError = true;
        }
      }

      if (!anyError) setUiIconError(null);
      
      setSelectedUiIcons(prev => {
        const existingNames = new Set(prev.map(icon => icon.file.name));
        const trulyNewIcons = newSelectedIcons.filter(icon => !existingNames.has(icon.file.name));
        return [...prev, ...trulyNewIcons];
      });
      // Reset the file input so the same file can be selected again if cleared and re-added
      event.target.value = ''; 
    }
  };

  const clearUiIcons = () => {
    setSelectedUiIcons([]); 
    setUiIconError(null);
    const initialInput = document.getElementById('uiIconUploadInitial') as HTMLInputElement;
    if (initialInput) initialInput.value = '';
    const refinementInput = document.getElementById('uiIconUploadRefine') as HTMLInputElement;
    if (refinementInput) refinementInput.value = '';
  };


  const callGeminiForUi = async (prompt: string, initialGeneration: boolean = true) => {
    if (!apiKey) throw new Error("API key is missing.");
    const ai = new GoogleGenAI({ apiKey });

    const modelParts: Part[] = [{ text: prompt }];
    
    // Pass image/video assets (but not SVGs directly in parts)
    if (initialGeneration && uiImageBase64 && uiImageMimeType && selectedUiIcons.length === 0) { 
      modelParts.push({ inlineData: { mimeType: uiImageMimeType, data: uiImageBase64 } });
    }
    if (uiVideoBase64 && uiVideoMimeType && selectedUiIcons.length === 0) { 
       modelParts.push({ inlineData: { mimeType: uiVideoMimeType, data: uiVideoBase64 } });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: { parts: modelParts },
      config: { responseMimeType: "application/json" },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) jsonStr = match[2].trim();
    
    const parsedData = JSON.parse(jsonStr);
    if (parsedData && typeof parsedData === 'object' && parsedData !== null && typeof (parsedData as GeneratedUi).html === 'string') {
      return {
        html: parsedData.html,
        customCss: parsedData.customCss,
        javascript: parsedData.javascript 
      } as GeneratedUi;
    } else {
      throw new Error("Received unexpected data format from AI for UI. Expected an object with 'html'.");
    }
  };

  const generateUi = useCallback(async () => {
    if (!uiDescription.trim()) { setUiError("Please describe the UI you want to generate."); return; }

    setIsUiLoading(true); setUiError(null); setGeneratedUi(null); setRefinementError(null);
    setEditingUiContent(null); 
    startOperationTimer();

    let assetPrompt = "";
    if (selectedUiIcons.length > 0) {
      const iconNames = selectedUiIcons.map(icon => icon.conceptualName).join(', ');
      assetPrompt = `The user has provided the following SVG icons (by conceptual name): ${iconNames}. You MUST create placeholders in the HTML for these icons where contextually appropriate based on the user's description. Use placeholders like \`<!-- ICON: conceptual_name -->\` or \`<div data-icon-placeholder="conceptual_name" class="w-6 h-6 inline-block"></div>\`. I will replace these placeholders with the actual SVG code later. Do NOT attempt to embed the SVG code itself.`;
    } else if (uiImageBase64) {
      assetPrompt = "An inspirational image is provided. Use it as a visual guide for style, layout, and components for this initial generation.";
    } else if (uiVideoBase64) {
      assetPrompt = "An inspirational video/GIF is provided. Analyze its content for UI elements, layout, color schemes, and animations. Generate an HTML/CSS/JS UI that captures the essence of the visual style and dynamic elements seen in the video/GIF. Try to replicate or draw inspiration from the video's motion design for the UI elements you generate.";
    }

    const promptText = `
You are an expert UI/UX designer and frontend developer, skilled in creating animations.
User's request: "${uiDescription}"
${assetPrompt}

Generate a UI component based on the user's request and any provided assets.
Provide a JSON object with the following fields:
- "html": HTML markup using Tailwind CSS classes extensively for styling. The HTML should be well-structured and semantic. 
  - If SVG icon concepts were provided (e.g., 'search_icon', 'user_avatar_icon'), use placeholders in the HTML like \`<!-- ICON: search_icon -->\` or \`<div data-icon-placeholder="user_avatar_icon" class="w-6 h-6 inline-block"></div>\` where these icons should appear. You do NOT need to embed the SVG code itself. Size the div placeholders appropriately using Tailwind.
  - If no SVG icons were provided, use placeholder images (e.g. <img src="https://via.placeholder.com/150/CCCCCC/808080?Text=Placeholder" alt="placeholder"> or styled divs) or simple text-based icons (e.g., [X] for close).
- "customCss": (Optional) Any custom CSS for styles not achievable with Tailwind CSS or for very specific fine-tuning. This should be minimal.
- "javascript": (Optional) JavaScript code for any animations or interactivity. If the user provided a video/GIF (and no SVGs), use this to implement animations inspired by it. Prefer vanilla JavaScript.

Important constraints:
- Prioritize Tailwind CSS for all styling. Only use customCss for essential enhancements.
- The UI should be responsive and have a modern aesthetic.
- If a video/GIF asset was provided (and no SVG icons), the generated HTML/CSS/JS should reflect its style and motion. Do NOT try to embed the provided video base64 data directly into the HTML output in this case.
- Ensure the output is a single, valid JSON object: {"html": "...", "customCss": "...", "javascript": "..."}. ALL property names (keys) and string values MUST be enclosed in double quotes. Ensure no trailing commas.

Generate the UI component as a JSON object. Ensure the entire response is only this JSON object.`;
    
    try {
      let newUi = await callGeminiForUi(promptText, true);
      if (selectedUiIcons.length > 0) {
        const iconMap = selectedUiIcons.map(icon => ({ name: icon.conceptualName, svgString: icon.svgString }));
        newUi.html = replaceIconPlaceholdersInHtml(newUi.html, iconMap);
      }
      setGeneratedUi(newUi);
      // setUiDescription(''); // Keep description for iterative refinement context if desired
    } catch (err) {
      console.error("Error generating UI:", err);
      setUiError(`Failed to generate UI. ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGeneratedUi(null);
    } finally {
      setIsUiLoading(false);
      stopOperationTimer();
    }
  }, [uiDescription, apiKey, uiImageBase64, uiVideoBase64, selectedUiIcons]);


  const handleRefineUi = useCallback(async () => {
    if (!uiRefinementPrompt.trim() && !selectedUiVideo && selectedUiIcons.length === 0) { setRefinementError("Please enter refinement instructions or upload a video/GIF or SVG icon(s) for refinement."); return; }
    if (!generatedUi) { setRefinementError("No UI to refine. Generate a UI first."); return; }

    setIsRefiningUi(true); setRefinementError(null); setUiError(null);
    setEditingUiContent(null); 
    startOperationTimer();

    let videoPrompt = "";
    if (selectedUiVideo) { // Check selectedUiVideo, not just base64 for intent
      videoPrompt = "An inspirational video/GIF is also provided for this refinement. Analyze its content. If the user's instructions relate to animations or visual style, use this video as a strong reference. Try to replicate or draw inspiration from the video's motion design for modifying or adding UI animations.";
    }

    let iconPrompt = "";
    if (selectedUiIcons.length > 0) {
      const iconNames = selectedUiIcons.map(icon => icon.conceptualName).join(', ');
      iconPrompt = `The user has also provided the following SVG icons (by conceptual name) for this refinement: ${iconNames}. If the refinement instructions mention new icons or replacing existing ones, use placeholders in the HTML like \`<!-- ICON: conceptual_name -->\` or \`<div data-icon-placeholder="conceptual_name" class="w-6 h-6 inline-block"></div>\`. I will replace these placeholders with the actual SVG code later. Do NOT attempt to embed the SVG code itself.`;
    }
    
    const promptText = `
You are an expert UI/UX designer and frontend developer, skilled in creating animations.
You are tasked with refining an existing UI component based on new user instructions and potentially new assets (video/GIF or SVG icons).

Current HTML:
\`\`\`html
${generatedUi.html}
\`\`\`

Current Custom CSS (if any):
\`\`\`css
${generatedUi.customCss || "/* No custom CSS was previously provided. */"}
\`\`\`

Current JavaScript (if any):
\`\`\`javascript
${generatedUi.javascript || "/* No JavaScript was previously provided. */"}
\`\`\`

User's new refinement instructions: "${uiRefinementPrompt || ((selectedUiVideo || selectedUiIcons.length > 0) ? "Refine based on the provided assets." : "No specific text instructions, focus on assets if provided.")}"
${videoPrompt}
${iconPrompt}

Modify the provided HTML, Custom CSS, and JavaScript based on the user's new refinement instructions and any provided assets.
- Ensure you return the *complete, updated* HTML, Custom CSS, and JavaScript.
- If a video/GIF is provided, prioritize incorporating animations or styles from it as per the user's request or general intent.
- If SVG icon concepts are provided (e.g., 'search_icon', 'new_user_icon'), use placeholders in the HTML like \`<!-- ICON: search_icon -->\` or \`<div data-icon-placeholder="new_user_icon" class="w-6 h-6 inline-block"></div>\` where these icons should appear (either replacing existing icons or as new ones). You do NOT need to embed the SVG code itself. Size the div placeholders appropriately.
- Continue to prioritize Tailwind CSS for all styling. Only use customCss for essential enhancements not achievable with Tailwind.
- The UI should remain responsive and maintain a modern aesthetic, incorporating the requested changes.
- Output a single, valid JSON object: {"html": "UPDATED_HTML_HERE", "customCss": "UPDATED_CSS_HERE_OR_EMPTY_STRING", "javascript": "UPDATED_JS_HERE_OR_EMPTY_STRING"}.
- ALL property names (keys) and string values MUST be enclosed in double quotes. Ensure no trailing commas.
- Properly escape any characters within string values.

Provide the entire updated UI component as a JSON object. Ensure the entire response is only this JSON object.`;

    try {
      let refinedUi = await callGeminiForUi(promptText, false);
      if (selectedUiIcons.length > 0) {
        const iconMap = selectedUiIcons.map(icon => ({ name: icon.conceptualName, svgString: icon.svgString }));
        refinedUi.html = replaceIconPlaceholdersInHtml(refinedUi.html, iconMap);
      }
      setGeneratedUi(refinedUi);
      setUiRefinementPrompt(''); 
      // Optionally clear SVGs/Video after refinement if they are meant to be single-use for this specific refinement
      // clearUiIcons(); 
      // clearUiVideo();
    } catch (err) {
      console.error("Error refining UI:", err);
      setRefinementError(`Failed to refine UI. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRefiningUi(false);
      stopOperationTimer();
    }
  }, [uiRefinementPrompt, generatedUi, apiKey, selectedUiVideo, selectedUiIcons]);


  const handleStartEditUi = (uiToEdit: GeneratedUi) => {
    setEditingUiContent(uiToEdit);
    setRefinementError(null); 
    setUiError(null); 
  };

  const handleSaveEditedUi = (updatedHtml: string) => {
    if (editingUiContent) {
      setGeneratedUi(prevUi => ({ 
        ...(prevUi || { html: '', customCss: '', javascript: '' }), 
        html: updatedHtml,
        // Preserve CSS/JS from before visual edit, as editor only changes HTML
        customCss: editingUiContent.customCss, 
        javascript: editingUiContent.javascript 
      }));
    }
    setEditingUiContent(null);
  };

  const handleCancelEditUi = () => {
    setEditingUiContent(null);
  };

  // --- Website Cloner & 3D Site - Shared Logic for Editing & Refinement ---
  const handleStartEditSite = (siteToEdit: GeneratedSite) => {
    setEditingSiteContent(siteToEdit);
    setSiteRefinementError(null); 
    setCloneError(null); 
    setThreeDSiteError(null);
    setUltraAnimationError(null); 
    setUltraBaseError(null);
  };

  const handleSaveEditedSite = (updatedHtml: string) => {
    if (editingSiteContent) {
      const updatedSite = {
        ...editingSiteContent,
        html: updatedHtml,
      };
      if (appMode === 'websiteCloner') {
        setGeneratedSite(updatedSite);
      } else if (appMode === 'threeD') {
        setGeneratedThreeDSite(updatedSite);
      }
    }
    setEditingSiteContent(null);
  };
  
  const handleCancelEditSite = () => {
    setEditingSiteContent(null);
  };

  const handleRefineSite = useCallback(async () => { 
    if (!siteRefinementPrompt.trim()) { setSiteRefinementError("Please enter refinement instructions."); return; }
    
    const currentSite = appMode === 'websiteCloner' ? generatedSite : generatedThreeDSite;
    if (!currentSite) { setSiteRefinementError("No site to refine. Generate a site first."); return; }

    setIsRefiningSite(true); setSiteRefinementError(null); 
    setCloneError(null); setThreeDSiteError(null); 
    setEditingSiteContent(null); 
    startOperationTimer();

    const ai = new GoogleGenAI({ apiKey });
    let promptType = appMode === 'websiteCloner' ? "cloned website structure" : "3D website";

    const promptText = `
You are an expert frontend developer (and Three.js specialist for 3D sites).
You are tasked with refining an existing ${promptType} based on new user instructions.

Current HTML:
\`\`\`html
${currentSite.html}
\`\`\`

Current Custom CSS (if any):
\`\`\`css
${currentSite.customCss || "/* No custom CSS was previously provided. */"}
\`\`\`

Current JavaScript (if any):
\`\`\`javascript
${currentSite.javascript || "/* No JavaScript was previously provided. */"}
\`\`\`

User's new refinement instructions: "${siteRefinementPrompt}"

Modify the provided HTML, Custom CSS, and JavaScript based *only* on the user's new refinement instructions.
- Ensure you return the *complete, updated* HTML, Custom CSS, and JavaScript.
- For cloned sites: Continue to prioritize Tailwind CSS. Use customCss and vanilla JavaScript minimally.
- For 3D sites: Ensure Three.js code remains valid and functional, incorporating changes.
- The output must be a single, valid JSON object: {"name": "${currentSite.name}", "html": "UPDATED_HTML", "customCss": "UPDATED_CSS", "javascript": "UPDATED_JS"}.
- ALL property names (keys) and string values MUST be enclosed in double quotes. Ensure no trailing commas.
- Properly escape characters within string values (e.g., \\", \\n).

Provide the entire updated site as a JSON object. Ensure the entire response is only this JSON object.`;

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: { parts: [{text: promptText}] },
        config: { responseMimeType: "application/json" },
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();
      
      const parsedData = JSON.parse(jsonStr);

      if (parsedData && typeof parsedData === 'object' && parsedData !== null && 
          typeof (parsedData as GeneratedSite).html === 'string' && 
          typeof (parsedData as GeneratedSite).name === 'string') {
        const refinedSiteData: GeneratedSite = {
          id: currentSite.id, 
          name: parsedData.name || currentSite.name,
          html: parsedData.html,
          customCss: parsedData.customCss,
          javascript: parsedData.javascript,
        };
        
        if (appMode === 'websiteCloner') {
          setGeneratedSite(refinedSiteData);
        } else if (appMode === 'threeD') {
          setGeneratedThreeDSite(refinedSiteData);
        }
        setSiteRefinementPrompt('');
      } else {
        throw new Error(`Received unexpected data format from AI for site refinement. Expected an object with 'name' and 'html'.`);
      }
    } catch (err) {
      console.error(`Error refining ${promptType}:`, err);
      setSiteRefinementError(`Failed to refine ${promptType}. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRefiningSite(false);
      stopOperationTimer();
    }
  }, [siteRefinementPrompt, generatedSite, generatedThreeDSite, appMode, apiKey]);


  // --- Website Cloner Logic ---
  const generateClonedSite = useCallback(async () => {
    if (!apiKey) { setCloneError("API key is missing."); return; }
    if (!cloneUrl.trim()) { setCloneError("Please provide a website URL."); return; }
    
    setIsCloning(true); setCloneError(null); setGeneratedSite(null); setSiteRefinementError(null);
    setEditingSiteContent(null);
    startOperationTimer();
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are an expert frontend developer. A user wants to conceptually clone the structure and style of a website based on its URL.
Analyze the likely structure, components, and layout of a webpage found at a URL like "${cloneUrl}".
Do NOT attempt to fetch the URL. Instead, use your general knowledge of web design patterns for common page types (e.g., e-commerce product page, blog post, landing page, etc.) that such a URL might represent.
Generate a single JSON object containing the following properties:
- "name": A descriptive name for the cloned page structure (e.g., "E-commerce Product Page Concept").
- "html": HTML markup using Tailwind CSS classes extensively for styling. This HTML should represent a plausible structure for the given URL type. Include placeholders for images (e.g., <img src="https://via.placeholder.com/300x200.png?text=Placeholder" alt="Placeholder Image"> or <div class="bg-gray-300 w-full h-48 animate-pulse"></div>) and icons (e.g., <!-- [Search Icon] --> or using SVG placeholders if simple). Do NOT use actual <img> tags with external URLs unless they are generic placeholders like via.placeholder.com.
- "customCss": (Optional) Any minimal custom CSS for styles not achievable with Tailwind CSS or for very specific fine-tuning.
- "javascript": (Optional) Minimal vanilla JavaScript for basic interactivity if appropriate for the page type (e.g., a simple image slider, a modal toggle). Avoid complex JS. If including JS, ensure it's self-contained and doesn't rely on external files beyond what's linked in HTML (like a CDN for a library if absolutely necessary, but prefer vanilla JS).

CRITICAL JSON FORMATTING CONSTRAINTS:
1.  The entire response MUST be a single, valid JSON object.
2.  ALL property names (keys) in the JSON object (i.e., "name", "html", "customCss", "javascript") MUST be enclosed in double quotes. For example: { "name": "value", ... }.
3.  ALL string values in the JSON object MUST be enclosed in double quotes.
4.  Ensure there are no trailing commas in objects or arrays.
5.  Properly escape any characters within string values that would conflict with JSON syntax (e.g., double quotes within an HTML string value must be escaped like \\").

Example of the required structure: {"name": "Example Page", "html": "<div>Example HTML</div>", "customCss": "/* CSS */", "javascript": "// JS code"}

Do NOT include any explanatory text or markdown formatting (like \`\`\`json) outside of this single JSON object. The response must be ONLY the JSON object itself.`;

    const modelParts: Part[] = [{ text: promptText }];

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: { parts: modelParts },
        config: { responseMimeType: "application/json" },
      });
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();
      
      const parsedData = JSON.parse(jsonStr);

      if (parsedData && typeof parsedData === 'object' && parsedData !== null && 
          typeof (parsedData as any).html === 'string' && typeof (parsedData as any).name === 'string') {
        setGeneratedSite({
          ...(parsedData as Omit<GeneratedSite, 'id'>),
          id: `site_${Date.now()}`,
        });
      } else {
        setCloneError("Received unexpected data format from AI for website clone. Expected an object with 'name' and 'html'.");
        setGeneratedSite(null);
      }
    } catch (err) {
      console.error("Error generating cloned site:", err);
      if (err instanceof SyntaxError) {
        setCloneError(`Failed to parse AI response for website clone. Invalid JSON: ${err.message}. Please try again or refine the URL.`);
      } else {
        setCloneError(`Failed to generate website clone. ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      setGeneratedSite(null);
    } finally {
      setIsCloning(false);
      stopOperationTimer();
    }
  }, [cloneUrl, apiKey]);

  // --- 3D Website Creator Logic ---
  const generateThreeDSite = useCallback(async () => {
    if (!apiKey) { setThreeDSiteError("API key is missing."); return; }
    if (!threeDPrompt.trim()) { setThreeDSiteError("Please describe the 3D website you want."); return; }

    setIsThreeDSiteLoading(true); setThreeDSiteError(null); setGeneratedThreeDSite(null); setSiteRefinementError(null);
    setEditingSiteContent(null);
    startOperationTimer();
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are an expert 3D web developer specializing in Three.js. Generate a complete, self-contained 3D website based on the user's request.
User's request: "${threeDPrompt}"

The website should include:
1.  HTML: A basic structure with a <canvas id="three-canvas"></canvas> element for the 3D scene. Include CDN links for the latest stable Three.js (e.g., from cdnjs.cloudflare.com or unpkg.com). The body should have margin: 0; overflow: hidden;
2.  CSS: Minimal styling for the page and canvas. Ensure the canvas typically fills the viewport. Tailwind CSS can be used for page layout if desired, but the 3D canvas is primary.
3.  JavaScript (ES6 Module type):
    *   Import Three.js: import * as THREE from 'three_module_cdn_url';
    *   Set up a Three.js scene, camera (PerspectiveCamera recommended, sensible FOV, aspect ratio, near/far planes), and WebGLRenderer (antialias: true, set pixel ratio, size). Attach renderer.domElement to the canvas.
    *   Add basic lighting (e.g., AmbientLight for overall illumination, DirectionalLight for shadows/highlights).
    *   Create 3D objects (e.g., geometric shapes like BoxGeometry, SphereGeometry, TorusKnotGeometry or simple custom BufferGeometry) relevant to the prompt. Use MeshStandardMaterial or MeshBasicMaterial.
    *   Implement basic animations (e.g., object rotation, gentle movement, camera animation).
    *   Implement simple interactions if appropriate for the prompt (e.g., mouse move to pan camera slightly, click to change object color).
    *   An animation loop using renderer.setAnimationLoop(function() { /* update objects, render scene */ });
    *   Handle window resizing to update camera aspect ratio and renderer size.
    *   Ensure the JavaScript is a self-contained module script.

Output a single JSON object with the following properties:
- "name": A descriptive name for the 3D Site (e.g., "Interactive Portfolio with Floating Cubes").
- "html": The complete HTML structure.
- "customCss": Any CSS styles (can be empty if all handled by JS or Tailwind in HTML).
- "javascript": The complete Three.js JavaScript code as a string.

CRITICAL JSON FORMATTING CONSTRAINTS:
1.  The entire response MUST be a single, valid JSON object.
2.  ALL property names (keys) (i.e., "name", "html", "customCss", "javascript") MUST be enclosed in double quotes.
3.  ALL string values MUST be enclosed in double quotes. Properly escape characters like newlines (\\n) and quotes (\\") within these strings.
4.  Ensure no trailing commas.

Example of expected JS setup:
\`\`\`javascript
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js'; // Use a valid CDN

// Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('three-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Lighting, Objects, Animation Loop, Resize handler as described above
// ...
\`\`\`
Do NOT include any explanatory text or markdown formatting (like \`\`\`json) outside of this single JSON object. The response must be ONLY the JSON object itself.
Prioritize creating a visually engaging, functional, and well-structured Three.js experience. If the prompt implies highly complex 3D models or interactions beyond basic capabilities, create a simpler representation and note this in the 'name' or as comments in the code.
Ensure the JavaScript uses module features correctly and references the canvas element created in the HTML.
`;

    const modelParts: Part[] = [{ text: promptText }];

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME, 
        contents: { parts: modelParts },
        config: { responseMimeType: "application/json" },
      });
      
      let jsonStr = response.text.trim();
      const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();
      
      const parsedData = JSON.parse(jsonStr);

      if (parsedData && typeof parsedData === 'object' && parsedData !== null && 
          typeof (parsedData as any).html === 'string' && 
          typeof (parsedData as any).name === 'string' &&
          typeof (parsedData as any).javascript === 'string') {
        setGeneratedThreeDSite({
          ...(parsedData as Omit<GeneratedSite, 'id'>),
          id: `threeD_${Date.now()}`,
        });
      } else {
        setThreeDSiteError("Received unexpected data format from AI for 3D website. Expected an object with 'name', 'html', and 'javascript'.");
        setGeneratedThreeDSite(null);
      }
    } catch (err) {
      console.error("Error generating 3D website:", err);
      if (err instanceof SyntaxError) {
        setThreeDSiteError(`Failed to parse AI response for 3D website. Invalid JSON: ${err.message}. Please try again or refine your prompt.`);
      } else {
        setThreeDSiteError(`Failed to generate 3D website. ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      setGeneratedThreeDSite(null);
    } finally {
      setIsThreeDSiteLoading(false);
      stopOperationTimer();
    }
  }, [threeDPrompt, apiKey]);

  // --- Ultra Animator Logic ---
  const generateUltraBaseStructure = useCallback(async () => {
    if (!apiKey) { setUltraBaseError("API key is missing."); return; }
    if (!ultraBasePrompt.trim()) { setUltraBaseError("Please describe the website structure."); return; }

    setIsUltraBaseLoading(true); setUltraBaseError(null); setGeneratedUltraSite(null); setUltraAnimationError(null);
    setEditingUltraSiteAnimations(null);
    startOperationTimer();
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are an expert frontend developer. Generate a base HTML structure and Tailwind CSS styling for a webpage based on the user's description.
User's request for website structure: "${ultraBasePrompt}"

Guidelines:
1.  HTML: Create well-structured, semantic HTML. Key elements that might be animated later (like sections, cards, logos, buttons, text blocks) should have unique \`id\` attributes (e.g., id="hero-title", id="feature-card-1").
2.  CSS: Use Tailwind CSS classes directly in the HTML for all styling. Only provide custom CSS if absolutely necessary for complex layouts or effects not easily achievable with Tailwind.
3.  JavaScript: Do NOT include any JavaScript in this initial structure generation. JavaScript for animations will be added in a subsequent step.
4.  Placeholders: Use appropriate placeholders for images (e.g., <img src="https://via.placeholder.com/400x300?text=Image" alt="placeholder"> or styled divs) and icons.

Output a single JSON object with the following properties:
- "name": A descriptive name for the website structure (e.g., "Portfolio Landing Page Base").
- "html": The complete HTML structure with Tailwind CSS.
- "customCss": Any minimal custom CSS (can be an empty string if not needed).
- "javascript": An empty string for this step.

CRITICAL JSON FORMATTING CONSTRAINTS:
- The entire response MUST be a single, valid JSON object.
- ALL property names (keys) and string values MUST be enclosed in double quotes.
- Ensure no trailing commas.
- Properly escape characters like newlines (\\n) and quotes (\\") within string values.

Example Output:
{
  "name": "Simple Hero Section",
  "html": "<div class='min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4'>\\n  <h1 id='main-title' class='text-4xl font-bold text-gray-800 mb-4'>Welcome!</h1>\\n  <p id='sub-title' class='text-lg text-gray-600'>This is a base structure.</p>\\n  <button id='cta-button' class='mt-6 px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600'>Get Started</button>\\n</div>",
  "customCss": "",
  "javascript": ""
}

Do NOT include any explanatory text or markdown formatting (like \`\`\`json) outside of this single JSON object.
The response must be ONLY the JSON object itself.`;

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: { parts: [{ text: promptText }] },
        config: { responseMimeType: "application/json" },
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();
      
      const parsedData = JSON.parse(jsonStr);

      if (parsedData && typeof parsedData === 'object' && parsedData.html && parsedData.name) {
        setGeneratedUltraSite({
          id: `ultra_${Date.now()}`,
          name: parsedData.name,
          html: parsedData.html,
          customCss: parsedData.customCss || '',
          javascript: parsedData.javascript || '', 
        });
        setUltraBasePrompt(''); 
      } else {
        throw new Error("Received unexpected data format from AI for Ultra Animator base structure.");
      }
    } catch (err) {
      console.error("Error generating Ultra Animator base structure:", err);
      setUltraBaseError(`Failed to generate base structure. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUltraBaseLoading(false);
      stopOperationTimer();
    }
  }, [ultraBasePrompt, apiKey]);

  const applyUltraAnimation = useCallback(async () => {
    if (!apiKey) { setUltraAnimationError("API key is missing."); return; }
    if (!generatedUltraSite) { setUltraAnimationError("No base structure to animate. Generate structure first."); return; }
    if (!ultraAnimationPrompt.trim()) { setUltraAnimationError("Please describe the animation you want."); return; }

    setIsUltraAnimating(true); setUltraAnimationError(null);
    setEditingUltraSiteAnimations(null); // Exit visual editor if it was open
    startOperationTimer();
    const ai = new GoogleGenAI({ apiKey });

    const promptText = `
You are an expert web animation developer. Given an existing HTML structure, CSS, and potentially some JavaScript, add or modify JavaScript to implement the user's animation request.
Focus on using CSS Animations (defined in a <style> tag within the HTML, or in the customCss block) or the Web Animations API in JavaScript.

Current HTML:
\`\`\`html
${generatedUltraSite.html}
\`\`\`

Current Custom CSS (if any):
\`\`\`css
${generatedUltraSite.customCss || "/* No custom CSS */"}
\`\`\`

Current JavaScript (if any, for existing animations):
\`\`\`javascript
${generatedUltraSite.javascript || "/* No JavaScript yet */"}
\`\`\`

User's animation request: "${ultraAnimationPrompt}"

Follow these principles to add the new animation:
1.  Identify Target Elements: Locate the HTML elements to be animated, preferably using their \`id\` attributes if available in the HTML.
2.  Keyframe-Based Animation: Define animations using keyframes.
    *   Example: To make an element with id 'logo' fly in from the left and spin:
        *   Keyframe 1 (start): opacity: 0, transform: translateX(-100px) rotate(0deg)
        *   Keyframe 2 (end): opacity: 1, transform: translateX(0px) rotate(360deg)
3.  Animation Properties: Consider common animatable CSS properties:
    *   Position: \`transform: translateX(value)\`, \`translateY(value)\`, \`translate(x, y)\`
    *   Rotation: \`transform: rotate(deg)\`, \`rotateX(deg)\`, \`rotateY(deg)\`, \`rotateZ(deg)\`
    *   Scale: \`transform: scale(value)\`, \`scaleX(value)\`, \`scaleY(value)\`
    *   Opacity: \`opacity: value\` (0 to 1)
    *   Color: \`color\`, \`backgroundColor\` 
4.  Animation Triggers: Implement triggers as specified:
    *   'On page load': Animation starts automatically.
    *   'On scroll': Animation triggers when the element scrolls into view (use Intersection Observer API).
    *   'On hover': Animation plays when the mouse hovers over the element.
    *   'On click': Animation plays when the element is clicked.
    *   If no trigger is specified, assume 'on page load'.
5.  Implementation Method:
    *   CSS Animations: Define \`@keyframes\` in CSS (either in the \`customCss\` block or by adding a \`<style>\` tag to the HTML) and apply them to elements using the \`animation\` property. JavaScript might be needed to toggle classes that apply animations.
    *   Web Animations API (WAAPI): Use \`element.animate(keyframes, options)\` in JavaScript. This is often preferred for dynamic control.
6.  Integration:
    *   If there's existing JavaScript, integrate the new animation logic smoothly.
    *   If adding CSS animations, prefer adding to \`customCss\` or embed a \`<style>\` tag in the returned HTML.

Output a single JSON object with the *complete, updated* content:
{
  "name": "${generatedUltraSite.name}",
  "html": "UPDATED_HTML_STRING (may include new <style> tags if needed for CSS animations)",
  "customCss": "UPDATED_CSS_STRING (include @keyframes here if using CSS animations primarily)",
  "javascript": "UPDATED_JAVASCRIPT_STRING (include WAAPI logic or JS to trigger CSS animations)"
}

CRITICAL JSON FORMATTING CONSTRAINTS:
- The entire response MUST be a single, valid JSON object.
- ALL property names (keys) and string values MUST be enclosed in double quotes.
- Ensure no trailing commas.
- Properly escape characters like newlines (\\n) and quotes (\\") within string values.

Important: Ensure the generated JavaScript is self-contained and targets elements correctly.
`;

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: { parts: [{ text: promptText }] },
        config: { responseMimeType: "application/json" },
      });

      let jsonStr = response.text.trim();
      const fenceRegex = /^\`\`\`(\w*)?\s*\n?(.*?)\n?\s*\`\`\`$/s;
      const match = jsonStr.match(fenceRegex);
      if (match && match[2]) jsonStr = match[2].trim();
      
      const parsedData = JSON.parse(jsonStr);

      if (parsedData && typeof parsedData === 'object' && parsedData.html && parsedData.name && typeof parsedData.javascript !== 'undefined') {
        setGeneratedUltraSite({
          id: generatedUltraSite.id, 
          name: parsedData.name, 
          html: parsedData.html,
          customCss: parsedData.customCss || '',
          javascript: parsedData.javascript || '',
        });
        setUltraAnimationPrompt(''); 
      } else {
        throw new Error("Received unexpected data format from AI for Ultra Animator animation.");
      }
    } catch (err) {
      console.error("Error applying Ultra Animator animation:", err);
      setUltraAnimationError(`Failed to apply animation. ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUltraAnimating(false);
      stopOperationTimer();
    }
  }, [generatedUltraSite, ultraAnimationPrompt, apiKey]);

  // --- Ultra Animation Editor Logic ---
  const handleStartEditUltraAnimations = (siteToEdit: GeneratedSite) => {
    setEditingUltraSiteAnimations(siteToEdit);
    // Clear other editor states and errors
    setEditingUiContent(null);
    setEditingSiteContent(null);
    setUltraBaseError(null);
    setUltraAnimationError(null);
  };

  const handleSaveUltraAnimations = (updatedSiteData: GeneratedSite) => {
    setGeneratedUltraSite(updatedSiteData);
    setEditingUltraSiteAnimations(null);
  };

  const handleCancelEditUltraAnimations = () => {
    setEditingUltraSiteAnimations(null);
  };
  
  const TabButton: React.FC<{
      label: string; 
      mode: AppMode; 
      icon?: ReactNode
  }> = ({label, mode, icon}) => (
    <button
      onClick={() => {
        setAppMode(mode);
        setEditingUiContent(null); 
        setEditingSiteContent(null);
        setEditingUltraSiteAnimations(null); // Clear Ultra Animation Editor state
        setUiError(null); setRefinementError(null); 
        setAnimationError(null); setCloneError(null); setThreeDSiteError(null); 
        setSiteRefinementError(null);
        setUltraBaseError(null); setUltraAnimationError(null);
        setUiIconError(null);
        stopOperationTimer(); // Stop timer when switching tabs
      }}
      className={`px-4 py-2 text-sm sm:text-base font-medium rounded-t-lg transition-all duration-200 ease-in-out flex items-center space-x-2
                  ${appMode === mode 
                    ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-500 shadow-lg' 
                    : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
      aria-current={appMode === mode ? "page" : undefined}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const getAppModeDescription = () => {
    if (editingUiContent) {
      return 'Visually edit your UI component. Modify text and replace images.';
    }
    if (editingSiteContent) {
      return `Visually edit your ${appMode === 'websiteCloner' ? 'cloned site' : '3D site'}. Modify text and replace images.`;
    }
    if (editingUltraSiteAnimations) {
        return 'Visually apply AI-powered animations to elements in your Ultra Site.';
    }
    switch(appMode) {
      case 'animation': return 'Craft stunning web animations with AI.';
      case 'uiux': return 'Generate UI/UX designs. Use images, videos, or SVGs for inspiration. Click "Edit" for visual changes or use AI to refine.';
      case 'websiteCloner': return 'Conceptually clone website structures. Visually edit or use AI to refine.';
      case 'threeD': return 'Generate interactive 3D websites. Visually edit or use AI to refine.';
      case 'ultraAnimator': return 'Create highly animated websites. AI generates structure, then add animations via prompts or the visual animation editor.';
      default: return 'Your AI-powered web creation assistant.';
    }
  }

  const isLoadingAny = isAnimationLoading || isUiLoading || isRefiningUi || isCloning || isThreeDSiteLoading || isRefiningSite || isUltraBaseLoading || isUltraAnimating;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-5xl mb-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 mb-2">
          AI Web Creator Studio
        </h1>
        <p className="text-slate-300 text-lg">
          {getAppModeDescription()}
        </p>
      </header>

      {editingUiContent ? (
        <main className="w-full max-w-5xl bg-slate-800 shadow-2xl rounded-lg p-6 md:p-8">
          <UiEditor
            initialUi={editingUiContent}
            onSave={handleSaveEditedUi}
            onCancel={handleCancelEditUi}
          />
        </main>
      ) : editingSiteContent ? (
        <main className="w-full max-w-6xl bg-slate-800 shadow-2xl rounded-lg p-6 md:p-8">
          <SiteEditor
            initialSite={editingSiteContent}
            onSave={handleSaveEditedSite}
            onCancel={handleCancelEditSite}
          />
        </main>
      ) : editingUltraSiteAnimations ? (
        <main className="w-full max-w-6xl bg-slate-800 shadow-2xl rounded-lg p-6 md:p-8">
          <UltraAnimationEditor
            initialSite={editingUltraSiteAnimations}
            onSave={handleSaveUltraAnimations}
            onCancel={handleCancelEditUltraAnimations}
            apiKey={apiKey || ""} 
          />
        </main>
      ) : (
        <>
          <div className="w-full max-w-5xl mb-6">
            <div className="flex border-b border-slate-700 overflow-x-auto pb-px">
              <TabButton label="Animation Coder" mode="animation" icon={<SparklesIcon className="w-5 h-5 hidden sm:inline" />} />
              <TabButton label="UI/UX Generator" mode="uiux" icon={<SparklesIcon className="w-5 h-5 hidden sm:inline" />} />
              <TabButton label="Website Cloner" mode="websiteCloner" icon={<GlobeAltIcon className="w-5 h-5 hidden sm:inline" />} />
              <TabButton label="3D Site Creator" mode="threeD" icon={<CubeTransparentIcon className="w-5 h-5 hidden sm:inline" />} /> 
              <TabButton label="Ultra Animator" mode="ultraAnimator" icon={<FilmIcon className="w-5 h-5 hidden sm:inline" />} />
            </div>
          </div>

          <main className="w-full max-w-5xl bg-slate-800 shadow-2xl rounded-b-lg rounded-tr-lg p-6 md:p-8">
            {appMode === 'animation' && (
              // Animation Coder UI
              <div className="space-y-6">
                <div>
                  <label htmlFor="animationDescription" className="block text-sm font-medium text-slate-300 mb-1">
                    Animation Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="animationDescription"
                    rows={3}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                    placeholder="e.g., 'A card that flips on click', 'Make the uploaded image pulsate'"
                    value={animationDescription}
                    onChange={(e) => setAnimationDescription(e.target.value)}
                    aria-required="true"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="animImageUpload" className="block text-sm font-medium text-slate-300 mb-1">Upload Image (Optional)</label>
                    <input type="file" id="animImageUpload" accept="image/*" onChange={handleAnimImageChange} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-purple-50 hover:file:bg-purple-700"/>
                    {selectedAnimImage && (
                      <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                        <span>{selectedAnimImage.name} ({(selectedAnimImage.size / 1024).toFixed(1)} KB)</span>
                        <button onClick={clearAnimImage} className="text-red-400 hover:text-red-300 text-xs p-1" aria-label="Clear selected animation image">&times; clear</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="animVideoUpload" className="block text-sm font-medium text-slate-300 mb-1">Upload Video (Optional)</label>
                    <input type="file" id="animVideoUpload" accept="video/*" onChange={handleAnimVideoChange} className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-purple-50 hover:file:bg-purple-700"/>
                    {selectedAnimVideo && (
                      <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                        <span>{selectedAnimVideo.name} ({(selectedAnimVideo.size / 1024).toFixed(1)} KB)</span>
                        <button onClick={clearAnimVideo} className="text-red-400 hover:text-red-300 text-xs p-1" aria-label="Clear selected animation video">&times; clear</button>
                      </div>
                    )}
                  </div>
                </div>
                 <p className="text-xs text-slate-400 -mt-4">Complex requests or assets may take a bit longer to generate.</p>
                
                <div>
                  <label htmlFor="modelName" className="block text-sm font-medium text-slate-300 mb-1">3D Model Name (Optional, e.g., "model.glb")</label>
                  <div className="flex">
                    <input type="text" id="modelName" className="w-full p-3 bg-slate-700 border border-slate-600 rounded-l-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400" value={selectedModelName} onChange={(e) => setSelectedModelName(e.target.value)} placeholder="e.g., myAwesomeModel.gltf"/>
                    {selectedModelName && (<button onClick={clearModelName} className="px-3 py-2 bg-slate-600 text-slate-300 hover:bg-slate-500 rounded-r-md border border-l-0 border-slate-600" aria-label="Clear 3D model name">&times;</button>)}
                  </div>
                  {selectedModelName && <p className="mt-1 text-xs text-slate-400">AI assumes '{selectedModelName}' is loadable by Three.js.</p>}
                </div>

                <div>
                  <label htmlFor="numberOfVariations" className="block text-sm font-medium text-slate-300 mb-1">Number of Variations (1-5)</label>
                  <input type="number" id="numberOfVariations" min="1" max="5" className="w-full md:w-1/4 p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500" value={numberOfVariations} onChange={(e) => setNumberOfVariations(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}/>
                </div>

                <button onClick={generateAnimations} disabled={isAnimationLoading || !animationDescription.trim()} className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group">
                  {isAnimationLoading ? <Loader elapsedTime={elapsedTime} /> : (<><SparklesIcon className="w-5 h-5 mr-2 text-yellow-300 group-hover:scale-110 transition-transform" />Generate Animations</>)}
                </button>
                {animationError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{animationError}</p>}
                
                {generatedAnimations.length > 0 && (
                  <section className="mt-12" aria-live="polite">
                    <h2 className="text-2xl font-semibold text-slate-200 mb-6">Generated Animations</h2>
                    <div className="grid grid-cols-1 gap-8">
                      {generatedAnimations.map((anim) => <AnimationCard key={anim.id} animation={anim} />)}
                    </div>
                  </section>
                )}
                {!isAnimationLoading && generatedAnimations.length === 0 && !animationError && (
                  <div className="mt-12 text-center text-slate-400"><p className="text-lg">Your generated animations will appear here.</p></div>
                )}
              </div>
            )}

            {appMode === 'uiux' && (
              // UI/UX Generator UI
              <div className="space-y-6">
                <div>
                  <label htmlFor="uiDescription" className="block text-sm font-medium text-slate-300 mb-1">
                    {generatedUi ? 'Describe a New UI or ' : 'Describe the UI you want '}<span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="uiDescription"
                    rows={generatedUi ? 2 : 3}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                    placeholder={generatedUi ? "e.g., 'A different hero section for a travel website'" : "e.g., 'A modern login form with social media buttons inspired by the uploaded video'"}
                    value={uiDescription}
                    onChange={(e) => setUiDescription(e.target.value)}
                    aria-required="true"
                  />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="uiImageUpload" className="block text-sm font-medium text-slate-300 mb-1">
                            Inspirational Image (Optional)
                        </label>
                        <input
                            type="file"
                            id="uiImageUpload"
                            accept="image/*"
                            onChange={handleUiImageChange}
                            className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-purple-50 hover:file:bg-purple-700"
                        />
                        {selectedUiImage && (
                            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                            <span>{selectedUiImage.name} ({(selectedUiImage.size / 1024).toFixed(1)} KB)</span>
                            <button onClick={clearUiImage} className="text-red-400 hover:text-red-300 text-xs p-1" aria-label="Clear selected UI image">&times; clear</button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="uiVideoUpload" className="block text-sm font-medium text-slate-300 mb-1">
                            Inspirational Video/GIF (Optional)
                        </label>
                        <input
                            type="file"
                            id="uiVideoUpload"
                            accept="video/*,.gif"
                            onChange={handleUiVideoChange}
                            className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-purple-50 hover:file:bg-purple-700"
                        />
                        {selectedUiVideo && (
                            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                            <span>{selectedUiVideo.name} ({(selectedUiVideo.size / 1024).toFixed(1)} KB)</span>
                            <button onClick={clearUiVideo} className="text-red-400 hover:text-red-300 text-xs p-1" aria-label="Clear selected UI video/GIF">&times; clear</button>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="uiIconUploadInitial" className="block text-sm font-medium text-slate-300 mb-1">
                            SVG Icon(s) (Optional)
                        </label>
                        <input
                            type="file"
                            id="uiIconUploadInitial" 
                            accept=".svg,image/svg+xml"
                            multiple 
                            onChange={handleUiIconChange}
                            className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-purple-50 hover:file:bg-purple-700"
                        />
                        {selectedUiIcons.length > 0 && (
                            <div className="mt-2 text-xs text-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>Selected: {selectedUiIcons.map(icon => icon.file.name).join(', ').substring(0, 50) + (selectedUiIcons.map(icon => icon.file.name).join(', ').length > 50 ? '...' : '')}</span>
                                  <button onClick={clearUiIcons} className="text-red-400 hover:text-red-300 text-xs p-1" aria-label="Clear all selected UI SVG icons">&times; clear all</button>
                                </div>
                            </div>
                        )}
                        {uiIconError && <p role="alert" className="text-xs text-red-400 mt-1">{uiIconError}</p>}
                    </div>
                </div>
                <p className="text-xs text-slate-400 -mt-4">Complex requests or assets (especially multiple SVGs) may take a bit longer.</p>
                <button
                  onClick={generateUi}
                  disabled={isUiLoading || !uiDescription.trim() || isRefiningUi || uiIconError !== null}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                >
                  {isUiLoading ? <Loader elapsedTime={elapsedTime}/> : (<><SparklesIcon className="w-5 h-5 mr-2 text-yellow-300 group-hover:scale-110 transition-transform" />{generatedUi ? 'Generate New UI' : 'Generate UI'}</>)}
                </button>
                {uiError && !uiIconError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{uiError}</p>}

                {generatedUi && (
                  <section className="mt-8 pt-8 border-t border-slate-700" aria-live="polite">
                    <h2 className="text-2xl font-semibold text-slate-200 mb-6">Current UI</h2>
                    <UiDisplayCard 
                      uiData={generatedUi}
                      onStartEdit={() => handleStartEditUi(generatedUi)}
                    />
                    
                    <div className="mt-8 pt-6 border-t border-slate-600 space-y-4">
                      <h3 className="text-xl font-semibold text-slate-300">Refine with AI</h3>
                       <p className="text-sm text-slate-400">Provide further instructions or upload a new video/GIF or SVG icon(s) to modify the current UI. Uploaded assets will be prioritized for the refinement.</p>
                      <div>
                        <label htmlFor="uiRefinementPrompt" className="block text-sm font-medium text-slate-300 mb-1">
                          Refinement Instructions
                        </label>
                        <textarea
                          id="uiRefinementPrompt"
                          rows={3}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                          placeholder="e.g., 'Change the primary button color to orange', 'Animate the cards based on the uploaded video', 'Use the uploaded SVG icons for all action buttons'"
                          value={uiRefinementPrompt}
                          onChange={(e) => setUiRefinementPrompt(e.target.value)}
                        />
                      </div>
                       {/* SVG Upload for Refinement */}
                       <div>
                        <label htmlFor="uiIconUploadRefine" className="block text-sm font-medium text-slate-300 mb-1">
                            Upload New SVG Icon(s) for Refinement (Optional)
                        </label>
                        <input
                            type="file"
                            id="uiIconUploadRefine"
                            accept=".svg,image/svg+xml"
                            multiple
                            onChange={handleUiIconChange}
                            className="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-purple-50 hover:file:bg-purple-700"
                        />
                        {selectedUiIcons.length > 0 && (
                             <div className="mt-2 text-xs text-slate-400">
                                <div className="flex items-center justify-between">
                                  <span>Currently Selected: {selectedUiIcons.map(icon => icon.file.name).join(', ').substring(0, 50) + (selectedUiIcons.map(icon => icon.file.name).join(', ').length > 50 ? '...' : '')}</span>
                                  <button onClick={clearUiIcons} className="text-red-400 hover:text-red-300 text-xs p-1" aria-label="Clear all selected UI SVG icons">&times; clear all</button>
                                </div>
                            </div>
                        )}
                        {uiIconError && <p role="alert" className="text-xs text-red-400 mt-1">{uiIconError}</p>}
                      </div>
                      <button
                        onClick={handleRefineUi}
                        disabled={isRefiningUi || (!uiRefinementPrompt.trim() && !selectedUiVideo && selectedUiIcons.length === 0) || isUiLoading || uiIconError !== null}
                        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                      >
                        {isRefiningUi ? <Loader elapsedTime={elapsedTime}/> : (<><SparklesIcon className="w-5 h-5 mr-2 text-slate-100 group-hover:scale-110 transition-transform" />Refine UI</>)}
                      </button>
                      {refinementError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{refinementError}</p>}
                    </div>
                  </section>
                )}
                 {!isUiLoading && !generatedUi && !uiError && !isRefiningUi && (
                  <div className="mt-12 text-center text-slate-400">
                    <p className="text-lg">Your generated UI will appear here.</p>
                    <p>Describe the UI, optionally upload assets (image, video, SVG icons), and click "Generate UI"!</p>
                  </div>
                )}
              </div>
            )}

            {appMode === 'websiteCloner' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="cloneUrl" className="block text-sm font-medium text-slate-300 mb-1">
                    Website URL to Conceptually Clone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    id="cloneUrl"
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                    placeholder="e.g., https://www.example.com/products"
                    value={cloneUrl}
                    onChange={(e) => setCloneUrl(e.target.value)}
                    aria-required="true"
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Note: The AI cannot access the live internet. It will generate code with placeholders for images/icons based on its knowledge of common structures for the type of URL provided.
                  </p>
                </div>
                
                <button
                  onClick={generateClonedSite}
                  disabled={isCloning || !cloneUrl.trim() || isRefiningSite}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                >
                  {isCloning ? <Loader elapsedTime={elapsedTime} /> : (<><GlobeAltIcon className="w-5 h-5 mr-2 text-slate-100 group-hover:scale-110 transition-transform" />{generatedSite ? 'Generate New Site Structure' : 'Clone Website Structure'}</>)}
                </button>
                {cloneError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{cloneError}</p>}

                {generatedSite && (
                  <section className="mt-12 pt-8 border-t border-slate-700" aria-live="polite">
                    <h2 className="text-2xl font-semibold text-slate-200 mb-6">Generated Website Structure</h2>
                    <ClonedSiteDisplayCard 
                        site={generatedSite} 
                        onStartEdit={() => handleStartEditSite(generatedSite)}
                    />
                     <div className="mt-8 pt-6 border-t border-slate-600 space-y-4">
                      <h3 className="text-xl font-semibold text-slate-300">Refine Site with AI</h3>
                       <p className="text-sm text-slate-400">Provide further instructions to modify the current site (HTML, CSS, JS).</p>
                      <div>
                        <label htmlFor="siteRefinementPrompt" className="block text-sm font-medium text-slate-300 mb-1">
                          Refinement Instructions <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="siteRefinementPrompt"
                          rows={3}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                          placeholder="e.g., 'Change the theme to dark mode', 'Add a contact form section', 'Make the hero image a carousel'"
                          value={siteRefinementPrompt}
                          onChange={(e) => setSiteRefinementPrompt(e.target.value)}
                          aria-required="true"
                        />
                      </div>
                      <button
                        onClick={handleRefineSite}
                        disabled={isRefiningSite || !siteRefinementPrompt.trim() || isCloning}
                        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                      >
                        {isRefiningSite ? <Loader elapsedTime={elapsedTime} /> : (<><SparklesIcon className="w-5 h-5 mr-2 text-slate-100 group-hover:scale-110 transition-transform" />Refine Site</>)}
                      </button>
                      {siteRefinementError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{siteRefinementError}</p>}
                    </div>
                  </section>
                )}
                {!isCloning && !generatedSite && !cloneError && !isRefiningSite && (
                  <div className="mt-12 text-center text-slate-400">
                    <p className="text-lg">Your conceptually cloned website code will appear here.</p>
                    <p>Enter a URL and click "Clone Website Structure" to begin.</p>
                  </div>
                )}
              </div>
            )}

            {appMode === 'threeD' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="threeDPrompt" className="block text-sm font-medium text-slate-300 mb-1">
                    Describe your 3D Website <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="threeDPrompt"
                    rows={4}
                    className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                    placeholder="e.g., 'An interactive 3D portfolio with floating cubes and my name in 3D text', 'A simple solar system model with orbiting planets'"
                    value={threeDPrompt}
                    onChange={(e) => setThreeDPrompt(e.target.value)}
                    aria-required="true"
                  />
                   <p className="mt-2 text-xs text-slate-400">
                    The AI will generate HTML, CSS, and Three.js code to create an interactive 3D scene. This can take some time.
                  </p>
                </div>
                
                <button
                  onClick={generateThreeDSite}
                  disabled={isThreeDSiteLoading || !threeDPrompt.trim() || isRefiningSite}
                  className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                >
                  {isThreeDSiteLoading ? <Loader elapsedTime={elapsedTime} /> : (<><CubeTransparentIcon className="w-5 h-5 mr-2 text-slate-100 group-hover:scale-110 transition-transform" />{generatedThreeDSite ? 'Generate New 3D Site' : 'Generate 3D Website'}</>)}
                </button>
                {threeDSiteError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{threeDSiteError}</p>}

                {generatedThreeDSite && (
                  <section className="mt-12 pt-8 border-t border-slate-700" aria-live="polite">
                    <h2 className="text-2xl font-semibold text-slate-200 mb-6">Generated 3D Website</h2>
                    <ThreeDSiteDisplayCard 
                        site={generatedThreeDSite} 
                        onStartEdit={() => handleStartEditSite(generatedThreeDSite)}
                    />
                    <div className="mt-8 pt-6 border-t border-slate-600 space-y-4">
                      <h3 className="text-xl font-semibold text-slate-300">Refine 3D Site with AI</h3>
                       <p className="text-sm text-slate-400">Provide further instructions to modify the current 3D site (HTML, CSS, Three.js).</p>
                      <div>
                        <label htmlFor="siteRefinementPrompt" className="block text-sm font-medium text-slate-300 mb-1">
                          Refinement Instructions <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="siteRefinementPrompt"
                          rows={3}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                          placeholder="e.g., 'Change the cube color to red', 'Add a rotating sphere', 'Make the camera zoom out slowly'"
                          value={siteRefinementPrompt}
                          onChange={(e) => setSiteRefinementPrompt(e.target.value)}
                          aria-required="true"
                        />
                      </div>
                      <button
                        onClick={handleRefineSite}
                        disabled={isRefiningSite || !siteRefinementPrompt.trim() || isThreeDSiteLoading}
                        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                      >
                        {isRefiningSite ? <Loader elapsedTime={elapsedTime} /> : (<><SparklesIcon className="w-5 h-5 mr-2 text-slate-100 group-hover:scale-110 transition-transform" />Refine 3D Site</>)}
                      </button>
                      {siteRefinementError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{siteRefinementError}</p>}
                    </div>
                  </section>
                )}
                {!isThreeDSiteLoading && !generatedThreeDSite && !threeDSiteError && !isRefiningSite && (
                  <div className="mt-12 text-center text-slate-400">
                    <p className="text-lg">Your generated 3D website will appear here.</p>
                    <p>Describe the 3D scene you envision and click "Generate 3D Website".</p>
                  </div>
                )}
              </div>
            )}

            {appMode === 'ultraAnimator' && (
              <div className="space-y-6">
                {!generatedUltraSite && (
                  <>
                    <div>
                      <label htmlFor="ultraBasePrompt" className="block text-sm font-medium text-slate-300 mb-1">
                        Describe the Website Structure <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="ultraBasePrompt"
                        rows={4}
                        className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                        placeholder="e.g., 'A landing page for a coffee shop with a hero section, an about us section, and a contact form. Make sure the hero title has id hero-title.'"
                        value={ultraBasePrompt}
                        onChange={(e) => setUltraBasePrompt(e.target.value)}
                        aria-required="true"
                      />
                      <p className="mt-2 text-xs text-slate-400">
                        AI will generate HTML with Tailwind CSS. Key elements should be given unique IDs in your prompt for animation. This may take some time.
                      </p>
                    </div>
                    <button
                      onClick={generateUltraBaseStructure}
                      disabled={isUltraBaseLoading || !ultraBasePrompt.trim()}
                      className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                    >
                      {isUltraBaseLoading ? <Loader elapsedTime={elapsedTime} /> : (<><SparklesIcon className="w-5 h-5 mr-2 text-yellow-300 group-hover:scale-110 transition-transform" />Generate Base Structure</>)}
                    </button>
                    {ultraBaseError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{ultraBaseError}</p>}
                  </>
                )}

                {generatedUltraSite && (
                  <section className="mt-8 pt-8 border-t border-slate-700" aria-live="polite">
                    <div className="flex justify-between items-center mb-6">
                         <h2 className="text-2xl font-semibold text-slate-200">
                            Ultra Animator Site: <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400">{generatedUltraSite.name}</span>
                        </h2>
                        <button 
                            onClick={() => { setGeneratedUltraSite(null); setEditingUltraSiteAnimations(null); setUltraBasePrompt(''); setUltraAnimationPrompt(''); setUltraAnimationError(null); setUltraBaseError(null); stopOperationTimer();}}
                            className="text-sm text-slate-400 hover:text-slate-200 bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors"
                            aria-label="Start over with a new Ultra Animator site"
                        >
                            Start New Structure
                        </button>
                    </div>

                    <UltraSiteDisplayCard 
                        site={generatedUltraSite} 
                        onStartEditAnimations={() => handleStartEditUltraAnimations(generatedUltraSite)}
                    />
                    
                    <div className="mt-8 pt-6 border-t border-slate-600 space-y-4">
                      <h3 className="text-xl font-semibold text-slate-300">Add/Refine Animations (Overall Prompt)</h3>
                       <p className="text-sm text-slate-400">Describe animations for the entire site structure or multiple elements. Refer to elements by ID. Specify triggers like 'on scroll', 'on click', 'on hover', or 'on page load'. Or, use the "Edit Animations" button on the preview card for element-specific visual AI animation. Animation generation may take a moment.</p>
                      <div>
                        <label htmlFor="ultraAnimationPrompt" className="block text-sm font-medium text-slate-300 mb-1">
                          Overall Animation Instructions <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          id="ultraAnimationPrompt"
                          rows={3}
                          className="w-full p-3 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 placeholder-slate-400 text-slate-100"
                          placeholder="e.g., 'Make element with id hero-title fade in and fly up on page load.' or 'When #cta-button is clicked, make it scale up and then back down.'"
                          value={ultraAnimationPrompt}
                          onChange={(e) => setUltraAnimationPrompt(e.target.value)}
                          aria-required="true"
                        />
                      </div>
                      <button
                        onClick={applyUltraAnimation}
                        disabled={isUltraAnimating || !ultraAnimationPrompt.trim() || isUltraBaseLoading}
                        className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all group"
                      >
                        {isUltraAnimating ? <Loader elapsedTime={elapsedTime} /> : (<><FilmIcon className="w-5 h-5 mr-2 text-slate-100 group-hover:scale-110 transition-transform" />Apply Overall Animation</>)}
                      </button>
                      {ultraAnimationError && <p role="alert" className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{ultraAnimationError}</p>}
                    </div>
                  </section>
                )}
                 {!isUltraBaseLoading && !generatedUltraSite && !ultraBaseError && (
                  <div className="mt-12 text-center text-slate-400">
                    <p className="text-lg">Describe your website's base structure to begin the Ultra Animation process.</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </>
      )}

      <footer className="w-full max-w-5xl mt-12 text-center text-slate-500 text-sm">
        <p>Powered by Gemini API. API Key must be set in <code>process.env.API_KEY</code>.</p>
        {isLoadingAny && operationStartTime && <p className="text-amber-400">AI generation can take some time, please be patient. Elapsed: {elapsedTime}s</p>}
        {appMode === 'animation' && <p>For 3D models, ensure your model file is accessible if you use the generated code locally.</p>}
        {appMode === 'websiteCloner' && !editingSiteContent && <p>Cloning is conceptual. Refine or visually edit the result. Always respect copyright.</p>}
        {appMode === 'uiux' && !editingUiContent && <p>Generate a UI, then refine it with AI or click "Edit" for visual modifications. Use images, videos, or SVG icons for inspiration. Complex asset processing can increase generation time.</p>}
        {appMode === 'threeD' && !editingSiteContent && <p>3D sites use Three.js. Refine with AI or visually edit. Ensure browser WebGL support.</p>}
        {appMode === 'ultraAnimator' && !editingUltraSiteAnimations && <p>Ultra Animator: AI generates structure, then describe animations. Click "Edit Animations" on the card for element-specific visual AI animation guidance.</p>}
        {(editingUiContent || editingSiteContent) && <p>You are in the Visual Editor. Edit text directly and click images to replace. Save or cancel your changes.</p>}
        {editingUltraSiteAnimations && <p>You are in the Ultra Animation Editor. Select elements and use AI to apply animations. Save to update your site's JavaScript.</p>}
      </footer>
    </div>
  );
};

export default App;
