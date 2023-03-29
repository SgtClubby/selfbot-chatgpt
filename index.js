
const { Client } = require('discord.js-selfbot-v13');
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');
const { clearConvo, addConvo, getConvo, saveLastCrash } = require("./mongo/mongo.js");

const client = new Client({
    checkUpdate: false,
});

client.login(process.env.TOKEN);

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
})

// get conversation history from database
let convo = [];
getConvo().then(res => convo = res);



const config = new Configuration({
    apiKey: process.env.OPENAI_APIKEY
});
const openai = new OpenAIApi(config);

client.on('messageCreate', message => {

    // ignore bots
    if (message.author.bot) return;


    // prepare args
    const args = message.content.split(" ");
    if (args[0] != "?c") return;

    // remove prefix and command from args
    args.shift();

    // conversation history
    if(args[0] === "show") {
        return showConvo(convo, args[0], message);
    }

    // clear the conversation history
    if (args[0] === "clear") {
        convo = [];
        clearConvo()
        return message.channel.send("Conversation cleared.");
    }

    // create an image
    if (args[0] === "image") {
        args.shift();
        return createImage(args.join(" "), message);
    }


    // prepare prompt
    const prompt = args.join(" ");
    if (!prompt) return message.channel.send("Please provide a prompt.");

    // prepare user prompt
    const user = {
        "role": "user",
        "content": prompt
    }

    // add user prompt to conversation history
    convo.push(user);

    // send typing indicator
    message.channel.sendTyping();
    
    // send prompt to openai
    openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: convo,
    }).catch((e) => {
        saveLastCrash(e.message, convo, e)
        return message.channel.send("An error occurred: " + e.message + "\n");
    }).then(ChatGPT => {
        const ChatGPTMessage = ChatGPT?.data?.choices[0]?.message;
        if (!ChatGPTMessage) {
            saveLastCrash("No response from OpenAI", convo, ChatGPT)
            return message.channel.send("An error occurred: No response from OpenAI.");
        }
        const assistant = {
            "role": "assistant",
            "content": ChatGPTMessage.content
        }

        // if ChatGPTMessage is longer tan 1000 characters, split it into multiple messages
        if (ChatGPTMessage.content.length > 1800) {      
            const splitMessage = ChatGPTMessage.content.match(/.{1,1800}/g);
            splitMessage.forEach(msg => {
                message.channel.send(msg);
            });
        } else {
            message.channel.send(ChatGPTMessage.content);
        }
        // add assistant prompt to conversation history
        convo.push(assistant);

        // add conversation history to database
        addConvo(user)
        addConvo(assistant)

    })
});


function showConvo(conversation, arg, message) {
    let chunk = "";
    let chunkCount = 0;
    let chunkArray = [];

    if(conversation.length == 0) return message.channel.send("No conversation history.");

    chunkArray.push(` • Conversation History:: Conversation is ${conversation.length} messages long.\n`);

    conversation.forEach(msg => {
        const user = msg.role === "user" ? "You" : "ChatGPT";
        // For some reason ChatGPT messages have alot of newlines in them, so for readability, we remove them. 
        const content = msg.content.replace(/(?:\r\n|\r|\n)/g, '');
        chunk += ` • ${user}:: ${content}\n`
        if (chunk.length > 1700) {
            chunkArray.push(chunk);
            chunk = "";
            chunkCount++;
        }
    });

    chunkArray.push(chunk);
    chunkArray.forEach(chunks => {
        let quote = "```asciidoc\n";
        quote += chunks;
        quote += "```";
        message.channel.send(quote);
    });
}

function createImage(prompt, message) {
    if (!prompt) return message.channel.send("Please provide a prompt.");
    const imagePrompt = {
        "prompt": prompt,
        "n": 1,
        "size": "512x512",
        "response_format": "url",
        "user": "user"
    }

    message.channel.sendTyping();
    return openai.createImage(imagePrompt).then(res => {
        return message.channel.send(res.data.data[0].url);
    })
}