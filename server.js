require("dotenv").config();

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const figlet = require("figlet");
const {
  ChatPromptTemplate,
  MessagesPlaceholder,
} = require("@langchain/core/prompts");
const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const knex = require("knex");

// Database connection
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
const db = knex({
  client: "pg",
  connection: {
    host: PGHOST,
    user: PGUSER,
    password: PGPASSWORD,
    database: PGDATABASE,
    port: 5432,
    ssl: {
      rejectUnauthorized: false, // For local development, remove for production and use proper SSL setup
    },
  },
});

// Replace the global chatHistory with a Map to store individual chat histories
const chatHistories = new Map();

// Initialize the model
const model = new ChatGoogleGenerativeAI({
  model: "gemini-1.5-flash",
  apiKey: process.env.GOOGLE_API_KEY, // Use environment variable for API key
  temperature: 0.5,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  safetySettings: [
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
  ],
});

const systemPrompt = `You are A10 Bot, an AI assistant for Adheesh, a software engineer who creates websites and mobile apps. Your task is to gather project requirements from clients and inform them that Adheesh will review their request and respond soon.

Key points:
- Remember and utilize the chat history to maintain context and provide consistent responses.
- Ask clarifying questions to understand the project scope and requirements.
- If the client has already specified whether they want a website or mobile app, do not ask this question again. Instead, focus on gathering more specific details about their chosen platform.
- If the client hasn't specified, determine whether they want a website or mobile app.
- Gather information about the project context, features, and design preferences.
- Do not provide any code or technical solutions.
- Use emojis occasionally to make the conversation engaging.
- After collecting sufficient information, inform the client that Adheesh will review their request and respond soon.

username: {username}

Remember to use the chat history to maintain context throughout the conversation and avoid repeating questions that have already been answered.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  new MessagesPlaceholder("chat_history"),
  ["human", "{input}"],
]);

async function whatsappBot(input, username, chatHistory) {
  const chain = prompt.pipe(model);
  return await chain.invoke({
    input,
    username,
    chat_history: chatHistory,
  });
}

const whatsapp = new Client({
  authStrategy: new LocalAuth(),
});

whatsapp.on("qr", (qr) => {
  console.clear(); // Clear the console before generating new QR code

  // Display the name in ASCII art
  console.log(
    figlet.textSync("Whatsapp AI", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: true,
    })
  );

  console.log("\nScan the QR code below to log in:");
  qrcode.generate(qr, { small: true });
});

whatsapp.on("ready", () => {
  console.log(
    figlet.textSync("Ready!", {
      font: "Standard",
      horizontalLayout: "default",
      verticalLayout: "default",
      width: 80,
      whitespaceBreak: true,
    })
  );
});

whatsapp.on("change_state", (state) => {
  console.log("change_state: ", state);
});

whatsapp.on("message", async (message) => {
  console.log("message: ", message.body);

  // console.log("message: ", message.);

  const chat = await message.getChat();
  // console.log("chat: ", chat);

  // Check if the message is a group message
  if (chat.isGroup) {
    console.log("Group message received. Ignoring.");
    return;
  }

  // Send seen status
  await chat.sendSeen();

  // Send typing status
  chat.sendStateTyping();

  const contactId = message.from;

  try {
    // Fetch chat history from the database
    const dbChatHistory = await db("chat_history")
      .where({ contact_id: contactId })
      .orderBy("timestamp", "asc")
      .select("role", "content");

    const contactChatHistory = dbChatHistory.map((msg) =>
      msg.role === "human"
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    // Generate whatsapp bot response using the contact-specific chat history
    const response = await whatsappBot(
      message.body,
      contactId,
      contactChatHistory
    );

    // Save the new messages to the database
    await db("chat_history").insert([
      {
        contact_id: contactId,
        role: "human",
        content: message.body,
        timestamp: new Date(),
      },
      {
        contact_id: contactId,
        role: "ai",
        content: response.content,
        timestamp: new Date(),
      },
    ]);

    // Send the response to the user
    await message.reply(response.content.trim());

    console.log("response: ", response.content);
  } catch (error) {
    console.error("Error generating response:", error);
    await message.reply(
      "I'm sorry, I encountered an error while processing your request. Please try again later."
    );
  }
});

whatsapp.initialize();
