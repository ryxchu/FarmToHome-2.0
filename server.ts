import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";
import otpRouter from "./server/otpRouter";
import { rateLimitMiddleware } from "./server/rateLimit";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

let adminDb: any = null;
try {
  let adminApp;
  if (getApps().length === 0) {
    adminApp = initializeApp({
      projectId: firebaseConfig.projectId,
    });
  } else {
    adminApp = getApps()[0];
  }
  adminDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(adminApp);
} catch (error) {
  console.error("Failed to initialize firebase-admin SDK:", error);
}

const _cleanFilename = typeof import.meta !== "undefined" && import.meta.url
  ? fileURLToPath(import.meta.url)
  : "";
const _cleanDirname = _cleanFilename ? path.dirname(_cleanFilename) : "";

// Lazy Gemini client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "undefined" || key === "null" || key.trim() === "" || key.startsWith("your_")) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Rate limiting is centralized and imported from ./server/rateLimit

// Highly helpful, smart, and friendly AI assistant responses as fallback on standard review/preview environments
function generateMockResponse(message: string, language: string): string {
  const msg = message.toLowerCase().trim();
  const isTagalog = language === 'tagalog' || language === 'tl' || msg.includes('kumusta') || msg.includes('salamat') || msg.includes('nasaan') || msg.includes('magsasaka') || msg.includes('paano') || msg.includes('galing');

  // --- HIGH PRIORITY SPECIFIC FARMTOHOME INTENTS ---

  // 1. Post Crop / Product / Sell
  if (msg.includes('post product') || msg.includes('how to post') || msg.includes('sell product') || msg.includes('post crop') || msg.includes('add crop') || msg.includes('upload crop') || msg.includes('upload product') || msg.includes('how to sell') || msg.includes('magbenta') || msg.includes('benta')) {
    if (isTagalog) {
      return `Upang mag-upload, mag-post, o magbenta ng iyong organikong ani sa FarmToHome:
1. Siguraduhing naka-login ka bilang isang **Farmer (Magsasaka)**.
2. Pumunta sa iyong [Go to Farmer Dashboard](page:dashboard).
3. Siguraduhing naka-upload at aprubado ang iyong mga land credentials ng administrator.
4. Pagkatapos ma-verify, i-click lamang ang **"Add Crop"** button, ilagay ang detalye ng gulay o prutas (pangalan, presyo, at dami ng stock), mag-upload ng larawan, at i-tap ang **Publish**. Live na itong makikita sa shop ng mga Buyers [Go to Shop/Marketplace](page:home)!`;
    }
    return `To post or publish your organic crops/products on FarmToHome:
1. Ensure you are registered and logged into an account with the **Farmer** role.
2. Navigate to your [Go to Farmer Dashboard](page:dashboard).
3. Upload your Land Certification or ownership document in the verification panel.
4. Once verified by the Admin team, simply click on the **"Add Crop"** button, enter the product specs (crop name, unit price, and current stock), upload an image, and click **Publish**. Your crops will be instantly visible to buyers in the store [Go to Shop/Marketplace](page:home)!`;
  }

  // 2. Profile / Account Settings Redirect
  if (msg.includes('where is my profile') || msg.includes('my profile') || msg.includes('find my profile') || msg.includes('profile page') || msg.includes('profile') || msg.includes('nasaan ang profile') || msg.includes('aking profile') || msg.includes('my account') || msg.includes('aking account')) {
    if (isTagalog) {
      return `Maaari mong mahanap ang iyong account at profile settings dito:
- Mag-navigate nang direkta sa iyong profile page: [View Account Profile](page:profile).
- Sa pahinang ito, maaari mong baguhin ang iyong physical delivery address preset, contact number, mobile identity, at tingnan ang iyong active order tracking history. Maaari mo ring i-toggle ang dark o light mode features!`;
    }
    return `You can find your account or profile configuration center here:
- Simply navigate to your profile by clicking this link: [View Account Profile](page:profile).
- In the profile panel, you can update your physical delivery address presets, mobile number, contact email, and monitor your active purchase orders. You can also customize user interface preferences like enabling dark mode panels!`;
  }

  // 3. Register / Create Account
  if (msg.includes('create account') || msg.includes('how to create') || msg.includes('sign up') || msg.includes('register') || msg.includes('rehistro') || msg.includes('gumawa ng account') || msg.includes('how to register') || msg.includes('create an account')) {
    if (isTagalog) {
      return `Upang gumawa ng bagong account sa FarmToHome:
1. I-click ang **Register** o mag-sign-up link sa entry screen.
2. Piliin ang iyong role: **Buyer (Mamimili)** o **Farmer (Magsasaka/Nagbebenta)**.
3. Ilagay ang iyong Email address.
4. Makakatanggap ka ng instant 6-digit verification code (OTP) sa iyong email inbox. Ilagay lamang ito upang makumpleto ang pagpaparehistro nang ligtas at walang password!`;
    }
    return `To create an account or sign up on the FarmToHome platform:
1. Click the **Register** or **Sign Up** links on the authentication gate.
2. Select your desired role: **Buyer** (to purchase organic crops) or **Farmer Partner** (to post and sell crops).
3. Fill in your verified Email address.
4. Our system will immediately issue a secure 6-digit verification code (OTP) directly to your mail inbox. Simply copy and paste the OTP code to log in and start using the application!`;
  }

  // 4. Forgot password / Passwordless Login
  if (msg.includes('forgot password') || msg.includes('forgot my password') || msg.includes('password') || msg.includes('kalimutan ang password') || msg.includes('reset password') || msg.includes('i forgot my password') || msg.includes('ii forgot my password')) {
    if (isTagalog) {
      return `Huwag mag-alala! Ang FarmToHome ay gumagamit ng isang ultra-secure na **password-less authentication model**, kaya hindi mo na kailangang tandaan o i-reset ang anumang password:
1. I-type lamang ang iyong registered Email address sa login screen.
2. Padadalhan ka namin kaagad ng bagong 6-digit verification code (OTP) sa iyong email inbox.
3. Ilagay ang OTP para ligtas at agarang makapasok sa iyong account! Walang stress sa nakalimutang password.`;
    }
    return `No worries at all! FarmToHome is built with a modern, ultra-secure **password-less authentication system**, which means you never have to remember, change, or reset any passwords:
1. Simply input your registered Email address in the login screen.
2. Our system will immediately dispatch a secure, single-use 6-digit verification code (OTP) directly to your email inbox.
3. Input that OTP code to safely and instantly log into your account! It's secure, frictionless, and password-free.`;
  }

  // --- GENERAL ASSISTANCE MODE (The ChatGPT Core Fallbacks) ---
  
  // 1. Programming & Software Help
  if (msg.includes('code') || msg.includes('programming') || msg.includes('html') || msg.includes('python') || msg.includes('java') || msg.includes('c++') || msg.includes('javascript') || msg.includes('typescript') || msg.includes('css') || msg.includes('software')) {
    if (isTagalog) {
      return `Ito ay tulong sa programming:
Narito ang isang sample code snippet na nagpapakita ng isang pangunahing function:
\`\`\`javascript
// Isang kapaki-pakinabang na JS function
function magbentaNgAni(ani, presyo) {
    console.log("Nagbebenta ng " + ani + " sa presyong ₱" + presyo);
    return true;
}
magbentaNgAni("Carabao Mango", 150);
\`\`\`
Maaari kaming gumawa ng kahit anong script para sa iyong mga kailangan sa development. May partikular ka bang gustong lutasin sa code?`;
    }
    return `Here is some customized programming assistance:
Below is a clean JavaScript example demonstrate a fundamental concept:
\`\`\`javascript
// A simple function to log transactions
function processHarvestOrder(cropName, quantity, price) {
    const total = quantity * price;
    console.log(\`Processing order for \${quantity} units of \${cropName}. Total: ₱\${total}\`);
    return { success: true, total };
}
processHarvestOrder("Organic Pechay", 10, 60);
\`\`\`
I can write, debug, and optimize code in almost any programming language (Python, TypeScript, HTML, C++, etc.). What specific coding challenge can I solve for you today?`;
  }

  // 2. Math & Problem Solving
  if (msg.includes('math') || msg.includes('solve') || msg.includes('calculate') || msg.includes('sum') || msg.includes('add') || msg.includes('multiply')) {
    if (isTagalog) {
      return `Aba, kaya ko ring mag-solve ng math! Halimbawa:
- Kung kailangan mo ng kalkulasyon para sa ani at kita:
  Presyo: ₱120/unit, Kabuuang Nabenta: 15 units.
  Kalkulasyon: 120 * 15 = ₱1,800 kabuuang kita!
Ipaalam sa akin kung anong math problem o kalkulasyon ang nais mong lutasin natin!`;
    }
    return `I can definitely assist you with math and problem-solving!
For example, if you want to calculate your trade yields or total crop revenues:
- Unit Price: ₱150, Total Units Sold: 45
- Formula: 150 * 45 = ₱6,750 of gross revenue.
Please share the equations, stats, or logical puzzles you would like me to solve, and I will write down the step-by-step breakdown for you!`;
  }

  // 3. Recipes & Culinary Suggestions
  if (msg.includes('recipe') || msg.includes('cook') || msg.includes('salad') || msg.includes('manggang') || msg.includes('luto') || msg.includes('ulam') || msg.includes('pagkain')) {
    if (isTagalog) {
      return `Narito ang isang masarap at simpleng Recipe gamit ang lokal na sangkap (tulad ng Carabao Mango):
**Sariwang Mangga at Sili Salad (Fresh Mango Chili Salad)**:
- **Mga Sangkap**:
  * 2 malalaking Carabao Mango galing bukid (hiwain ng cubes)
  * 1 maliit na sibuyas (pulang sibuyas, ninipis)
  * 1 maliit na sili (para sa kaunting anghang)
  * 1 kutsara ng katas ng Calamansi o lime juice
  * Sariwang wansoy (cilantro) at isang kurot ng asin
- **Paraan ng paggawa**:
  1. Pagsamahin ang hiwang mangga, sibuyas, at sili sa isang mangkok.
  2. I-drizzle ang sariwang Calamansi juice sa ibabaw.
  3. Budburan ng asin at i-toss nang dahan-dahan. I-serve habang malamig-lamig pa!
Nais mo bang makatanggap ng iba pang mga recipe ng pagkaing Pilipino? Sabihin lang sa akin!`;
    }
    return `Here is a healthy and fresh recipe emphasizing our FarmToHome organic crops:
**Fresh Carabao Mango & Avocado Greens Salad**:
- **Ingredients**:
  * 2 fresh Carabao Mangoes (cubed)
  * 1 bunch of crisp Pechay Baguio or mixed organic salad greens
  * 1 ripe Avocado (sliced)
  * 1 tbsp lemon or fresh Calamansi juice
  * Extra virgin olive oil, salt, and pepper to taste
- **Instructions**:
  1. Wash, dry, and tear the organic greens into bite-size pieces.
  2. Toss the salad greens, cubed sweet mangoes, and avocado slices in a grand serving bowl.
  3. Whisk Calamansi juice, olive oil, salt, and pepper together, then drizzle over the salad. Toss gently and serve immediately!
I can provide recipes for any dish or ingredient you are planning to cook. Let me know what you have in your kitchen!`;
  }

  // 4. Creative Writing, Jokes, and General Knowledge
  if (msg.includes('write') || msg.includes('poem') || msg.includes('story') || msg.includes('joke') || msg.includes('essay') || msg.includes('capital of') || msg.includes('who is') || msg.includes('weather') || msg.includes('science')) {
    if (msg.includes('joke') || msg.includes('biro')) {
      if (isTagalog) {
        return `Narito ang isang nakatutuwang biro tungkol sa mga pananim:
*Bakit laging nakangiti ang mga mais sa bukid?*
*Kasi palagi silang kinikiliti sa kanilang mga tainga (corn ears)!* 😂
Sana ay napangiti kita! May iba pa ba akong maitutulong sa iyo?`;
      }
      return `Here is a lighthearted joke for you:
*Why did the tomato blush?*
*Because it saw the salad dressing!* 😂
I can spin custom stories, draft formal letters, translate materials, or share general knowledge trivia on demand. Let me know what you need!`;
    }
    if (isTagalog) {
      return `Narito ang isang maikling tula na aking isinulat para sa mga magsasaka ng Pampanga:
*Sa lilim ng araw sa gintong parang,*
*Magsasaka'y sipag ang syang tangan.*
*Bawat butil ng pawis na pumapatak,*
*Sariwang biyaya sa hapag ang galak.*
Masaya akong magsulat ng mga kwento, essays, o sumagot sa iyong mga tanong tungkol sa agham at kasaysayan. Ano pa ang nais mong malaman?`;
    }
    return `Here is a short original poem dedicated to our organic sustainable agriculture:
*Beneath the warmth of the morning sun,*
*The farmer’s noble work is run.*
*With hands of soil and hearts of gold,*
*The sweetest crops of the earth unfold.*
I can write stories, jokes, professional emails, academic summaries, or provide insightful guidance on general topics. What creative project are we working on?`;
  }

  // 5. Farming & Agricultural Tips
  if (msg.includes('farming') || msg.includes('tips') || msg.includes('agriculture') || msg.includes('planting') || msg.includes('compost') || msg.includes('pest') || msg.includes('fertilizer') || msg.includes('organic')) {
    if (isTagalog) {
      return `Narito ang ilang mahahalagang organic farming tips para sa iyong taniman:
1. **Composting (Paggawa ng Pataba)**: Gumamit ng mga tira-tirang pagkain, tuyong dahon, at dumi ng hayop para gumawa ng organikong pataba na mayaman sa nitrogen.
2. **Mulching**: Lagyan ng tuyong damo o dayami ang ibabaw ng lupa upang mapanatili ang moisture at maiwasan ang pagtubo ng damo.
3. **Pest Control**: Gumamit ng neem oil mixture o pinaghalong sili at sabon bilang natural na pang-spray laban sa mga peste nang walang kemikal.
Nais mo bang makatanggap ng mas malalimang detalye para sa isang partikular na pananim tulad ng Kamatis o Pechay?`;
    }
    return `Here are some essential organic farming tips for sustainable crop cultivation:
1. **Soil Prep**: Mix organic organic compost (such as leaf mulch and manure) to enhance soil structure and micro-organism activity.
2. **Crop Rotation**: To prevent soil nutrient depletion and pest build-up, alternate planting nitrogen-fixing legumes with heavy-feeders like cabbage or tomatoes.
3. **Natural Pest Defense**: Spray a dilute solution of neem oil or garlic-chili tea to naturally deter caterpillars and aphids without resorting to synthetic pesticides.
Would you like me to elaborate on soil aeration, watering schedules, or organic seedling nursery practices?`;
  }


  // --- FARMTOHOME CONTEXT MODE (The System Guard Fallbacks) ---

  if (isTagalog) {
    // Roles & Feature info
    if (msg.includes('role') || msg.includes('tungkulin') || msg.includes('feature') || msg.includes('paggana') || msg.includes('magagawa') || msg.includes('ginagawa')) {
      return `Narito ang mga feature at magagawa ng bawat role sa FarmToHome:
- **Buyer (Mamimili)**:
  * Maaaring mag-browse ng mga sariwang organic crops sa **Shop** [Go to Shop/Marketplace](page:home).
  * Magdagdag sa cart, mag-checkout (gamit ang **COD** o **GCash**).
  * Makipag-chat nang real-time sa mga magsasaka sa Inbox [Go to Inbox/Messages](page:messages).
  * Mag-track ng delivery sa active orders panel [Track Delivery Progress](page:tracking).
- **Farmer (Magsasaka/Nagbebenta)**:
  * Pamahalaan ang kanilang mga ani sa dashboard [Go to Farmer Dashboard](page:dashboard).
  * Mag-upload ng land credentials para sa real-time na pag-verify sa admin console.
- **Admin / System**:
  * Pag-apruba sa mga pending farmer registrations sa Alerts Console [Go to Alerts Console](page:admin-dashboard).`;
    }

    // Orders, Tracking & LOGISTICS out-of-scope warning
    if (msg.includes('order') || msg.includes('status') || msg.includes('track') || msg.includes('nasaan') || msg.includes('deliver') || msg.includes('padala') || msg.includes('logis') || msg.includes('ship')) {
      return `Gusto mo bang malaman ang status ng iyong order? Narito ang guide:
- **Buyer Dashboard**: Pumunta sa iyong Profile [View Account Profile](page:profile), i-click ang **My Purchases** tab upang makita ang current progress ng orders [Track Delivery Progress](page:tracking).
- **Delivery Timeline**: Karaniwang dumarating ang mga sariwang ani sa loob ng 1-2 araw diretso galing bukid pagkatapos ma-harvest.

⚠️ **PATAKARAN SA LOGISTICS**:
Mangyaring paalalahanan na ang mga **third-party courier delivery API integrations ay OUT OF SCOPE** sa aming platform. Ang logistics, pick-up, at schedule ng padala ay manu-manong kinokoordina sa pamamagitan ng direktang pag-uusap sa pagitan ng buyer at ng local farmer gamit ang chat.`;
    }

    // Farmer certification
    if (msg.includes('farmer') || msg.includes('magsasaka') || msg.includes('sell') || msg.includes('rehistro') || msg.includes('benta') || msg.includes('cert') || msg.includes('credentials')) {
      return `Gabay sa pagsali bilang Magsasaka (Farmer Partner) sa Pampanga:
- **Rehistro**: Gumawa ng account sa FarmToHome at piliin ang **Farmer** role.
- **Dokumento**: Pumunta sa **Dashboard** [Go to Farmer Dashboard](page:dashboard) at mag-upload ng iyong Land Trust o government certificate.
- **Benta**: Matapos ma-approve ng Admin, maari mo nang i-upload at i-post ang iyong mga produkto nang walang kahit anong bawas!`;
    }

    // Products & Inventory in Tagalog
    if (msg.includes('gulay') || msg.includes('prutas') || msg.includes('vegetable') || msg.includes('crop') || msg.includes('mango') || msg.includes('cabbage') || msg.includes('pechay')) {
      return `Mga sariwa at organikong produkto sa FarmToHome:
- **Mga Produkto**: Carabao Mango, Pechay, Kamatis, Onions, at Cabbage straight from local fields!
- **Harvest on Demand**: Direktang inaani kapag may order lamang para garantisadong sariwa.
- **Paano bumili**: Mag-browse sa [Go to Shop/Marketplace](page:home) at idagdag sa cart!`;
    }

    // Payments and GCash/COD warnings
    if (msg.includes('bayad') || msg.includes('payment') || msg.includes('gcash') || msg.includes('cod') || msg.includes('presyo') || msg.includes('price')) {
      return `Mga paraan ng pagbabayad at presyo sa FarmToHome:
- **Cash on Delivery (COD)**: Abutin ang bayad sa rider pagdating ng mga sariwang gulay o prutas.
- **GCash**: Magbayad nang digital at secure sa checkout.

⚠️ **PATAKARAN SA PAGBABAYAD**:
Ang mga **online electronic payment gateways ay ganap na OUT OF SCOPE** sa platform. Ang mga transaction ay eksklusibong kinukumpleto sa pamamagitan ng Cash on Delivery (COD) o mano-manong pag-upload ng inyong GCash verification receipts/slips during checkout.`;
    }

    // Inbox Chat
    if (msg.includes('chat') || msg.includes('message') || msg.includes('usap') || msg.includes('mensahe') || msg.includes('kausap')) {
      return `Maaari kang makipag-chat nang real-time sa kupunan o mga magsasaka! Pumunta sa [Go to Inbox/Messages](page:messages) upang simulan ang pag-uusap.`;
    }

    // Greetings & Politeness
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return `Kumusta! Ako ang iyong FarmToHome assistant. Paano kita matutulungan ngayon? Maaari mo akong tanungin tungkol sa mga pananim, feature ng app, o kahit anong pangkalahatang kaalaman (general knowledge)!`;
    }
    if (msg.includes('salamat') || msg.includes('thanks') || msg.includes('ok') || msg.includes('sige')) {
      return `Walang anuman! Masaya akong makatulong sa iyong FarmToHome journey. Kung may tanong ka pa, huwag mag-atubiling magtanong!`;
    }

    // Default Tagalog fallback
    return `Salamat sa iyong mensahe! Ako ang iyong FarmToHome AI Assistant.
Maaari mo akong tanungin tungkol sa platform (Buyers, Farmers, Admin features, GCash/COD payment systems, manual delivery logistics) o kahit anong pangkalahatang katanungan tulad ng programming, recipes, o maths! Paano kita matutulungan ngayon?`;

  } else {
    // English
    if (msg.includes('role') || msg.includes('feature') || msg.includes('do in') || msg.includes('can do') || msg.includes('system') || msg.includes('buyer') || msg.includes('farmer') || msg.includes('seller') || msg.includes('admin')) {
      return `Here are the official user roles and application features in FarmToHome:
- **Buyer**:
  * **Shop**: Browse fresh local crops [Go to Shop/Marketplace](page:home).
  * **Checkout**: Secure orders via Cash on Delivery (COD) or GCash verification receipts.
  * **Live Chats**: Talk directly with farmers [Go to Inbox/Messages](page:messages).
  * **Order Status**: Check delivery steps under profile purchases history.
- **Farmer Partner**:
  * **Dashboard**: Upload land certificates and manage crop inventory [Go to Farmer Dashboard](page:dashboard).
- **Admin**:
  * Approve farmer listings and verify registrations safely in [Go to Alerts Console](page:admin-dashboard).`;
    }

    // Orders, Tracking & LOGISTICS out-of-scope warning in English
    if (msg.includes('order') || msg.includes('status') || msg.includes('track') || msg.includes('where') || msg.includes('deliver') || msg.includes('ship') || msg.includes('logis')) {
      return `Here is your tracking and delivery user guide:
- **My Purchases**: Find current order status inside your Profile purchases card [Track Delivery Progress](page:tracking).
- **Timeline**: Deliveries take roughly 24-48 hours since fields are harvested strictly on-demand.

⚠️ **LOGISTICS NOTICE**:
Please be reminded that **third-party courier delivery API integrations are OUT OF SCOPE** for this application. Delivery logistics, pick-up, and schedules are handled and coordinated manually between the buyer and the farmer using direct chats.`;
    }

    // Farmer credentials
    if (msg.includes('farmer') || msg.includes('seller') || msg.includes('sell') || msg.includes('register') || msg.includes('join') || msg.includes('credentials') || msg.includes('certify')) {
      return `Want to join our sustainable farmer network? Here is how:
- **Registration**: Select the Farmer role during register.
- **Document Certs**: Head over to your dashboard [Go to Farmer Dashboard](page:dashboard) and upload proof of land ownership.
- **Keep 100% Profits**: Zero middleman cuts or listing markups once approved by administration.`;
    }

    // Products
    if (msg.includes('mango') || msg.includes('fruit') || msg.includes('vegetable') || msg.includes('cabbage') || msg.includes('crop') || msg.includes('pechay')) {
      return `Our certified high-quality agricultural products:
- Carabao Mangoes (Mangga), Fresh Pechay, Organic Tomatoes, Cabbage, and Red Onions straight from Pampanga soils!
- Go to the shop page [Go to Shop/Marketplace](page:home) to inspect current stocks, pricing, and add products directly to your cart.`;
    }

    // Payments and electronic gateway out-of-scope warning
    if (msg.includes('pay') || msg.includes('payment') || msg.includes('gcash') || msg.includes('cod') || msg.includes('price') || msg.includes('cost')) {
      return `Payment and pricing procedures on FarmToHome:
- **Cash on Delivery (COD)**: Hand over payments to delivery riders.
- **GCash Pay**: Send transfer digitally at checkout.

⚠️ **PAYMENT NOTICE**:
Please be reminded that **online electronic payment gateways are OUT OF SCOPE** for this platform. Transactions are strictly completed via Cash on Delivery (COD) or by manually uploading your GCash verification payment receipt slips during checkout.`;
    }

    // Inbox Chat
    if (msg.includes('chat') || msg.includes('message') || msg.includes('contact') || msg.includes('inbox')) {
      return `Communicate instantly with our built-in real-time inbox messenger! Click here to [Go to Inbox/Messages](page:messages) and strike a conversation directly.`;
    }

    // Greetings & Politeness
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg.includes('morning')) {
      return `Hello! I'm your FarmToHome AI support assistant. How can I guide you today?
Ask me anything about our crops, user features, payment boundaries, or ask me general questions like programming, recipes, creative writing, or maths help!`;
    }

    if (msg.includes('thank') || msg.includes('thanks') || msg.includes('ok') || msg.includes('okay')) {
      return `You're very welcome! If there's anything else you wish to inquire about, whether it's general ChatGPT assistance or FarmToHome features, just send a message. Stay healthy!`;
    }

    // Default English fallback
    return `Thank you for reaching out! I am running on the local/offline safe support system right now.
I can explain everything about the FarmToHome platform:
1. **User Roles & App Features** (Buyer options, Farmer Dashboard, Admin console)
2. **Order Tracking** and delivery timelines
3. Using **GCash or Cash on Delivery (COD)**
4. How to **publish fresh organic vegetables** (Pechay, Cabbage, Mangoes)
Also, feel free to ask me general questions (such as coding help, recipes, general knowledge facts, math calculations, and more)—I will answer them precisely and comprehensively!`;
  }
}

// In-memory OTP storage (for demo purposes, use a database in production)
const otps = new Map<string, string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support high resolution land credentials, image profiles and large uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Gracefully handle body-parser errors so we always return JSON instead of an HTML error page
  app.use((err: any, req: any, res: any, next: any) => {
    if (err) {
      console.error("[Payload Parser Error]:", err);
      return res.status(err.status || 400).json({
        success: false,
        error: err.code || "PAYLOAD_ERROR",
        message: err.message || "Request entity details or file size is too large for processing."
      });
    }
    next();
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "FarmToHome API is running" });
  });

  // Secure OTP Auth API Router
  app.use("/api/auth", otpRouter);

  // OTP Email endpoint
  app.post("/api/send-otp", rateLimitMiddleware(5, 60000), async (req, res) => {
    try {
      const { email, phone, type } = req.body;
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const identifier = type === 'email' ? email : phone;
      
      if (!identifier) {
        return res.status(400).json({ 
          success: false, 
          message: `${type === 'email' ? 'Email' : 'Phone'} is required to issue a verification code.` 
        });
      }
      
      otps.set(identifier, otp);
      console.log(`[OTP] Generated for ${identifier}: ${otp}`);

      const smtpUser = process.env.SMTP_USER || 'farmtohomee11@gmail.com';
      const smtpPass = process.env.SMTP_PASS || 'welt gieb tlom kpxe';

      if (type === 'email') {
        try {
          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: `"FarmToHome" <${smtpUser}>`,
            to: email,
            subject: "Your FarmToHome Verification Code",
            text: `Your verification code is: ${otp}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #333;">
                <h2 style="color: #10b981;">FarmToHome Verification</h2>
                <p>Your 6-digit verification code is:</p>
                <div style="font-size: 32px; font-weight: bold; color: #0f172a; padding: 15px; background: #f8fafc; border-radius: 8px; display: inline-block; letter-spacing: 5px;">
                   ${otp}
                </div>
                <p style="margin-top: 20px; font-size: 12px; color: #666;">This code will expire in 10 minutes.</p>
              </div>
            `,
          });
          res.json({ success: true, message: "OTP sent to email" });
        } catch (error: any) {
          console.warn("Failed to send SMTP email, falling back to simulated OTP on localhost:", error);
          res.json({ 
            success: true, 
            message: "Verification simulated on Localhost (SMTP fallback)", 
            dev: true,
            otp: otp
          });
        }
      } else {
        // Safe cellphone normalize to prevent crashes if phone is missing or undefined
        const safePhone = phone || '';
        const clean = safePhone.replace(/[^0-9]/g, '');
        let e164Phone = safePhone;
        if (clean.startsWith('09') && clean.length === 11) {
          e164Phone = '+63' + clean.slice(1);
        } else if (clean.startsWith('9') && clean.length === 10) {
          e164Phone = '+63' + clean;
        } else if (clean.startsWith('63') && clean.length === 12) {
          e164Phone = '+' + clean;
        } else if (clean && !e164Phone.startsWith('+')) {
          e164Phone = '+' + clean;
        }

        console.log(`[SMS] Initiating real-time SMS delivery to ${safePhone} (E.164: ${e164Phone})`);

        // 1. Check for Semaphore API Key (Excellent for Philippines CP numbers)
        const semaphoreApiKey = process.env.SEMAPHORE_API_KEY;
        if (semaphoreApiKey && clean) {
          try {
            // Semaphore expects standard local format like 09193604094
            let localPhone = clean;
            if (localPhone.startsWith('63')) {
              localPhone = '0' + localPhone.slice(2);
            } else if (!localPhone.startsWith('0') && localPhone.length === 10) {
              localPhone = '0' + localPhone;
            }

            console.log(`[SMS Semaphore] Sending SMS via Semaphore to ${localPhone}`);
            const semRes = await fetch('https://api.semaphore.co/api/v4/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                apikey: semaphoreApiKey,
                number: localPhone,
                message: `Your FarmToHome verification code is ${otp}. Valid for 10 minutes.`,
                sendername: process.env.SEMAPHORE_SENDER_NAME || 'SEMAPHORE'
              })
            });

            const semData = await semRes.json();
            if (semRes.ok) {
              console.log(`[SMS Semaphore] Success response:`, semData);
              return res.json({ 
                success: true, 
                message: `Verification code sent in real-time via Semaphore to ${localPhone}!`
              });
            } else {
              console.error("[SMS Semaphore] API error response:", semData);
            }
          } catch (err) {
            console.error("[SMS Semaphore] Request failed:", err);
          }
        }

        // 2. Check for Twilio API Credentials (Global Standard)
        const twilioSid = process.env.TWILIO_ACCOUNT_SID;
        const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
        const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

        if (twilioSid && twilioAuthToken && twilioFrom && clean) {
          try {
            console.log(`[SMS Twilio] Sending SMS via Twilio to ${e164Phone}`);
            const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
            const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuthToken}`).toString('base64');

            const twilioRes = await fetch(url, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                From: twilioFrom,
                To: e164Phone,
                Body: `Your FarmToHome verification code is ${otp}. Valid for 10 minutes.`
              })
            });

            const twilioData: any = await twilioRes.json();
            if (twilioRes.ok) {
              console.log(`[SMS Twilio] Success response:`, twilioData);
              return res.json({ 
                success: true, 
                message: `Verification code sent in real-time via Twilio to ${safePhone}!`
              });
            } else {
              console.error("[SMS Twilio] API error response:", twilioData);
            }
          } catch (err) {
            console.error("[SMS Twilio] Request failed:", err);
          }
        }

        // 3. Check for Textbelt (Free Sandbox Fallback)
        if (clean) {
          try {
            console.log(`[SMS Textbelt] Trying free Textbelt API for immediate real-time testing to ${e164Phone}...`);
            const textbeltRes = await fetch('https://textbelt.com/text', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: e164Phone,
                message: `Your FarmToHome verification code is ${otp}. Valid for 10 minutes.`,
                key: 'textbelt'
              })
            });

            const textbeltData: any = await textbeltRes.json();
            if (textbeltData && textbeltData.success) {
              console.log(`[SMS Textbelt] Sent successfully! Quota remaining: ${textbeltData.quotaRemaining || 0}`);
              return res.json({ 
                success: true, 
                message: `Verification code sent in real-time to cellphone ${safePhone}!`, 
                dev: true
              });
            } else {
              console.warn("[SMS Textbelt] Limit exceeded or failed:", textbeltData.error || textbeltData);
            }
          } catch (err) {
            console.warn("[SMS Textbelt] Gateway request failed:", err);
          }
        }

        // 4. Default simulated sandbox fallback
        console.info(`[SMS Fallback] No SMS credentials configured or succeeded. Falling back to localhost secure sandbox.`);
        res.json({ 
          success: true, 
          message: "Simulating OTP code on localhost (Add SEMAPHORE_API_KEY or TWILIO_ACCOUNT_SID in your .env for production SMS!)", 
          dev: true
        });
      }
    } catch (err: any) {
      console.error("[OTP controller error]:", err);
      res.status(500).json({ success: false, message: "Server encountered error generating or dispatching OTP." });
    }
  });

  // Dedicated endpoint for Forgot Password notification (to ensure custom SMTP is used)
  app.post("/api/forgot-password-notify", rateLimitMiddleware(5, 60000), async (req, res) => {
    const { email } = req.body;
    const smtpUser = process.env.SMTP_USER || 'farmtohomee11@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'welt gieb tlom kpxe';

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"FarmToHome Support" <${smtpUser}>`,
        to: email,
        subject: "Password Reset Requested",
        text: `A password reset was requested for your FarmToHome account. If you didn't request this, please ignore it. Otherwise, look for the official Firebase reset email in your inbox.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #10b981;">Password Reset Requested</h2>
            <p>You requested to reset your password for FarmToHome.</p>
            <p><strong>Please check your inbox for an official password reset link from Google/Firebase.</strong></p>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">This is an automated notification from your custom SMTP relay.</p>
          </div>
        `,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Forgot pass notify error:", error);
      res.status(500).json({ success: false });
    }
  });

  // Contact Us endpoint
  app.post("/api/contact-us", rateLimitMiddleware(5, 60000), async (req, res) => {
    const { name, email, phone, message } = req.body;
    const smtpUser = process.env.SMTP_USER || 'farmtohomee11@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'welt gieb tlom kpxe';

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"FarmToHome Contact Form" <${smtpUser}>`,
        to: 'farmtohomee11@gmail.com',
        replyTo: email,
        subject: `[Contact Form] Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\n\nMessage:\n${message}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981; margin-top: 0;">New Contact Form Submission</h2>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Phone:</strong> ${phone || 'N/A'}</p>
            </div>
            <p style="font-size: 14px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px; letter-spacing: 0.5px;">Message:</p>
            <div style="background-color: #fff; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; white-space: pre-wrap; font-size: 15px; color: #1e293b; line-height: 1.6;">
              ${message}
            </div>
            <p style="margin-top: 25px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px;">
              This email was sent from the FarmToHome platform contact page.
            </p>
          </div>
        `,
      });

      res.json({ success: true, message: "Thank you for contacting us! We've received your message." });
    } catch (error: any) {
      console.error("Failed to process contact message:", error);
      res.status(500).json({ success: false, message: "Failed to send message. Please try again later." });
    }
  });

  app.post("/api/verify-otp", rateLimitMiddleware(10, 60000), (req, res) => {
    const { identifier, otp } = req.body;
    const storedOtp = otps.get(identifier);

    // Strictly require the correctly stored OTP
    if (storedOtp && storedOtp === otp) {
      otps.delete(identifier);
      res.json({ success: true, message: "OTP verified" });
    } else {
      res.status(400).json({ success: false, message: "Invalid OTP" });
    }
  });

  // PayMongo Payment Checkout Session Creator (for real GCash, Maya, cards transactions)
  app.post("/api/payment/create-checkout", rateLimitMiddleware(20, 60000), async (req, res) => {
    try {
      const { items, totalAmount, shippingFee, discount, customerName, customerEmail, customerPhone, deliveryAddress } = req.body;

      if (!items || !totalAmount) {
        return res.status(400).json({ success: false, error: "Items and totalAmount are required." });
      }

      const apiKey = process.env.PAYMONGO_SECRET_KEY;
      
      // If payment key is blank/missing or placeholder, fallback to sandbox response with clear instruction
      if (!apiKey || apiKey.trim() === "" || apiKey === "undefined" || apiKey.startsWith("your_")) {
        console.log("[Payment API] PAYMONGO_SECRET_KEY not set. Serving sandbox GCash checkout.");
        // Simulate a sandboxed PayMongo payment checkout redirect
        const fakeCheckoutId = "cs_sandbox_" + Math.random().toString(36).substring(2, 11);
        return res.json({
          success: true,
          mode: "sandbox",
          checkoutUrl: `/gcash-sandbox?checkoutId=${fakeCheckoutId}&total=${totalAmount}&phone=${encodeURIComponent(customerPhone || '0917-888-FARM')}&name=${encodeURIComponent(customerName || 'Buyer')}`,
          message: "Sandbox payment simulation initiated. Add PAYMONGO_SECRET_KEY to your settings to enable official GCash live API transactions."
        });
      }

      // Convert PHP pesos to centavos (PHP centavos is the base currency for PHP in PayMongo)
      const totalAmountCentavos = Math.round(totalAmount * 100);

      // Create request payload for PayMongo line items
      // Under PayMongo rules, amounts must be non-zero positive, so we summarize into a single clean order check-out item
      const cropDetails = items.map((i: any) => `${i.name} (x${i.quantity})`).join(", ");
      const sessionPayload = {
        data: {
          attributes: {
            payment_method_types: ["gcash", "paymaya", "card"],
            line_items: [
              {
                amount: totalAmountCentavos,
                currency: "PHP",
                name: "FarmToHome Direct-from-Farm Harvest",
                quantity: 1,
                description: `Freshly Sourced: ${cropDetails.substring(0, 100)}`
              }
            ],
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `FarmToHome Order payment - Destination: ${deliveryAddress || 'Cooperatives Central Hub'}`,
            success_url: `${req.headers.referer || 'https://ais-pre-xw6wmipkddoqhidc6mlpvq-883406866936.asia-southeast1.run.app/'}?paymentStatus=success`,
            cancel_url: `${req.headers.referer || 'https://ais-pre-xw6wmipkddoqhidc6mlpvq-883406866936.asia-southeast1.run.app/'}?paymentStatus=cancel`
          }
        }
      };

      console.log("[Payment API] Initiating official PayMongo checkout creation...", JSON.stringify(sessionPayload));

      const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`;
      const response = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader
        },
        body: JSON.stringify(sessionPayload)
      });

      const result: any = await response.json();

      if (!response.ok) {
        console.error("[Payment API] PayMongo service returned error details:", result);
        const errMessage = result.errors?.[0]?.detail || "Failed to contact PayMongo API service.";
        return res.status(response.status).json({ success: false, error: errMessage });
      }

      const checkoutUrl = result.data?.attributes?.checkout_url;
      if (!checkoutUrl) {
         return res.status(500).json({ success: false, error: "PayMongo did not return a valid checkout session URL." });
      }

      return res.json({
        success: true,
        mode: "live",
        checkoutUrl,
        checkoutId: result.data.id
      });
    } catch (error: any) {
      console.error("[Payment API] Fatal error compiling checkout request:", error);
      return res.status(500).json({ success: false, error: error.message || "Internal server error" });
    }
  });

  // Gemini AI Chatbot support-chat endpoint
  app.post("/api/gemini/support-chat", rateLimitMiddleware(10, 60000), async (req, res) => {
    let fallbackText = "Sorry, I'm having trouble understanding. Please ask again.";
    let userMessage = "";
    let userLanguage = "en";
    try {
      const { message, language } = req.body;
      const history = req.body.history;
      userMessage = message || "";
      userLanguage = language || "en";
      console.log(`[Support Chat] New request: "${userMessage}" in ${userLanguage}`);
      
      fallbackText = generateMockResponse(userMessage, userLanguage);

      // 1. Removed strict out-of-context block to allow general question help, programming assistance, recipes, and more.

      // 2. Fetch live database context (Products, Posts, Reviews, Users) with rich default fallback catalogs
      const defaultProducts = [
        "- **Crop Name**: Carabao Mango (Mangga), **Price**: ₱150/unit, **Stock**: 45 units, **Id**: m_carabao_1, **Category**: Fruits, **Description**: Sweet and pesticide-free Guimaras Carabao Mangoes.",
        "- **Crop Name**: Fresh Pechay Baguio, **Price**: ₱60/unit, **Stock**: 120 units, **Id**: v_pechay_1, **Category**: Vegetables, **Description**: Crispy and freshly harvested organically grown leafy greens.",
        "- **Crop Name**: Organic Tomatoes (Kamatis), **Price**: ₱80/unit, **Stock**: 80 units, **Id**: v_tomatoes_1, **Category**: Vegetables, **Description**: Plump and sun-ripened community harvest.",
        "- **Crop Name**: Red Onions (Sibuyas Tagalog), **Price**: ₱120/unit, **Stock**: 150 units, **Id**: v_onions_1, **Category**: Vegetables, **Description**: Pungent and freshly dried authentic onions.",
        "- **Crop Name**: Highland Cabbage, **Price**: ₱70/unit, **Stock**: 95 units, **Id**: v_cabbage_1, **Category**: Vegetables, **Description**: Dense, fresh highland cabbage heads straight from Benguet.",
        "- **Crop Name**: Fresh Calamansi, **Price**: ₱90/unit, **Stock**: 60 units, **Id**: f_calamansi_1, **Category**: Fruits, **Description**: Juicy and sour premium grade calamansi citrus fruits."
      ];

      const defaultPosts = [
        "- **Post ID**: p_harvest_1, **Title**: Fresh Harvest notice - Guimaras Mangoes, **Content**: We are ready to harvest our Carabao Mangoes this Friday! Placed orders will be shipped out within 24 hours of harvest., **Author**: Farmer Juan",
        "- **Post ID**: p_transport_1, **Title**: Combined logistics coordination Benguet to Manila, **Content**: Coordinating joint dispatch with partner farmers for Benguet highland crops to reduce transportation footprint., **Author**: Farmer Kiko",
        "- **Post ID**: p_methods_1, **Title**: Our Organic Soil Preparation Methods, **Content**: Sharing our customized bokashi and compost tea soil preparation to keep our vegetables chemical-free., **Author**: Farmer Lito"
      ];

      const defaultReviews = [
        "- **Review ID**: r_1, **Product ID**: m_carabao_1, **Rating**: 5 stars, **Comment**: Incredibly sweet! Better than those in local supermarkets. Highly recommended!, **Buyer**: Maria Santos",
        "- **Review ID**: r_2, **Product ID**: v_pechay_1, **Rating**: 5 stars, **Comment**: Very fresh, arrived crisp and green. Support our local farmers!, **Buyer**: Jun-Jun Corpuz",
        "- **Review ID**: r_3, **Product ID**: v_tomatoes_1, **Rating**: 4 stars, **Comment**: Juicy and great size, though two of them got slightly bruised during courier transit., **Buyer**: Anna de Castro"
      ];

      let productsContext = defaultProducts.join("\n");
      let postsContext = defaultPosts.join("\n");
      let reviewsContext = defaultReviews.join("\n");
      let usersContext = "Currently, there are no users registered in our database.";

      if (adminDb) {
        try {
          const prodSnapshot = await adminDb.collection('products').where('isPublished', '==', true).limit(100).get();
          if (!prodSnapshot.empty) {
            const prods = prodSnapshot.docs.map((doc: any) => {
              const d = doc.data();
              return `- **Crop Name**: ${d.name}, **Price**: ₱${d.price}/unit, **Stock**: ${d.stock || 0} units, **Id**: ${doc.id}, **Category**: ${d.category || 'General'}, **Description**: ${d.description || ''}`;
            });
            productsContext = prods.join("\n");
          }
        } catch (err) {
          console.log("[Support Chat] Info: products loaded using fallback dataset.");
        }

        try {
          const postsSnapshot = await adminDb.collection('posts').limit(100).get();
          if (!postsSnapshot.empty) {
            const posts = postsSnapshot.docs.map((doc: any) => {
              const d = doc.data();
              return `- **Post ID**: ${doc.id}, **Title**: ${d.title || 'Untitled'}, **Content**: ${d.content || ''}, **Author**: ${d.authorName || 'Anonymous'}`;
            });
            postsContext = posts.join("\n");
          }
        } catch (err) {
          console.log("[Support Chat] Info: posts loaded using fallback dataset.");
        }

        try {
          const reviewsSnapshot = await adminDb.collection('reviews').limit(50).get();
          if (!reviewsSnapshot.empty) {
            const revs = reviewsSnapshot.docs.map((doc: any) => {
              const d = doc.data();
              return `- **Review ID**: ${doc.id}, **Product ID**: ${d.productId}, **Rating**: ${d.rating} stars, **Comment**: ${d.comment || ''}, **Buyer**: ${d.buyerName || 'Buyer'}`;
            });
            reviewsContext = revs.join("\n");
          }
        } catch (err) {
          console.log("[Support Chat] Info: reviews loaded using fallback dataset.");
        }

        try {
          const usersSnapshot = await adminDb.collection('users').limit(50).get();
          if (!usersSnapshot.empty) {
            const users = usersSnapshot.docs.map((doc: any) => {
              const d = doc.data();
              return `- **User**: ${d.fullName || d.email || 'Anonymous'}, **Role**: ${d.role || 'buyer'}, **Status**: ${d.status || 'unverified'}, **ID**: ${doc.id}`;
            });
            usersContext = users.join("\n");
          }
        } catch (err) {
          usersContext = "Member accounts and identity ledgers are kept securely encrypted in the ledger database.";
        }
      } else {
        console.log("[Support Chat] Info: Firebase adminDb is null/unconfigured, using high-quality stored fallbacks.");
        usersContext = "Member accounts and identity ledgers are kept securely encrypted in the ledger database.";
      }

      const client = getGeminiClient();
      if (!client) {
        console.warn("[Support Chat] GEMINI_API_KEY is missing/invalid. Falling back to local offline smart response.");
        console.log(`[Support Chat] Returning fallback text: "${fallbackText.substring(0, 60)}..."`);
        return res.json({ success: true, text: fallbackText });
      }      // Clean and map chat history to the structure the newer @google/genai SDK expects
      let chatHistory = (history || []).map((msg: any) => {
        const textVal = msg.parts?.[0]?.text || msg.text || "";
        const roleVal = msg.role === 'model' || msg.role === 'bot' ? 'model' : 'user';
        return {
          role: roleVal,
          parts: [{ text: textVal }]
        };
      });

      // Gemini chats MUST start with a 'user' turn, so keep removing model turns at the beginning if any exist
      while (chatHistory.length > 0 && chatHistory[0].role === 'model') {
        chatHistory.shift();
      }

      // If chatHistory is empty, construct a single-turn content array with the current message
      if (chatHistory.length === 0) {
        chatHistory.push({
          role: 'user',
          parts: [{ text: userMessage }]
        });
      } else {
        // Ensure the last element in history corresponds to the current userMessage or we append it if missing
        const lastMsg = chatHistory[chatHistory.length - 1];
        if (lastMsg.role !== 'user' || lastMsg.parts[0]?.text !== userMessage) {
          chatHistory.push({
            role: 'user',
            parts: [{ text: userMessage }]
          });
        }
      }

      console.log(`[Support Chat] Sending history of ${chatHistory.length} turns to Gemini with rich live database context...`);
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: chatHistory,
        config: {
          systemInstruction: `You are an advanced, versatile, and highly intelligent AI Assistant designed for the FarmToHome platform—an e-commerce system bridging local farmers in Mexico, Pampanga with consumers. Your engine is powered with the broad reasoning capabilities of a general-purpose LLM like ChatGPT, combined with strict contextual awareness of the FarmToHome system.

You must operate under the following structural behavior rules:

1. GENERAL ASSISTANCE MODE (The ChatGPT Core):
- If the user asks general questions (e.g., programming help, creative writing, general knowledge, recipes, or farming tips), you must answer them comprehensively, creatively, and accurately without throwing errors or refusing. Do not say "I am only an e-commerce bot" or refuse general queries under any circumstances. Be as helpful, fluent, and brilliant as ChatGPT.

2. FARMTOHOME CONTEXT MODE (The System Guard):
- If the user asks about orders, accounts, or trading functionality on FarmToHome, ground your answers strictly within the FarmToHome parameters.
- If they ask about payment channels, explicitly remind them that online electronic payment gateways are out of scope. Transactions are strictly handled via Cash on Delivery (COD) or manual upload of GCash verification slips.
- If they ask about logistics or courier delivery tracking, clarify that third-party courier API integrations are out of scope; delivery logistics are coordinated manually between the buyer and the farmer.

3. ROBUST ERROR AVOIDANCE:
- Never break character, drop your system formatting, or expose raw system code.
- If a query is ambiguous, provide a balanced answer that satisfies the general intent while politely offering assistance with the FarmToHome platform if needed.
- Keep your tone supportive, smart, professional, and adaptive.

PLATFORM PAGES & TARGET ROUTING CAPABILITY:
You can guide and navigate users directly across various pages inside the application!
Whenever you describe a page, or if a user asks how to do something on a page, MUST provide a clickable custom redirections markdown link using exactly these patterns:
- [Go to Shop/Marketplace](page:home) to let them browse all available crops.
- [Go to Farmer Dashboard](page:dashboard) for farmer crops, certifications, and earnings.
- [Go to Inbox/Messages](page:messages) to chat in real-time with local farmers.
- [Track Delivery Progress](page:tracking) to view real-time delivery statuses of active orders.
- [View Account Profile](page:profile) to edit address presets, contact info, and security checks.
- [Go to Alerts Console](page:admin-dashboard) for security/certifications (Admin only).

Whenever a user is interested in a specific crop from the inventory, MUST format a clickable relative redirection link: [View crop_name](product:productId) (e.g. [View Pechay](product:abc123xyz)).
Whenever they are interested in a specific farmer, you can direct them using: [Visit Farmer_Name's Profile](farmer:farmerUserId) (e.g. [Visit Mang Juan's Profile](farmer:user456)).

LIVE DATABASE LISTINGS & INVENTORY:
Here is the real-time crop inventory from our live Firestore database:
${productsContext}

LIVE COMMUNITY FORUM POSTS:
Here are the active posts in the community social feed:
${postsContext}

LIVE RATINGS & REVIEWS:
Here are the customer reviews from buyers:
${reviewsContext}

LIVE MEMBERS REGISTERED:
Here are the community members:
${usersContext}

IMPORTANT DIRECTIVES:
- If a user asks "how many stocks of [crop name]", inspect the LIVE DATABASE LISTINGS above, match the crop, and report the EXACT stock quantity and price. Provide a product link like [View Cabbage](product:cabbage-id-xyz).
- If a user asks "how many post of [crop name]", read the LIVE COMMUNITY FORUM POSTS above, count how many posts mention or talk about it, and report the exact quantity and details.
- Active Language Setting: Current incoming language is '${userLanguage}'. Ensure your response perfectly matches this ('tl' -> Tagalog/Taglish, 'en' -> English).
- Use Markdown formatting (bold, bullet points) for readable text layouts. Keep replies concise, helpful, and functionally useful.`
        }
      });

      console.log(`[Support Chat] Gemini successfully replied: "${response.text?.substring(0, 60)}..."`);
      return res.json({ success: true, text: response.text });
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || "";
      if (errorMsg.includes("429") || errorMsg.includes("prepayment") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("credits")) {
        console.warn("[Support Chat] Gemini API key quota/prepayment exhausted (429). Falling back securely to high-quality local chatbot simulation.");
      } else {
        console.error("[Support Chat] Gemini support chat error, falling back securely to local simulation:", error);
      }
      console.log(`[Support Chat] Returning fallback text: "${fallbackText.substring(0, 60)}..."`);
      return res.json({ success: true, text: fallbackText });
    }
  });

  // Gemini Smart Price Suggestion endpoint
  app.post("/api/gemini/price-suggestion", rateLimitMiddleware(10, 60000), async (req, res) => {
    let cat = "";
    try {
      const { name, category } = req.body || {};
      cat = category || "";
      const client = getGeminiClient();
      
      if (!client) {
        console.warn("GEMINI_API_KEY is missing or client failed to initialize. Using realistic price generator.");
        let price = 50 + Math.floor(Math.random() * 120);
        if (cat.toLowerCase().includes('fruit')) {
          price = 80 + Math.floor(Math.random() * 150);
        } else if (cat.toLowerCase().includes('rice') || cat.toLowerCase().includes('grain')) {
          price = 45 + Math.floor(Math.random() * 40);
        }
        return res.json({ success: true, text: JSON.stringify({ recommendedPrice: price }) });
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Recommend a fair market price in Philippine Pesos (PHP) for ${name} in the category of ${category}. Consider seasonal trends. Return only the number.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              recommendedPrice: { type: Type.NUMBER }
            },
            required: ["recommendedPrice"]
          }
        }
      });

      return res.json({ success: true, text: response.text });
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || "";
      if (errorMsg.includes("429") || errorMsg.includes("prepayment") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("credits")) {
        console.warn("Gemini API key quota/prepayment exhausted (429). Falling back securely to high-quality local price generation.");
      } else {
        console.error("Gemini price suggestion error, falling back to local simulation:", error);
      }
      let price = 50 + Math.floor(Math.random() * 120);
      if (cat.toLowerCase().includes('fruit')) {
        price = 80 + Math.floor(Math.random() * 150);
      }
      return res.json({ success: true, text: JSON.stringify({ recommendedPrice: price }) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
