import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { MongoClient, Db } from 'mongodb'; // Import MongoClient and Db

// Hugging Face Inference API details for English Summarization
const HUGGINGFACE_ENGLISH_SUMMARIZER_URL = "https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6";
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

// --- START: JS Dictionary for Urdu Translation ---
const englishToUrduDictionary = new Map<string, string>([
    ["an", "ایک"], ["api", "اے پی آئی"], ["application", "ایپلیکیشن"], ["interface", "انٹرفیس"],
    ["allows", "اجازت دیتا ہے"], ["for", "کے لیے"], ["two", "دو"], ["or", "یا"],
    ["more", "مزید"], ["to", "کو"], ["communicate", "بات چیت کرنا"], ["with", "کے ساتھ"],
    ["one", "ایک"], ["another", "دوسرے"], ["and", "اور"], ["send", "بھیجنا"],
    ["data", "ڈیٹا"], ["back", "واپس"], ["the", "دی"], ["server", "سرور"],
    ["there", "وہاں"], ["are", "ہیں"], ["different", "مختلف"], ["styles", "انداز"],
    ["each", "هر ایک"], ["has", "رکھتا ہے"], ["its", "اس کے"], ["unique", "منفرد"],
    ["architecture", "فن تعمیر"], ["in", "میں"], ["this", "یہ"], ["article", "مضمون"],
    ["you", "آپ"], ["will", "گے"],
    // Added more common words for better (though still basic) translation
    ["learn", "سیکھیں"], ["basics", "بنیادی باتیں"], ["rest", "ریسٹ"], ["how", "کیسے"],
    ["they", "وہ"], ["work", "کام کرتے ہیں"], ["short", "مختصر"], ["from", "سے"],
    ["a", "ایک"], ["blog", "بلاگ"], ["summary", "خلاصہ"], ["of", "کا"],
    ["the", "دی"], ["is", "ہے"], ["this", "یہ"], ["example", "مثال"],
    ["text", "متن"], ["generated", "تیار کیا گیا"], ["by", "بذریعہ"], ["hugging", "ہگنگ"],
    ["face", "فیس"], ["model", "ماڈل"], ["it", "یہ"], ["is", "ہے"],
    ["a", "ایک"], ["very", "بہت"], ["basic", "بنیادی"], ["translation", "ترجمہ"],
    ["quality", "معیار"], ["will", "ہوگا"], ["be", "ہو"], ["limited", "محدود"],
    ["due", "کی وجہ سے"], ["to", "کو"], ["word", "لفظ"], ["for", "کے لیے"],
    ["word", "لفظ"], ["substitution", "متبادل"], ["no", "نہیں"], ["context", "سیاق و سباق"],
    ["understanding", "سمجھ"], ["or", "یا"], ["grammar", "قواعد"], ["rules", "قواعد"],
    ["applied", "لاگو کیا گیا"], ["here", "یہاں"], ["please", "براہ مہربانی"], ["note", "نوٹ کریں"],
    ["this", "یہ"], ["is", "ہے"], ["for", "کے لیے"], ["demonstration", "مظاہرے"],
    ["purposes", "مقاصد"], ["only", "صرف"], ["integral", "لازمی"], ["component", "جز"],
    ["modern-day", "جدید دور"], ["software", "سافٹ ویئر"], ["development", "ترقی"],
    ["operated", "چلایا جاتا ہے"], ["based", "بنیاد پر"], ["standardized", "معیاری"],
    ["set", "سیٹ"], ["rules", "قواعد"], ["each", "ہر ایک"], ["one", "ایک"],
    ["most", "سب سے زیادہ"], ["common", "عام"], ["styles", "انداز"], ["you", "آپ"],
    ["will", "گے"], ["learn", "سیکھیں"], ["basics", "بنیادی باتیں"], ["rest", "ریسٹ"],
    ["apis", "اے پی آئیز"], ["how", "کیسے"], ["they", "وہ"], ["work", "کام کرتے ہیں"],
]);

function translateEnglishToUrdu(englishText: string): string {
    const lowercasedText = englishText.toLowerCase();
    const wordsAndPunctuation = lowercasedText.split(/(\b|\W)/);

    const urduTranslationParts = [];
    for (const part of wordsAndPunctuation) {
        if (part.trim() === '') {
            urduTranslationParts.push(part);
        } else if (englishToUrduDictionary.has(part)) {
            urduTranslationParts.push(englishToUrduDictionary.get(part));
        } else {
            urduTranslationParts.push(part);
        }
    }
    return urduTranslationParts.join('');
}
// --- END: JS Dictionary for Urdu Translation ---

// --- START: Supabase Initialization ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient>;
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
    console.error("Supabase credentials are not set in .env.local. Supabase operations will be skipped.");
}
// --- END: Supabase Initialization ---

// --- START: MongoDB Initialization ---
const mongoDbUri = process.env.MONGODB_URI;
const mongoDbName = 'Blog Summarizer'; 

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null; // Changed type from 'any' to 'Db'

async function connectToMongoDB() {
    if (cachedClient && cachedDb) {
        console.log("MongoDB: Using cached connection.");
        return cachedClient;
    }
    if (!mongoDbUri) {
        console.error("MongoDB URI is not set in .env.local. MongoDB operations will be skipped.");
        return null;
    }
    try {
        console.log("MongoDB: Attempting to connect...");
        const client = new MongoClient(mongoDbUri);
        await client.connect();
        cachedClient = client;
        cachedDb = client.db(mongoDbName); // Cache the database instance too
        console.log("MongoDB: Successfully connected.");
        return client;
    } catch (error) {
        console.error("MongoDB: Failed to connect", error);
        cachedClient = null;
        cachedDb = null;
        return null;
    }
}
// --- END: MongoDB Initialization ---


export async function POST(req: Request) {
    console.log("API: Request received for /api/summarize");

    try {
        console.log("API: Hugging Face API Key status:", HUGGINGFACE_API_KEY ? "Loaded" : "NOT Loaded");
        console.log("API: Supabase URL status:", supabaseUrl ? "Loaded" : "NOT Loaded");
        console.log("API: MongoDB URI status:", mongoDbUri ? "Loaded" : "NOT Loaded");


        const { url } = await req.json();
        console.log("API: Received URL:", url);

        if (!url) {
            console.log("API: URL is missing.");
            return NextResponse.json({ error: 'URL is required.' }, { status: 400 });
        }

        // Fetch blog content
        console.log("API: Attempting to fetch content from URL:", url);
        const { data } = await axios.get(url);
        console.log("API: Successfully fetched content. Data length:", data.length);

        const $ = cheerio.load(data);

        // Basic content extraction: get text from paragraphs, headings, list items
        let articleText = '';
        $('p, h1, h2, h3, h4, h5, h6, li').each((i, el) => {
            articleText += $(el).text() + '\n';
        });
        console.log("API: Extracted article text. Length:", articleText.length);
        console.log("API: First 500 chars of extracted text:", articleText.substring(0, 500));

        // Simple check if any text was extracted
        if (!articleText.trim()) {
            console.log("API: Could not extract sufficient text.");
            return NextResponse.json({ error: 'Could not extract sufficient text from the blog. Please check the URL or try a different one.' }, { status: 400 });
        }

        // --- Hugging Face Summarization and JS Dictionary Translation Logic ---
        let englishSummary = '';
        let urduSummary = '';

        if (!HUGGINGFACE_API_KEY) {
            console.error("API Error: Hugging Face API key is not set in .env.local. Cannot proceed with AI summarization.");
            return NextResponse.json({ error: 'Hugging Face API key is not configured on the server. Please set it in .env.local.' }, { status: 500 });
        }

        try {
            // Apply a character limit to the articleText before sending to Hugging Face
            const limitedArticleText = articleText.substring(0, 1000); // Limit to first 1000 characters
            console.log("API: Limited article text length for Hugging Face summarizer:", limitedArticleText.length);

            // Request English Summary from Hugging Face
            console.log("API: Requesting English summary from Hugging Face.");
            const englishResponse = await axios.post(
                HUGGINGFACE_ENGLISH_SUMMARIZER_URL,
                { inputs: limitedArticleText, parameters: { min_length: 50, max_length: 200 } },
                { headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}` } }
            );
            englishSummary = englishResponse.data[0]?.summary_text || 'Failed to generate English summary.';
            console.log("API: English summary generated.");

            // Generate Urdu Translation using the JS Dictionary
            if (englishSummary && englishSummary !== 'Failed to generate English summary.') {
                console.log("API: Generating Urdu translation using JS Dictionary.");
                urduSummary = translateEnglishToUrdu(englishSummary);
                console.log("API: Urdu summary generated via JS Dictionary.");
            } else {
                urduSummary = 'اردو خلاصہ تیار کرنے میں ناکامی ہوئی (انگریزی خلاصہ دستیاب نہیں تھا)۔';
                console.log("API: Urdu summary placeholder generated (English summary not available for translation).");
            }

            // --- START: Save to Supabase ---
            if (supabase) { // Check if supabase client was successfully initialized
                console.log("API: Attempting to save summaries to Supabase.");
                const { data: savedData, error: supabaseError } = await supabase
                    .from('summaries') // Your table name
                    .insert([
                        { url: url, english_summary: englishSummary, urdu_summary: urduSummary }
                    ]);

                if (supabaseError) {
                    console.error('Supabase Error saving summary:', supabaseError);
                } else {
                    console.log('Summary saved to Supabase:', savedData);
                }
            } else {
                console.warn("API: Supabase not configured, skipping save operation.");
            }
            // --- END: Save to Supabase ---

            // --- START: Save full text to MongoDB ---
            const client = await connectToMongoDB();
            if (client) {
                console.log("MongoDB: Attempting to save full text.");
                // Ensure cachedDb is not null before calling .collection()
                if (cachedDb) { // Explicitly check cachedDb here
                    const collection = cachedDb.collection('full_texts'); // Collection to store full texts
                    const { insertedId } = await collection.insertOne({
                        url: url,
                        full_text: articleText,
                        timestamp: new Date()
                    });
                    console.log(`MongoDB: Full text saved with ID: ${insertedId}`);
                } else {
                    console.warn("MongoDB: cachedDb is null, skipping save operation for full text.");
                }
            } else {
                console.warn("MongoDB: Not connected, skipping save operation for full text.");
            }
            // --- END: Save full text to MongoDB ---


        } catch (hfError: unknown) {
            let hfErrorMessage = 'An unknown error occurred during Hugging Face summarization.';
            if (hfError instanceof Error) {
                hfErrorMessage = hfError.message;
            }
            if (axios.isAxiosError(hfError) && hfError.response) {
                hfErrorMessage = `Hugging Face API Error: ${hfError.response.status} - ${JSON.stringify(hfError.response.data)}`;
            }
            console.error('API Error: Hugging Face summarization failed:', hfError);
            return NextResponse.json({ error: `AI summarization failed (Hugging Face): ${hfErrorMessage || 'Check API key, rate limits, or model loading status.'}` }, { status: 500 });
        }
        // --- End Hugging Face Integration and JS Dictionary ---

        // Return the summaries as a JSON response
        return NextResponse.json({ englishSummary, urduSummary }, { status: 200 });

    } catch (err: unknown) {
        let errorMessage = 'Failed to summarize blog due to an internal server error.';
        if (err instanceof Error) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }
            console.error('API Error: Top-level error in summarize:', err);
            return NextResponse.json({ error: errorMessage }, { status: 500 });
        }
    }
