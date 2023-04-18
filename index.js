
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
        try {
            const number = parseInt(args[1]);
            if (typeof number === "number" && !isNaN(number)) {
                if (number > 10) return message.channel.send("Please provide a number between 1 and 10.");
                args.shift();
                args.shift();
                return createImage(args.join(" "), message, number);
            } else {
                args.shift();
                return createImage(args.join(" "), message);
            }
        } catch (e) {
            console.error(e);
        }
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

function createImage(prompt, message, number = 1) {
    if (!prompt) return message.channel.send("Please provide a prompt.");
    const imagePrompt = {
        "prompt": prompt,
        "n": number,
        "size": "512x512",
        "response_format": "url",
    }

    message.channel.sendTyping();
    return openai.createImage(imagePrompt).then(res => {
        if (res.data.data.length > 1) {
            res.data.data.forEach(image => {
                let filename = extractImgID(image.url);

                if (filename === null) filename = new Date().getTime() + ".png";

                download(image.url, filename, function(){
                    return message.channel.send(`https://cdn.metrix.pw/chatgpt/${filename}`);
                });
            });
            return;
        }
        const filename = extractImgID(res.data.data[0].url);

        download(res.data.data[0].url, filename, function(){
            return message.channel.send(`https://cdn.metrix.pw/chatgpt/${filename}`);
        });
    })
}

const  fs = require('fs');
const request = require('request');

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(`/home/ftpuser/chatgpt/${filename}`)).on('close', callback);
  });
};

function extractImgID(string) {
    const regex = /\/([\w-]+\.png)\?/
    const found = string.match(regex);

    if (found) {
        return found[1];
    }
    
    return null;
}