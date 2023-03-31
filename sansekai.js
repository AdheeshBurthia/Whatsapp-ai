const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require('@adiwajshing/baileys')
const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const { Configuration, OpenAIApi } = require("openai")
let setting = require('./accesser.json')
const BOT_NAME = process.env.BOT_NAME ?? "A10's Bot";
let isOn = true;

// Initialize a Map to store the on/off status for each customer
const customerStatus = require('./userStatus.json');

module.exports = sansekai = async (client, m, chatUpdate, store) => {

    if (m.text.includes('Smash')) {
        m.reply('Adheesh told me to play smash with you while he is not here.');
        return;
    }

    // if (m.text.includes('Janavi') || m.text.includes('janavi')) {
    //     m.reply('She is Adheesh best friend, he told me to tell you that he loves her.');
    //     return;
    // }

    if (m.text.includes('Yush') || m.text.includes('yush')) {
    m.reply('What is yush?, never heard of this animal.');
        return;
    }
    
    // Check if the message is sent by the bot or from a group, if yes, return and exit the function
    if (m.isGroup) return;

    // Get the customer's phone number
    const customerNumber = m.sender.replace('@s.whatsapp.net', '');

    // If the customer hasn't been added to the Map yet, set their status to on
    if (!customerStatus.hasOwnProperty(customerNumber)) {
        customerStatus[customerNumber] = { status: false };
        m.reply('Hello, Adheesh is currently unavailable. I am A10 Bot, I am here to help you. Would you like to chat with me or end the conversation? \n(Send Chat or End)');
    }

    // Get the customer's current status (on/off)
    const isOn = customerStatus[customerNumber].status;

    // If the customer turns off the chatbot, update their status in the Map and customerStatus.json
    if (m.text.startsWith('End') || m.text.startsWith('END')) {
        customerStatus[customerNumber].status = false;
        fs.writeFileSync('./userStatus.json', JSON.stringify(customerStatus, null, 2), 'utf-8');
        m.reply('You can leave a message if you want to talk to Adheesh later.');
        return;
    }

    // If the customer turns on the chatbot, update their status in the Map and customerStatus.json
    if (m.text.startsWith('Chat') || m.text.startsWith('CHAT')) {
        customerStatus[customerNumber].status = true;
        fs.writeFileSync('./userStatus.json', JSON.stringify(customerStatus, null, 2), 'utf-8');
        m.reply('Hello, I am A10 Bot, how can I help you?');
        return;
    }

    // If the customer's status is off or is from a group, exit the function
    if (!isOn) {
        return;
    }
    
    if (m.key.fromMe) return;

    try {
        var body = (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.mtype === 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : ''
        var budy = (typeof m.text == 'string' ? m.text : '')
        // var prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : "/"
        var prefix = /^[\\/!#.]/gi.test(body) ? body.match(/^[\\/!#.]/gi) : "/"
        const isCmd2 = body.startsWith(prefix)
        const command = body.replace(prefix, '').trim().split(/ +/).shift().toLowerCase()
        const args = body.trim().split(/ +/).slice(1)
        const pushname = m.pushName || "No Name"
        const botNumber = await client.decodeJid(client.user.id)
        const itsMe = m.sender == botNumber ? true : false
        let text = q = args.join(" ")
        const arg = budy.trim().substring(budy.indexOf(' ') + 1)
        const arg1 = arg.trim().substring(arg.indexOf(' ') + 1)

        console.log(m);

        const from = m.chat
        const reply = m.reply      
        const sender = m.sender
        const mek = chatUpdate.messages[0]

        const color = (text, color) => {
            return !color ? chalk.green(text) : chalk.keyword(color)(text)
        }

        // Group
        const groupMetadata = m.isGroup ? await client.groupMetadata(m.chat).catch(e => { }) : ''
        const groupName = m.isGroup ? groupMetadata.subject : ''   

        // Push Message To Console
        let argsLog = (budy.length > 30) ? `${q.substring(0, 30)}...` : budy

        if (setting.autoAI) {
            // Push Message To Console && Auto Read
            if (argsLog && !m.isGroup) {
                // client.sendReadReceipt(m.chat, m.sender, [m.key.id])
                console.log(chalk.black(chalk.bgWhite('[ LOGS ]')), color(argsLog, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`))
            } else if (argsLog && m.isGroup) {
                // client.sendReadReceipt(m.chat, m.sender, [m.key.id])
                console.log(chalk.black(chalk.bgWhite('[ LOGS ]')), color(argsLog, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`), chalk.blueBright('IN'), chalk.green(groupName))
            }
        } else if (!setting.autoAI) {
            if (isCmd2 && !m.isGroup) {
                console.log(chalk.black(chalk.bgWhite('[ LOGS ]')), color(argsLog, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`))
            } else if (isCmd2 && m.isGroup) {
                console.log(chalk.black(chalk.bgWhite('[ LOGS ]')), color(argsLog, 'turquoise'), chalk.magenta('From'), chalk.green(pushname), chalk.yellow(`[ ${m.sender.replace('@s.whatsapp.net', '')} ]`), chalk.blueBright('IN'), chalk.green(groupName))
            }
        }


        if (setting.autoAI) {
            if (budy) {
                try {
                    if (setting.keyopenai === 'ISI_APIKEY_OPENAI_DISINI') return reply('Apikey belum diisi\n\nSilahkan isi terlebih dahulu apikeynya di file key.json\n\nApikeynya bisa dibuat di website: https://beta.openai.com/account/api-keys')
                    const configuration = new Configuration({
                        apiKey: setting.keyopenai,
                    });
                    const openai = new OpenAIApi(configuration);

                    let prompt_template =
                        "I am AI, " +
                        BOT_NAME +
                        ", developed by Adheesh Burthia. \n\nHuman: What is the background of Adheesh?\n" +
                        BOT_NAME +
                        ", Adheesh lives in Mauritius, he was born in 29 October 2001 and is 21 years old. He has participated in competitions like digiCup, Webcup and National Leadership Engine. Adheesh is a Bsc Hons Software Engineering student at Universite Des Mascareignes. His friends and partners are Chuttoo Jayesh, Abhaiy Takah, Yutesh Mudhoo, Yateesh Persand, Teesta Monisha Ramlogun, Aisha Ilhaam Khodabacus. Adheesh has hobby like coding, football, gaming, reading. Janavi Soobhlaskmi Chummun is Adheesh best friend, he told me to tell you that he loves her. She is the love of his life. She is his soulmate. She is very beautiful and gorgeous. Adheesh wanted to marry janavi. Adheesh want to make Janavi his bride. Because he only wants to marry janavi. So he will only gets married when Janavi agree to marry him. Adheesh told me a secret that he wants to marry Janavi because he loves her a lot. Adheesh has surprise planned for janavi, He wants to proposed Janavi in a beautiful place. If Adheesh meets her one day, he will kiss her. Janavi is not bad, Adheesh told me she is the most beautiful girl in the world. The wife of Adheesh is Janavi Burthia. Adhee is the nickname given with love by Janavi. She is the only one who calls him Adhee. Adheesh loves when she calls him Adhee. He saved Janavi name as Wifey in his phone. It was always Wifey. And it will always be. \n\nHuman: Hi.\n" +
                        BOT_NAME +
                        ": Adheesh is currently unavailable, how can I help you?\nHuman: " +
                        budy +
                        "\n" +
                        BOT_NAME +
                        ": ";

                    const response = await openai.createCompletion({
                        model: "text-davinci-003",
                        prompt: prompt_template,
                        temperature: 0.9,
                        max_tokens: 3000,
                        top_p: 1,
                        frequency_penalty: 0.0,
                        presence_penalty: 0.6,
                    });
                    m.reply(`${response.data.choices[0].text}\n\n`)
                } catch (err) {
                    console.log(err)
                    m.reply('I am getting API Update right now. Please hold on anc check back in a while.')
                }
            }
        }

        if (!setting.autoAI) {
            if (isCmd2) {
                switch (command) {
                    case 'ai':
                        try {
                            if (setting.keyopenai === 'ISI_APIKEY_OPENAI_DISINI') return reply('Api key has not been filled in\n\nPlease fill in the apikey first in the key.json file\n\nThe apikey can be created in website: https://beta.openai.com/account/api-keys')
                            if (!text) return reply(`Chat dengan AI.\n\nContoh:\n${prefix}${command} Apa itu resesi`)
                            const configuration = new Configuration({
                                apiKey: setting.keyopenai,
                            });
                            const openai = new OpenAIApi(configuration);

                            const response = await openai.createCompletion({
                                model: "text-davinci-003",
                                prompt: text,
                                temperature: 0.3,
                                max_tokens: 3000,
                                top_p: 1.0,
                                frequency_penalty: 0.0,
                                presence_penalty: 0.0,
                            });
                            m.reply(`${response.data.choices[0].text}\n\n`)
                        } catch (err) {
                            console.log(err)
                            m.reply('Maaf, sepertinya ada yang error')
                        }
                        break
                    default: {

                        if (isCmd2 && budy.toLowerCase() != undefined) {
                            if (m.chat.endsWith('broadcast')) return
                            if (m.isBaileys) return
                            if (!(budy.toLowerCase())) return
                            if (argsLog || isCmd2 && !m.isGroup) {
                                // client.sendReadReceipt(m.chat, m.sender, [m.key.id])
                                console.log(chalk.black(chalk.bgRed('[ ERROR ]')), color('command', 'turquoise'), color(argsLog, 'turquoise'), color('tidak tersedia', 'turquoise'))
                            } else if (argsLog || isCmd2 && m.isGroup) {
                                // client.sendReadReceipt(m.chat, m.sender, [m.key.id])
                                console.log(chalk.black(chalk.bgRed('[ ERROR ]')), color('command', 'turquoise'), color(argsLog, 'turquoise'), color('tidak tersedia', 'turquoise'))
                            }
                        }
                    }
                }
            }
        }

    } catch (err) {
        m.reply(util.format(err))
    }
}

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})
