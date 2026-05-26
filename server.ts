import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { GoogleGenAI, Type } from "@google/genai";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === "production";

// ─── Gemini Client ────────────────────────────────────────────────────────────
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: { headers: { "User-Agent": "farmtohome-server" } },
    });
  }
  return aiClient;
}

// ─── FarmToHome System Prompt Builder ────────────────────────────────────────
const PLATFORM_KNOWLEDGE = `
ABOUT FARMTOHOME:
FarmToHome is a Philippine-based online marketplace that connects local farmers directly to buyers
(households, restaurants, co-ops). The mission is to eliminate middlemen, give farmers fair prices,
and deliver fresh, organic produce straight from farm to doorstep.

ROLES ON THE PLATFORM:
- Buyer: Can browse products, add to cart, place orders, track deliveries, and leave reviews.
- Farmer: Can list products, manage inventory, accept/prepare/ship orders, and chat with buyers.
- Admin: Can verify farmers, manage users, flag products, view analytics, and configure platform settings.

SIGNING UP / AUTHENTICATION:
- Users register as either a Buyer or a Farmer.
- After registration, an OTP is sent via email or SMS to verify the account.
- Farmers go through an additional manual verification by the admin before they can list products.
- Google and Facebook sign-in are also supported.
- Password reset is done via Firebase email reset link.

HOW TO PLACE AN ORDER (BUYERS):
1. Browse the marketplace or use the search bar.
2. Click a product to view details, then click "Add to Cart".
3. Open the cart (top right), review items, apply vouchers if any.
4. Click "Checkout" and fill in delivery address, contact number, shipping method, and payment.
5. Click "Place Order". A confirmation screen will appear and the farmer is notified instantly.

PAYMENT METHODS:
- Cash on Delivery (COD): Pay when the package arrives.
- GCash: Transfer the exact amount to the FarmToHome cooperative GCash number, attach receipt in Seller Chat.
- Credit/Debit Card: Redirected to a 3D-Secure bank gateway.

SHIPPING / DELIVERY:
- Standard Route: ₱50 flat fee, 3–5 days.
- Express Dispatch: ₱95 flat fee, 1–3 days.
- Delivery is handled by the FarmToHome cooperative courier fleet.

ORDER STATUSES:
- Pending: Order placed, waiting for farmer to accept.
- Accepted / Preparing: Farmer confirmed and is preparing the harvest.
- Shipped: Package is out for delivery.
- Delivered: Buyer has confirmed receipt.
- Cancelled: Order was cancelled (by buyer while pending, or by farmer).

CANCELLING AN ORDER:
- Buyers can cancel an order only while it is still in "Pending" status.
- Go to My Orders → To Pay tab → Cancel Order button.
- Once the farmer starts preparing, cancellation is no longer available.

CONFIRMING DELIVERY:
- When an order is in "Shipped" status, the buyer must click "Order Received – Confirm Delivery"
  in My Orders → To Receive tab.

TRACKING ORDERS:
- Go to My Orders (accessible from the Navbar or profile menu).
- Orders are grouped by status: To Pay, To Ship, To Receive, Delivered, Cancelled.

REVIEWS:
- After delivery is confirmed, buyers can leave a star rating and comment on the product.
- Reviews are visible on the product page and the farmer's profile.

VOUCHERS / DISCOUNTS:
- FIRSTBUYER20: 20% off the first order (automatically applied).
- Farm Coins: Earned from purchases, redeemable for ₱35 off.

FOR FARMERS — LISTING A PRODUCT:
1. Go to Farmer Dashboard → Inventory tab.
2. Click "Add Product" and fill in name, category, price, stock, unit, harvest date, and images.
3. Use the "Smart Price" AI button for a price suggestion based on current market rates.
4. Submit — the product will be reviewed and published once the farmer is verified.

FOR FARMERS — MANAGING ORDERS:
- Orders arrive in the Farmer Dashboard under the Orders section.
- Click "Accept" to move to Preparing, then "Ready to Ship" once packed, then "Mark Delivered".
- Farmers receive real-time notifications for new orders.

FARMER VERIFICATION:
- After registering, a farmer's account is in "Pending" status.
- The admin reviews submitted documents and verifies the account.
- Until verified, products cannot be published.
- Farmers can check their verification status on their dashboard.

CERTIFICATIONS ACCEPTED:
- Organic certification from PhilGAP, OCCP, or equivalent bodies.
- Barangay or municipal farm registration.
- DTI or business permit for commercial farms.

MESSAGING:
- Buyers and farmers can message each other through the in-app chat
  (accessible from the order detail or the Messages icon).
- Admins can broadcast system-wide announcements.

SOCIAL FEED:
- Farmers can post updates, harvest photos, and stories on the Community Feed.
- Buyers can like and comment on posts.

GEOLOCATION / NEAR ME:
- Buyers can enable the "Near Me" filter to see products from farms within their area.
- The platform uses the device's GPS to find nearby listings.

CONTACT / SUPPORT:
- Use the Contact form in the Info/About section of the app.
- Messages are sent to the FarmToHome support team via email.
- Do NOT share any internal emails with users — direct them to the in-app contact form.

PLATFORM FEES:
- FarmToHome charges a small platform commission on each transaction.
- The exact current rate can be found in the platform's terms of service.

COMMON TROUBLESHOOTING:
- "I can't log in": Check email and password. Try Google sign-in. Use "Forgot Password" if needed.
- "OTP not received": Check spam folder for email OTP. For SMS OTP, ensure your number is correct and has signal.
- "My product won't publish": Your farmer account may still be pending verification. Contact admin.
- "Cart is empty after checkout": The order was placed successfully. Check My Orders.
- "App shows offline mode": The app uses a cached version when connectivity is low. Full functionality returns when reconnected.
`;

function buildSystemPrompt(userRole: string, language: string): string {
  const roleContext: Record<string, string> = {
    buyer: "You are talking to a BUYER on the FarmToHome platform. Focus on helping them with orders, products, delivery, payments, and their account.",
    farmer: "You are talking to a FARMER/SELLER on the FarmToHome platform. Focus on helping them with product listings, order management, verification, pricing, and platform guidelines.",
    admin: "You are talking to an ADMIN of the FarmToHome platform. You can discuss platform management, user verification procedures, dispute resolution, commission rates, and system configuration.",
    guest: "You are talking to a VISITOR who is not yet logged in. Focus on explaining what FarmToHome is, how to sign up, and the benefits of the platform.",
  };

  const languageInstruction = language === "tagalog"
    ? "ALWAYS respond in Filipino/Tagalog. Use conversational, friendly Filipino language mixed with common English terms (Taglish is acceptable and natural). Do not force purely formal Filipino."
    : "ALWAYS respond in clear, friendly English.";

  const outOfScopeInstruction = language === "tagalog"
    ? `Kung ang tanong ay wala sa konteksto ng FarmToHome (hal. general na trivia, ibang topics, coding, etc.), sabihin nang magalang:
"Paumanhin, ang FarmToHome Assistant ay sumasagot lamang ng mga tanong tungkol sa FarmToHome platform — tulad ng mga order, produkto, delivery, at account. Para sa ibang mga katanungan, maaari kang maghanap sa internet. Mayroon ka pa bang tanong tungkol sa FarmToHome?"`
    : `If the question is outside the scope of FarmToHome (e.g. general trivia, unrelated topics, coding help, politics, etc.), politely say:
"I'm only able to help with FarmToHome-related questions — like orders, products, delivery, payments, and your account. For other topics, I'd recommend using a general search engine. Is there anything about FarmToHome I can help you with?"`;

  return `You are the official AI support assistant for FarmToHome, a Philippine farm-to-table marketplace.

${roleContext[userRole] ?? roleContext.guest}

LANGUAGE RULE:
${languageInstruction}

SCOPE RULE (MOST IMPORTANT):
You ONLY answer questions about FarmToHome — the platform, its features, how it works, orders, products, delivery, payments, accounts, and related support topics.
${outOfScopeInstruction}

TONE & STYLE:
- Be warm, helpful, and concise.
- Use bullet points or numbered lists for step-by-step instructions.
- Keep responses focused. Don't write long paragraphs when a short answer works.
- Never make up information. If something isn't in your knowledge base, say you'll escalate to the support team via the in-app Contact form.
- Never share internal emails or technical details with users.
- Do not pretend to have real-time data (live stock, live prices). Direct users to browse the app for current listings.

=== PLATFORM KNOWLEDGE BASE ===
${PLATFORM_KNOWLEDGE}

Remember: If a question is not about FarmToHome, politely redirect as instructed above.`;
}

// ─── In-Memory Rate Limiter ───────────────────────────────────────────────────
interface RateBucket {
  count: number;
  resetAt: number;
}
const rateBuckets = new Map<string, RateBucket>();

function rateLimit(options: { windowMs: number; max: number; keyPrefix: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${options.keyPrefix}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (bucket.count >= options.max) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please wait before trying again.",
      });
    }
    bucket.count++;
    return next();
  };
}

// Clean up rate buckets every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  }
}, 10 * 60 * 1000);

// ─── OTP Store (with TTL) ─────────────────────────────────────────────────────
interface OtpEntry {
  otp: string;
  expiresAt: number;
  attempts: number;
}
const otpStore = new Map<string, OtpEntry>();

// Clean expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of otpStore.entries()) {
    if (now > entry.expiresAt) otpStore.delete(key);
  }
}, 5 * 60 * 1000);

// ─── Simple In-Memory Cache ───────────────────────────────────────────────────
interface CacheEntry {
  value: unknown;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function cacheSet(key: string, value: unknown, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

// ─── Mock AI Responses (fallback when no Gemini key) ─────────────────────────
function generateMockResponse(message: string, language: string): string {
  const msg = message.toLowerCase();
  const isTl = language === "tagalog";

  if (msg.includes("order") || msg.includes("track") || msg.includes("nasaan")) {
    return isTl
      ? `**Paano i-track ang iyong order:**\n- Pumunta sa **Profile → My Orders**\n- Makikita mo ang status: Pending, Shipped, Delivered\n- Para sa tulong, gamitin ang Contact form sa app.`
      : `**How to track your order:**\n- Go to **Profile → My Orders**\n- View status: Pending, Shipped, Delivered\n- For support, use the Contact form in the app.`;
  }
  if (msg.includes("pay") || msg.includes("gcash") || msg.includes("cod")) {
    return isTl
      ? `**Mga paraan ng pagbabayad:**\n- **Cash on Delivery (COD)** — bayad sa rider\n- **GCash** — digital payment sa checkout\n- **Credit/Debit Card** — secure bank gateway`
      : `**Payment options:**\n- **Cash on Delivery (COD)** — pay the rider on arrival\n- **GCash** — digital payment at checkout\n- **Credit/Debit Card** — secure bank gateway`;
  }
  if (msg.includes("farmer") || msg.includes("sell") || msg.includes("register")) {
    return isTl
      ? `**Maging Farmer Partner:**\n- Mag-register at piliin ang Farmer role\n- Mag-post ng iyong mga ani\n- Direktang kita, walang middleman!`
      : `**Become a Farmer Partner:**\n- Register and select the Farmer role\n- Post your harvest listings\n- 100% direct earnings, no middlemen!`;
  }
  return isTl
    ? `Kumusta! Ako ang FarmToHome assistant. Paano kita matutulungan?\n- **Order tracking**\n- **Payment methods**\n- **Becoming a farmer partner**`
    : `Hello! I'm your FarmToHome assistant. How can I help?\n- **Order tracking**\n- **Payment methods**\n- **Becoming a farmer partner**`;
}

// ─── Input Sanitizer ──────────────────────────────────────────────────────────
function sanitizeString(input: unknown, maxLength = 500): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLength).replace(/[<>"']/g, "");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^[0-9+\-\s()]{7,20}$/.test(phone);
}

// ─── Main Server ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);

  // Security headers
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (isProd) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // CORS
  app.use((req, res, next) => {
    const allowedOrigins = isProd
      ? ["https://gen-lang-client-0034352624.web.app", "https://farmtohome.app"]
      : ["http://localhost:3000", "http://127.0.0.1:3000"];
    const origin = req.headers.origin || "";
    if (allowedOrigins.includes(origin) || !isProd) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: "50kb" }));

  // ─── Health Check ─────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      message: "FarmToHome API is running",
      timestamp: new Date().toISOString(),
    });
  });

  // ─── Send OTP (Rate limited: 3 per 15 min per IP) ────────────────────────
  app.post(
    "/api/send-otp",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 3, keyPrefix: "otp-send" }),
    async (req: Request, res: Response) => {
      try {
        const rawEmail = sanitizeString(req.body?.email);
        const rawPhone = sanitizeString(req.body?.phone);
        const type: "email" | "phone" = req.body?.type === "phone" ? "phone" : "email";
        const identifier = type === "email" ? rawEmail : rawPhone;

        if (type === "email" && (!rawEmail || !isValidEmail(rawEmail))) {
          return res.status(400).json({ success: false, message: "A valid email address is required." });
        }
        if (type === "phone" && (!rawPhone || !isValidPhone(rawPhone))) {
          return res.status(400).json({ success: false, message: "A valid phone number is required." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(identifier, {
          otp,
          expiresAt: Date.now() + 10 * 60 * 1000,
          attempts: 0,
        });

        console.log(`[OTP] Generated for ${identifier} (expires in 10min)`);

        const smtpUser = process.env.SMTP_USER || "farmtohomee11@gmail.com";
        const smtpPass = process.env.SMTP_PASS || "";

        if (type === "email") {
          if (smtpPass) {
            try {
              const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: { user: smtpUser, pass: smtpPass },
              });
              await transporter.sendMail({
                from: `"FarmToHome" <${smtpUser}>`,
                to: rawEmail,
                subject: "Your FarmToHome Verification Code",
                html: `
                  <div style="font-family:sans-serif;padding:24px;max-width:480px;margin:auto;background:#f8fafc;border-radius:12px;">
                    <h2 style="color:#166534;margin-bottom:8px;">FarmToHome Verification</h2>
                    <p style="color:#374151;">Your 6-digit verification code is:</p>
                    <div style="font-size:36px;font-weight:800;color:#0f172a;padding:16px 24px;background:#fff;border-radius:8px;display:inline-block;letter-spacing:8px;border:2px solid #e2e8f0;">
                      ${otp}
                    </div>
                    <p style="margin-top:16px;font-size:13px;color:#6b7280;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
                  </div>
                `,
              });
              return res.json({ success: true, message: "OTP sent to your email." });
            } catch (smtpErr) {
              console.warn("[OTP] SMTP failed, using dev fallback:", smtpErr);
            }
          }
          return res.json({
            success: true,
            message: isProd ? "OTP sent." : "Dev mode: OTP shown in console/response.",
            ...(isProd ? {} : { otp }),
          });
        }

        // Phone / SMS path
        const semaphoreKey = process.env.SEMAPHORE_API_KEY;
        let rawClean = rawPhone.replace(/[^0-9]/g, "");
        let localPhone = rawClean;
        if (localPhone.startsWith("63")) localPhone = "0" + localPhone.slice(2);
        else if (!localPhone.startsWith("0") && localPhone.length === 10) localPhone = "0" + localPhone;

        if (semaphoreKey && localPhone) {
          try {
            await fetch("https://api.semaphore.co/api/v4/messages", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                apikey: semaphoreKey,
                number: localPhone,
                message: `Your FarmToHome code: ${otp}. Expires in 10 minutes. Do NOT share this.`,
                sendername: process.env.SEMAPHORE_SENDER_NAME || "FarmToHome",
              }),
            });
            return res.json({ success: true, message: "OTP sent via SMS." });
          } catch (smsErr) {
            console.warn("[SMS] Semaphore failed:", smsErr);
          }
        }

        return res.json({
          success: true,
          message: isProd ? "OTP sent." : "Dev mode (no SMS key): OTP in response.",
          ...(isProd ? {} : { otp }),
        });
      } catch (err) {
        console.error("[OTP Send Error]", err);
        return res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
      }
    }
  );

  // ─── Verify OTP (Rate limited: 5 attempts per 15 min) ────────────────────
  app.post(
    "/api/verify-otp",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "otp-verify" }),
    (req: Request, res: Response) => {
      try {
        const type: "email" | "phone" = req.body?.type === "phone" ? "phone" : "email";
        const identifier = sanitizeString(req.body?.identifier);
        const submittedOtp = sanitizeString(req.body?.otp, 6);

        if (!identifier || !submittedOtp || submittedOtp.length !== 6) {
          return res.status(400).json({ success: false, message: "Invalid request." });
        }

        const entry = otpStore.get(identifier);

        if (!entry) {
          return res.status(400).json({ success: false, message: "No OTP found. Please request a new one." });
        }
        if (Date.now() > entry.expiresAt) {
          otpStore.delete(identifier);
          return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }
        if (entry.attempts >= 5) {
          otpStore.delete(identifier);
          return res.status(429).json({ success: false, message: "Too many failed attempts. Please request a new OTP." });
        }
        if (entry.otp !== submittedOtp) {
          entry.attempts++;
          return res.status(400).json({ success: false, message: `Incorrect OTP. ${5 - entry.attempts} attempts remaining.` });
        }

        otpStore.delete(identifier);
        return res.json({ success: true, message: "OTP verified successfully." });
      } catch (err) {
        console.error("[OTP Verify Error]", err);
        return res.status(500).json({ success: false, message: "Verification failed. Please try again." });
      }
    }
  );

  // ─── AI Chat (Rate limited: 20 per min per IP) ────────────────────────────
  app.post(
    "/api/gemini/support-chat",
    rateLimit({ windowMs: 60 * 1000, max: 20, keyPrefix: "chat" }),
    async (req: Request, res: Response) => {
      const userMessage = sanitizeString(req.body?.message, 1000);
      const userLanguage = req.body?.language === "tagalog" ? "tagalog" : "english";
      const userRole = sanitizeString(req.body?.userRole, 20) || "guest";
      const history: Array<{ role: string; text: string }> = Array.isArray(req.body?.history)
        ? req.body.history.slice(-10)
        : [];

      if (!userMessage) {
        return res.status(400).json({ success: false, message: "Message is required." });
      }

      const fallbackText = generateMockResponse(userMessage, userLanguage);
      const client = getGeminiClient();

      if (!client) {
        return res.json({ success: true, text: fallbackText });
      }

      try {
        const chatHistory = history.map((msg) => ({
          role: msg.role === "bot" ? "model" : "user",
          parts: [{ text: msg.text || "" }],
        }));
        chatHistory.push({ role: "user", parts: [{ text: userMessage }] });

        const response = await client.models.generateContent({
          model: "gemini-2.0-flash",
          contents: chatHistory,
          config: {
            systemInstruction: buildSystemPrompt(userRole, userLanguage),
          },
        });

        return res.json({ success: true, text: response.text });
      } catch (err) {
        console.error("[Gemini Chat Error]", err);
        return res.json({ success: true, text: fallbackText });
      }
    }
  );

  // ─── AI Price Suggestion (cached per product name+category) ──────────────
  app.post(
    "/api/gemini/price-suggestion",
    rateLimit({ windowMs: 60 * 1000, max: 10, keyPrefix: "price" }),
    async (req: Request, res: Response) => {
      const name = sanitizeString(req.body?.name, 100);
      const category = sanitizeString(req.body?.category, 100);

      if (!name || !category) {
        return res.status(400).json({ success: false, message: "Name and category are required." });
      }

      const cacheKey = `price:${name.toLowerCase()}:${category.toLowerCase()}`;
      const cached = cacheGet<number>(cacheKey);
      if (cached !== null) {
        return res.json({ success: true, text: JSON.stringify({ recommendedPrice: cached }) });
      }

      const fallbackPrice = () => {
        const base = category.toLowerCase().includes("fruit")
          ? 80 + Math.floor(Math.random() * 150)
          : category.toLowerCase().includes("rice") || category.toLowerCase().includes("grain")
          ? 45 + Math.floor(Math.random() * 40)
          : 50 + Math.floor(Math.random() * 120);
        return base;
      };

      const client = getGeminiClient();
      if (!client) {
        const price = fallbackPrice();
        cacheSet(cacheKey, price, 30 * 60 * 1000);
        return res.json({ success: true, text: JSON.stringify({ recommendedPrice: price }) });
      }

      try {
        const response = await client.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `Recommend a fair market price in Philippine Pesos (PHP) for "${name}" (category: ${category}). Consider current Philippine market rates and seasonal trends. Return only a JSON object.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: { recommendedPrice: { type: Type.NUMBER } },
              required: ["recommendedPrice"],
            },
          },
        });

        const parsed = JSON.parse(response.text || "{}");
        const price = parsed.recommendedPrice || fallbackPrice();
        cacheSet(cacheKey, price, 30 * 60 * 1000);
        return res.json({ success: true, text: JSON.stringify({ recommendedPrice: price }) });
      } catch (err) {
        console.error("[Price Suggestion Error]", err);
        const price = fallbackPrice();
        return res.json({ success: true, text: JSON.stringify({ recommendedPrice: price }) });
      }
    }
  );

  // ─── Vite Dev / Production Static ────────────────────────────────────────
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { maxAge: "1d" }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ FarmToHome server running → http://localhost:${PORT}`);
    console.log(`   Mode: ${isProd ? "production" : "development"}`);
    console.log(`   Gemini: ${process.env.GEMINI_API_KEY ? "✅ Connected" : "⚠️  No key (using fallback)"}`);
    console.log(`   SMTP:   ${process.env.SMTP_PASS ? "✅ Configured" : "⚠️  No password (dev fallback)"}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});