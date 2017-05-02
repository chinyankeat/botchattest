////////////////////////////////////////////////////////////
// Start: To setup the script, Install these packages
// 
// npm install --save botbuilder 
// npm install --save node-rest-client
// npm install --save mathjs
//
////////////////////////////////////////////////////////////

var builder = require('botbuilder');
var RestClient = require('node-rest-client').Client;
var restclient = new RestClient();
var math = require('mathjs');
var request = require("request");
var emoji = require('node-emoji');

// Get secrets from server environment
var botConnectorOptions = { 
    appId: process.env.BOTFRAMEWORK_APPID, 
    appPassword: process.env.BOTFRAMEWORK_APPSECRET
};

// Session Data
var LastMenu = 'LastMenu';
var NumOfFeedback = 'NumOfFeedback';
var DialogId = 'DialogId';
var DialogState = 'DialogState';
var imagedir = 'https://yellowchat.azurewebsites.net';

// Create bot
var connector = new builder.ChatConnector(botConnectorOptions);
var bot = new builder.UniversalBot(connector, [

    function (session) {
        session.beginDialog('menu');
    },

    function (session, results) {
        session.endConversation("Please type Menu");
    }
]);


// Validators
bot.library(require('./validators').createLibrary());

////////////////////////////////////////////////////////////////////////////
// Global Variables
var MaxRetries = 2; 
var DefaultErrorPrompt = "Oops, I didn't get that. Click on any of the below for further information."



// Send welcome when conversation with bot is started, by initiating the root dialog
bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                console.log("idenetity Added " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
                bot.beginDialog(message.address, 'intro');
            }
        });
    }
    if (message.membersRemoved){
        console.log("idenetity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        message.membersRemoved.forEach(function (identity) {
            console.log("idenetity Removed " + identity.id + " Message " + message.address.bot.id + " " + message.address.conversation.id);
        });
    }
});

// Wrapper function for logging
function trackBotEvent(session, description, dialog_state, storeLastMenu) {
    // log session.message.address to identify user 
    //var address = JSON.stringify(session.message.address); session.send("User Address=" + address);
    //
    // Result & Sample Data
    //---------------------
    // Sample Data - Conversation 1 - Dialog 1
    //{“id”:”c57nfne1mh9b3leggc”,”channelId”:”emulator”,
    //”user”:{“id”:”default-user”,”name”:”User”},
    //”conversation”:{“id”:”meckjg4870nch9ebf”},
    //”bot”:{“id”:”default-bot”,”name”:”Bot”},
    //”serviceUrl”:”http://localhost:59711","useAuth":false}
    //
    // Sample Data - Conversation 1 - Dialog 2
    //{“id”:”90fea2l3k140jid8f”,”channelId”:”emulator”, // message.id is different for different dialog. 
    //”user”:{“id”:”default-user”,”name”:”User”},
    //”conversation”:{“id”:”meckjg4870nch9ebf”},        // Conversation.id is same for same conversation
    //”bot”:{“id”:”default-bot”,”name”:”Bot”},
    //”serviceUrl”:”http://localhost:59711","useAuth":false}    

    if(storeLastMenu==undefined) {
        session.privateConversationData[LastMenu] = description;
    }
// Logging to Database
//{"command": "update_chat_log",
//"auth_key": "a6hea2",
//"chat_id": "abcde12345",
//"dialog_id":"ateer",
//"dialog_state":"1",   1:mid/end conversation,  0:start conversation
//"dialog_type":"text", "Email" / "Phone Num" / etc
//"dialog_input":"",    "
//"chat_log": "menu|prepaid"}
    
    // @*)(*!)@(*#!@ ) why get local date also need 3 lines of text !)(@*#)(!@*#)()
//    var d = new Date();
//    var offset = (new Date().getTimezoneOffset() / 60) * -1;
//    var nowtime = new Date(d.getTime() + offset).toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    var options = {
        method: 'POST',
        url: 'https://digibid.azurewebsites.net/action.ashx',
        qs: {       action: 'json' },
        headers: {  'content-type': 'multipart/form-data'   },
        formData: { 
            data: '{\
"command": "update_chat_log",\
"auth_key": "a6hea2",\
"chat_id": "'+session.message.address.conversation.id+'",\
"dialog_id": "'+session.privateConversationData[DialogId]+'",\
"dialog_state":"' + dialog_state + '",\
"dialog_type":"",\
"dialog_input":"",\
"chat_log": "'+session.privateConversationData[LastMenu]+'"}'
        }   
    };
    console.log("Logging : " + options.formData.data);
    try{
        request(options, function (error, response, body) {
//            console.log("test test " + body);
        })
    } catch (e) {
//        console.log("cannot log");
    }
}

const logUserConversation = (event) => { console.log('message: ' + event.text + ', user: ' + event.address.user.name);
};
// Middleware for logging
bot.use({
    receive: function (event, next) {
        logUserConversation(event);
        next();
//    },
//    send: function (event, next) {
//        logUserConversation(event);
//        next();
    }
});

// R - menu
bot.dialog('intro', [
    function (session) {
        // Initialize Session Data
        session.privateConversationData[NumOfFeedback] = 0;
        trackBotEvent(session, 'intro', 0);

        session.send("Hello, I'm your friendly Digi Virtual Assistant and I'll be available from 9pm-12am");
        
        var msg = new builder.Message(session)
            .addAttachment({
                contentUrl: imagedir + '/images/digi-telecommunications.png',
                contentType: 'image/png',
                name: 'BotFrameworkOverview.png'
            });
        session.send(msg);
        
        session.replaceDialog('menu');
    }
]);

// R - menu
bot.dialog('menu', [
    function (session) {
        
        if(session.privateConversationData[NumOfFeedback]>2)    // Get Feedback every 2nd transaction
        {
            session.privateConversationData[NumOfFeedback] = 0;
            session.replaceDialog('getFeedback');
        } else {
            session.privateConversationData[NumOfFeedback]++;
            session.replaceDialog('menu2');            
        }
    }
]).triggerAction({
    matches: /^(menu)|(exit)|(quit)|(depart)|(bye)|(goodbye)|(begin)/i
});

bot.dialog('Feedback', [
    function (session) {
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Feedback Form (Internal Testing use only)')
                .subtitle('Thanks for your participation. We would appreciate your feedback')
                .buttons([
                    builder.CardAction.openUrl(session, 'https://goo.gl/forms/giIkIYVHLxL8l2ob2', 'My Feedback')
                ])
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Feedback)/i
});


// R - menu
bot.dialog('menu2', [
    function (session) {
        trackBotEvent(session, 'menu', 0);
        
        // Store new unique ID for this conversation's Dialog
        session.privateConversationData[DialogId] = session.message.address.id;

        builder.Prompts.choice(session, "To get started, these are the things I can help you with. Just click on any of the below and let's get started.", 'Prepaid|Postpaid|Broadband|Roaming|Commonly Asked Question', { listStyle:builder.ListStyle.button, maxRetries:MaxRetries, retryPrompt:DefaultErrorPrompt});
    },
    function (session, results) {
        try {
            switch (results.response.index) {
                case 0:     // Prepaid
                    session.beginDialog('Prepaid');
                    break;
                case 1:     // Postpaid
                    session.beginDialog('Postpaid');
                    break;
                case 2:     // Broadband
                    session.beginDialog('Broadband');
                    break;
                case 3:     // Roaming
                    session.beginDialog('Roaming');
                    break;
                case 4:
                    session.beginDialog('CommonlyAskedQuestion');
                    break;
                default:
                    break;
            }
        } catch (e) {
            // After max retries, will come here
            session.send("Ops I messed up, let's start over again");
            session.replaceDialog('menu2');
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu2');
    }
]);


// R.0 - menu|Prepaid
bot.dialog('Prepaid', [
    function (session) {
        trackBotEvent(session, 'menu|Prepaid',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Malaysia\'s Best Prepaid Packs')
                .subtitle('Prepaid Plans\n')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Plans.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Prepaid Plans", "More"),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Add On')
                .subtitle('Stay Connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Addons.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-addons', 'More'),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                        
                new builder.HeroCard(session)
                .title('Reload')
                .subtitle('Top-up your credit now!')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Reload.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/reload-details.ep', 'More'),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])

            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Prepaid)/i
});

// R.0.0 - menu|Prepaid|PrepaidPlans
bot.dialog('PrepaidPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Prepaid|PrepaidPlans',1);

        session.send("Here are our plans");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Prepaid Live')
                .subtitle('Ultimate Video + Music Pack')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Live.png') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&orderType=NL&_ga=1.167919842.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid/live', 'More Info'),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),
                new builder.HeroCard(session)
                .title('Digi Prepaid Best')
                .subtitle('Unlimited Social Internet Pack')
                .images([ builder.CardImage.create(session, imagedir + '/images/Prepaid-Best.png') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20015&isBundle=n&ppymttype=PREPAID&ptype=VOICE&orderType=NL&_ga=1.94994527.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'More Info'),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Prepaid Plans)/i
});


// R.1 - menu|Postpaid
bot.dialog('Postpaid', [
    function (session) {
        trackBotEvent(session, 'menu|Postpaid',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Postpaid')
                .subtitle('The plans for you')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Plans.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Postpaid Plans", "More"),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ]),

                new builder.HeroCard(session)
                .title('Extras')
                .subtitle('All the extras you need to stay connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Extra.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/postpaid-addons', 'More'),
//                    builder.CardAction.imBack(session, "Menu", "Main Menu")
                ])
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Postpaid)/i
});

// R.1.0 - menu|Postpaid|PostpaidPlans
bot.dialog('PostpaidPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Postpaid|PostpaidPlans',1);

        session.send("Here are our plans");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Postpaid 150 Infinite')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-Infinite.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=DGI150&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.164776316.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=DGI150&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.164776316.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=DGI150&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP&_ga=1.238199557.426176229.1488446290', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%20150%20Infinite', 'Change from Postpaid')
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 50')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-50.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.239507461.769883286.1492574194', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.155287800.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10201VPA&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&_ga=1.64925487.1200425632.1479720347Postpaid&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%2050', 'Change from Postpaid')
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 80')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-80.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.65621101.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.92479582.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10200VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%2080', 'Change from Postpaid')
                ]),
                new builder.HeroCard(session)
                .title('Digi Postpaid 110')
                .images([ builder.CardImage.create(session, imagedir + '/images/Postpaid-110.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=NL&_ga=1.92479582.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=MNP&_ga=1.94988767.2103412470.1490767162', 'Port In'),
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=10202VP_EX&isBundle=y&ppymttype=POSTPAID&ptype=VOICE&orderType=COP', 'Change from Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/change-of-mobile-plans?changePlanName=Digi%20Postpaid%20110', 'Change from Postpaid')
                ])
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Postpaid Plans)/i
});


// R.2 - menu|Broadband
bot.dialog('Broadband', [
    function (session) {
        trackBotEvent(session, 'menu|Broadband',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Broadband')
                .text('Non stop entertainment. \nNow at home')
                .buttons([
                    builder.CardAction.imBack(session, "Broadband Plans", "More"),
                ]),
                new builder.HeroCard(session)
                .title('Running out of quota? ')
                .text('Boost your nonstop entertainment with Internet Top Up')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://digi.my/mybb', 'More')
                ])
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Broadband)/i
});

// R.1.0 - menu|Broadband|BroadbandPlans
bot.dialog('BroadbandPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Broadband|BroadbandPlans',1);

        session.send("Here are our plans");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Broadband 30')
                .subtitle('For prepaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-30.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20017&isBundle=n&ppymttype=PREPAID&ptype=BB&_ga=1.55846120.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info')
                ]),
                new builder.HeroCard(session)
                .title('Broadband 60')
                .subtitle('For Postpaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-60.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=90000P&isBundle=y&ppymttype=POSTPAID&ptype=BB&_ga=1.55846120.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info')
                ]),
                new builder.HeroCard(session)
                .title('Broadband 100')
                .subtitle('For Postpaid')
                .images([ builder.CardImage.create(session, imagedir + '/images/Broadband-100.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=90001P&isBundle=y&ppymttype=POSTPAID&ptype=BB&_ga=1.156903800.2103412470.1490767162', 'Buy Now'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/broadband', 'More Info')
                ]),
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Broadband Plans)/i
});


// R.3 - menu|Roaming
bot.dialog('Roaming', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Roaming Plans')
                .subtitle('Check out your roaming options')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Plan.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Plans", "More"),
                ]),
                new builder.HeroCard(session)
                .title('Roam by country? ')
                .subtitle('Just let us know where you\'regoing')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Country.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/international-roaming-rates', 'More')
                ]),
                new builder.HeroCard(session)
                .title('Roaming Tips')
                .subtitle('Here\'s all your need to know to stay connected')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Tips.PNG') ])
                .buttons([
                    builder.CardAction.imBack(session, "Roaming Tips", "More"),
                ]),
                new builder.HeroCard(session)
                .title('IDD Rates')
                .subtitle('International calls + SMS Rates')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Rates.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/international-calls-sms-rates', 'More')
                ]),
                new builder.HeroCard(session)
                .title('IDD 133')
                .subtitle('Enjoy the lowest IDD Rates to 36 countries')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-133.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/idd-133', 'More')
                ])
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Roaming)/i
});

// R.3.0 - menu|Roaming|RoamingPlans
bot.dialog('RoamingPlans', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingPlans',1);

        session.send("You can roam with the following");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Roam Like Home')
                .subtitle('The only postpaid plan you need to roam with')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-LikeHome.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/roam-like-home-monthly', 'More')
                ]),
                new builder.HeroCard(session)
                .title('Roaming Pass')
                .subtitle('Round the clock chatting & Surfing in 50 countries')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-Pass.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/roaming-pass', 'More')
                ]),
                new builder.HeroCard(session)
                .title('Unlimited Internet')
                .subtitle('Enjoy a hassle free roaming experience')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UnlimitedInternet.PNG') ])
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/roaming/unlimited-internet', 'More')
                ]),
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Plans)/i
});

// R.3.1 - menu|Roaming|RoamingTips
bot.dialog('RoamingTips', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips',1);

        session.send("Let's get ready to roam");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Activate Roaming Services')
                .subtitle('How long are you with Digi?')
                .buttons([
                    builder.CardAction.imBack(session, "Activate Roaming Over 6 Months", "More"),
                    builder.CardAction.imBack(session, "Activate Roaming Below 6 Months", "Less")
                ]),
                new builder.HeroCard(session)
                .title('Turn on/off data roaming')
                .buttons([
                    builder.CardAction.imBack(session, "iOS Data Roaming", "iOS"),
                    builder.CardAction.imBack(session, "Android Data Roaming", "Android")
                ]),
                new builder.HeroCard(session)
                .title('Purchase / subscribe to Roam Plass')
                .buttons([
                    builder.CardAction.imBack(session, "Subscribe Roaming Pass", "More")
                ]),
                new builder.HeroCard(session)
                .title('Usage Checking')
                .buttons([
                    builder.CardAction.imBack(session, "MyDigi Check Roam Usage", "MyDigi"),
                    builder.CardAction.imBack(session, "UMB Check Roam Usage", "UMB")
                ])
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Roaming Tips)/i
});

// R.3.1.0 - menu|Roaming|RoamingTips|ActivateRoamingOver6Months
bot.dialog('ActivateRoamingOver6Months', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|ActivateRoamingOver6Months',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Self-activate at MyDigi: ')
                .subtitle('Go to Plan Settings > \
                        \n My Subscription >\
                        \n International Roaming > \
                        \n click \"Subscribe\" >')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Roaming Over 6 Months)/i
});

// R.3.1.1 - menu|Roaming|RoamingTips|ActivateRoamingBelow6Months
bot.dialog('ActivateRoamingBelow6Months', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|ActivateRoamingBelow6Months',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Self-activate at MyDigi: ')
                .subtitle('Please provide us with \
                        \n i) Photocopy of NRIC \
                        \n ii) Valid Passport\
                        \n iii) Work permit (for non-Malaysian)')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Roaming Below 6 Months)/i
});

// R.3.1.2 - menu|Roaming|RoamingTips|iOSDataRoaming
bot.dialog('iOSDataRoaming', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|iOSDataRoaming',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('iOS Turn on/off data roaming')
                .text('Go to Settings > Mobile Data > \
                        \n Mobile Data Options > \
                        \nslide the \"Data Roaming\" ON/OFF')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(iOS Data Roaming)/i
});

// R.3.1.3 - menu|Roaming|RoamingTips|AndroidDataRoaming
bot.dialog('AndroidDataRoaming', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|AndroidDataRoaming',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Android Turn on/off data roaming')
                .subtitle('Go to Settings > Mobile networks > slide the "Data Roaming" ON/OFF')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Android Data Roaming)/i
});

// R.3.1.4 - menu|Roaming|RoamingTips|SubscribeRoamingPass
bot.dialog('SubscribeRoamingPass', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|SubscribeRoamingPass',1);

        session.send("BEFORE DEPARTURE: \
                    \nMake sure you turn off Data Roaming or Cellular Data/Mobile Data on your mobile phone");        
        session.send("Upon Arrival, follow these Steps");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Dial *128*5*1*6#'),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Press "2" to "Purchase Roaming Top Up"'),
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('You\'ll receive a confirmation SMS to notify you of successful Roaming Pass purchase'),
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Manually select the specified/applicable network operator'),
                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Turn on Data Roaming or Cellular Data/Mobile Data on your mobile phone')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Subscribe Roaming Pass)/i
});

// R.3.1.5 - menu|Roaming|RoamingTips|MyDigiCheckRoamUsage
bot.dialog('MyDigiCheckRoamUsage', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|MyDigiCheckRoamUsage',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On usage page, select "View Details"')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-MyDigi-Step1.png') ]),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Select "Internet" for Internet quota balance')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-MyDigi-Step2.png') ]),
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Select "Voice" for Voice minutes balance')
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-MyDigi-Step3.png') ])
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(MyDigi Check Roam Usage)/i
});

// R.3.1.6 - menu|Roaming|RoamingTips|UmbCheckRoamUsage
bot.dialog('UmbCheckRoamUsage', [
    function (session) {
        trackBotEvent(session, 'menu|Roaming|RoamingTips|UmbCheckRoamUsage',1);

        session.send("How to check balance for my Roaming Pass");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UMB-Step1.png') ])
                .title('Step 1')
                .subtitle('In UMB: Dial *128*5*1*6#'),
                new builder.HeroCard(session)
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UMB-Step2.png') ])
                .title('Step 2')
                .subtitle('Select 3 for voice minutes balance'),
                new builder.HeroCard(session)
                .images([ builder.CardImage.create(session, imagedir + '/images/Roaming-UMB-Step3.png') ])
                .title('Step 3')
                .subtitle('View your balance')
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(UMB Check Roam Usage)/i
});


// R.4 - menu|CommonlyAskedQuestion
bot.dialog('CommonlyAskedQuestion', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion',1);
        
        session.send("What would you like to find out today?");
        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('All About My Account')
                .text('We have the answers to the most asked questions on managing your account')
                .buttons([
                    builder.CardAction.imBack(session, "About My Account", "More"),
                ]),

                new builder.HeroCard(session)
                .title('MyDigi App')
                .text('An app to manage all your account needs. Find out how to use it')
                .buttons([
                    builder.CardAction.imBack(session, "MyDigi App", "More"),
                ]),
                        
                new builder.HeroCard(session)
                .title('Talk Time Services')
                .text('Find out how to request from or give prepaid credit to others')
                .buttons([
                    builder.CardAction.imBack(session, "Talk Time Services", "More"),
                ]),

                new builder.HeroCard(session)
                .title('Charges / Billing')
                .text('Got questions on your bills? Maybe we can help')
                .buttons([
                    builder.CardAction.imBack(session, "Charges Billing", "More"),
                ])
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", "Main Menu", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    },
]).triggerAction({
    matches: /(Commonly Asked Question)/i
});

// R.4.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount
bot.dialog('AllAboutMyAccount', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount',1);

//        session.send("1. How to get my acc no\
//                    \n2. What is my PUK code?\
//                    \n3. How to change my acc ownership?\
//                    \n4. How to check F&F?\
//                    \n5. How to add F&F");
//        builder.Prompts.choice(session, "", '1|2|3|4|5|Main Menu|Next Page', { listStyle: builder.ListStyle.button });
        
        builder.Prompts.choice(session, "All About My Accounts", 'How to get my acc no?|What is my PUK code?|Change my acc ownership?|How to check F&F?|How to add F&F?|Main Menu|Next Page', { listStyle: builder.ListStyle.button });
        
        
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('GetAccountNo');
            break;
	    case 1:
            session.replaceDialog('WhatIsMyPuk');
            break;
	    case 2:
            session.replaceDialog('ChangeMyAccOwnership');
            break;
        case 3:
            session.replaceDialog('CheckFnF');
            break;
        case 4: 
            session.replaceDialog('AddFnF');
            break;
        case 5:    // Main Menu
            session.replaceDialog('menu');
            break;
        default:    // Next Page
            session.replaceDialog('AllAboutMyAccount2');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(About My Account)/i
});

// R.4.0.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|GetAccountNo
bot.dialog('GetAccountNo', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|GetAccountNo',1);

        session.send("Your Account Number is available on your bill at the top right hand corner");
        builder.Prompts.choice(session, "", 'Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Get Account No)/i
});

// R.4.0.1 - menu|CommonlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk
bot.dialog('WhatIsMyPuk', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|WhatIsMyPuk',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select SIM and you will find your PUK code')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(What Is My Puk)/i
});

// R.4.0.2 - menu|CommonlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership
bot.dialog('ChangeMyAccOwnership', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|ChangeMyAccOwnership',1);

        builder.Prompts.choice(session, "Please visit the nearest Digi Store to change ownership of account. Both parties must be present together with NRICs for validation", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Change My Account Ownership)/i
});

// R.4.0.3 - menu|CommonlyAskedQuestion|AllAboutMyAccount|CheckFnF
bot.dialog('CheckFnF', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|CheckFnF',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('On the MyDigi app, click on Menu'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Settings'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Swipe left to select \'Family & Friends\' to view your list')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Check FnF)|(Check Friends and Family)/i
});

// R.4.0.5 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AddFnF
bot.dialog('AddFnF', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AddFnF',1);

        session.send("Dial *128*1# and press friends and family™. Reply 1 to register a Digi number as FnF. To register a non-Digi number, reply 2.");
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Add FnF)|(Add Friends and Family)/i
});

// R.4.0.6 - menu|CommonlyAskedQuestion|AllAboutMyAccount2
bot.dialog('AllAboutMyAccount2', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount2',1);

        builder.Prompts.choice(session, "", 'I\'m going overseas, what can I do?|How do I activate VOLTE?|How do I port-in?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('GoingOverseas');
            break;
	    case 1:
            session.replaceDialog('HowToActivateVolte');
            break;
	    case 2:
            session.replaceDialog('HowToPortIn');
            break;
        default:    // Main Menu
            session.replaceDialog('menu');
            break;
        }
    },
    function (session) {
        session.replaceDialog('menu');
    }
]);

// R.4.0.6.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas
bot.dialog('GoingOverseas', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|GoingOverseas',1);

        builder.Prompts.choice(session, "For short holidays, stay in touch by activating Roaming Services", 'menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Going Overseas)|(Activate Roaming)/i
});

// R.4.0.6.1 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte
bot.dialog('HowToActivateVolte', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .subtitle('Please check if your device is compatible and the instructions for activation can be found here')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/services/volte', 'Check'),
                    builder.CardAction.imBack(session, "Activation", "Activation"),
                    builder.CardAction.imBack(session, "menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, "Activation|Main Menu");
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.beginDialog('ActivateVolte');
            break;
        default:
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(How to activate Volte)/i
});

// R.4.0.6.1.0 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte
bot.dialog('ActivateVolte', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToActivateVolte|ActivateVolte',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Select \"Settings\"'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Select \"Mobile Data\"'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Tap on Mobile Data Options'),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Select \"Enable 4G\"'),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Choose Voice & Data to enable VoLTE')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Activate Volte)/i
});

// R.4.0.6.2 - menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn
bot.dialog('HowToPortIn', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|AllAboutMyAccount|AllAboutMyAccount2|HowToPortIn',1);

        session.send("Here are a few ways to go about it");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Digi Website')
                .subtitle('Checkout our plans on Digi Website and once you\'ve found the right plan, select Port-in to proceed')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/prepaid-plans', 'Prepaid'),
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/postpaid-plans', 'Postpaid')
                ]),
                new builder.HeroCard(session)
                .title('Digi Store')
                .subtitle('Just drop by the nearest Digi Store and we will take care of the rest for you')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/support/digi-store', 'Store Locator')
                ])
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(How to Port in)/i
});

// R.4.1 - menu|CommonlyAskedQuestion|MyDigiApp
bot.dialog('MyDigiApp', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp',1);

        builder.Prompts.choice(session, "", 'How do I get started with MyDigi?|How do I download my bill from MyDigi?|How do I make payment for another via MyDigi?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('GetStartedMyDigi');
            break;
	    case 1:
            session.replaceDialog('DownloadBillFrMyDigi');
            break;
	    case 2:
            session.replaceDialog('PayForAnotherNumber');
            break;
        default:    // Main Menu
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(MyDigi App)/i
});

// R.4.1.0 - menu|CommonlyAskedQuestion|MyDigiApp|GetStartedMyDigi
bot.dialog('GetStartedMyDigi', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|GetStartedMyDigi',1);

        session.send("You can follow the steps below");
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Checkout our plans on Digi Website and once you\'ve found the right plan, select Port-in to proceed')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://appurl.io/j1801ncp', 'Download MyDigi'),
                ]),
                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Sign in to the app using a Connect ID or proceed with your number. Make sure to turn on your data or this may not work!')                
            ]);
        session.send(respCards);
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Get Started with MyDigi)/i
});

// R.4.1.1 - menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi
bot.dialog('DownloadBillFrMyDigi', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Click on View Details'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on \'Download Bills\' just below the total charges'),
            ]);
        session.send(respCards);        
        builder.Prompts.choice(session, "", 'See bills for past 6 months|Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('SeeBillsForPastSixMonths');
            break;
        default:    // Main Menu
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(Download Bill From MyDigi)/i
});


// R.4.1.1.0 - menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi|SeeBillsForPastSixMonths
bot.dialog('SeeBillsForPastSixMonths', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|DownloadBillFrMyDigi|SeeBillsForPastSixMonths',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Click on the Menu Button'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Bills'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Click on \'More\' icon at the top right corner'),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Click on \'Previous Bills\''),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('You can view & download your bills for the last 6 months')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Bills for past 6 months)/i
});

// R.4.1.2 - menu|CommonlyAskedQuestion|MyDigiApp|PayForAnotherNumber
bot.dialog('PayForAnotherNumber', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|MyDigiApp|PayForAnotherNumber',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Click on the Menu Button'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Click on Digi Shares'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('Click on Add a number to share'),
                    
                new builder.HeroCard(session)
                .title('Step 4')
                .subtitle('Enter the Name and Mobile Number. Then click on Save'),

                new builder.HeroCard(session)
                .title('Step 5')
                .subtitle('Select the name of the person you would like to make payment for, key in the amount and email address. Then click on Pay Bill')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Pay For Another Number)/i
});

// R.4.2 - menu|CommonlyAskedQuestion|TalkTimeServices
bot.dialog('TalkTimeServices', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|TalkTimeServices',1);

        builder.Prompts.choice(session, "", 'How to get my acc no?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('TalkTimeTransfer');
            break;
        default:    // Next Page
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(Talk Time Services)/i
});

// R.4.2.0 - menu|CommonlyAskedQuestion|TalkTimeServices|TalkTimeTransfer
bot.dialog('TalkTimeTransfer', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|TalkTimeTransfer',1);

        session.send("You can follow the steps below");        
        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .title('Step 1')
                .subtitle('Dial *128# from your Digi mobile, then select My Account. From the menu, select Talktime Service'),

                new builder.HeroCard(session)
                .title('Step 2')
                .subtitle('Reply 1 to select Talktime Transfer, and then choose a transfer option. Key in the Digi mobile number you wish to send Prepaid credit to and select CALL/SEND'),
                        
                new builder.HeroCard(session)
                .title('Step 3')
                .subtitle('You will receive a confirmation text message upon successful transaction')
            ]);
        session.send(respCards);
        
        builder.Prompts.choice(session, "", 'Main Menu', { listStyle: builder.ListStyle.button });  
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Talk Time Transfer)/i
});

// R.4.3 - menu|CommonlyAskedQuestion|ChargesOrBilling
bot.dialog('ChargesOrBilling', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling',1);

        builder.Prompts.choice(session, "", 'Will I be charged for calling 1300/1800 numbers?|Why is there an RM10 charge for my Buddyz?|Can I change my billing cycle?|Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.replaceDialog('ChargeForCallingTollFree');
            break;
        case 1:
            session.replaceDialog('ChargeForBuddyz');
            break;
        case 2:
            session.replaceDialog('ChangeBillingCycle');
            break;
        default:    // Next Page
                session.replaceDialog('menu');
            break;
        }
    }
]).triggerAction({
    matches: /(Charges Billing)/i
});

// R.4.3.0 - menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForCallingTollFree
bot.dialog('ChargeForCallingTollFree', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForCallingTollFree',1);

        builder.Prompts.choice(session, "To be confirmed", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Talk Time Services)/i
});

// R.4.3.1 - menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForBuddyz
bot.dialog('ChargeForBuddyz', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling|ChargeForBuddyz',1);

        var respCards = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                .subtitle('You can register your first three (3) Buddyz (Digi numbers), free of charge and each change after that will be charged RM10')
                .buttons([
                    builder.CardAction.openUrl(session, 'http://new.digi.com.my/Page/tnc/default/tnc_buddyz', 'More Details'),
                    builder.CardAction.imBack(session, "menu", "Main Menu")
                ])
            ]);
        builder.Prompts.choice(session, respCards, "menu");
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Charge For Buddyz)/i
});

// R.4.3.0 - menu|CommonlyAskedQuestion|ChargesOrBilling|ChangeBillingCycle
bot.dialog('ChangeBillingCycle', [
    function (session) {
        trackBotEvent(session, 'menu|CommonlyAskedQuestion|ChargesOrBilling|ChangeBillingCycle',1);

        builder.Prompts.choice(session, "To be confirmed", 'Main Menu', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /(Change Billing Cycle)/i
});

bot.dialog('NLP', [
// R - menu
    function (session) {
        trackBotEvent(session, 'NLP',1);  
    },
    function (session) {
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(Who)|(What)|(How)(I want)/i
});


bot.dialog('getFeedback', [
    function (session) {
        builder.Prompts.choice(session, emoji.emojify("We would appreciate your feedback. How would you rate our Virtual Assistant? \n(1)not able to help me, (5)very useful"), emoji.emojify('1|2|3|4|5'), { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 1',1,0);
                break;
            case 1:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 2',1,0);
                break;
            case 2:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 3',1,0);
                break;
            case 3:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 4',1,0);
                break;
            case 4:
                trackBotEvent(session,session.privateConversationData[LastMenu]+'|Feedback 5',1,0);
                break;
            default:
                session.send("Sorry, I didn\'t quite get that.");
                break;
        }

        session.send('Thank you for your feedback');
        session.replaceDialog('menu');
    }
])




bot.dialog('CheckMyAccount', [
    function (session) {
        session.send("Just let us verify your identity for a sec ");
        
        session.beginDialog('validators:phonenumber', {
            prompt: session.gettext('What is your phone number?'),
            retryPrompt: session.gettext('The phone number is invalid. Please key in Digi Phone Number 01xxxxxxxx'),
            maxRetries: MaxRetries
        });
    },
    function (session, results) {
        session.userData.phoneNumber = results.response;
        session.userData.oneTimeCode = GenerateOtp(session.userData.phoneNumber);
        builder.Prompts.text(session, 'I have just sent the One Time Code to you. Can you please key in the 4 digit code?');
    },
    function (session, results) {
        session.send('Your Phone is ' + session.userData.phoneNumber + ' your code is ' + session.userData.oneTimeCode);
        session.replaceDialog('PrepaidAccountOverview');
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
]).triggerAction({
    matches: /^(chinyankeat)/i
});

function GenerateOtp(phoneNumber){
    
    var randomotp = math.randomInt(1,9999);
    var args = {
        data:  "{\
                 \"ref_id\": \"TEST123456#\",\
                 \"service_id\": \"DG_HELLOWIFI\",\
                 \"msisdn\": \"" + phoneNumber + "\",\
                 \"status\": \"1\",\
                 \"transaction_id\": \"\",\
                 \"price_code\": \"VAS220000\",\
                 \"keyword\": \"test\",\
                 \"source_mobtel\": \"20000\",\
                 \"sender_name\": \"\",\
                 \"sms_contents\": [\
                  {\
                   \"content\": \"RM0.00 Digi Virtual Assistant. Your one time PIN is " + randomotp + ", valid for the next 3 minutes\",\
                   \"ucp_data_coding_id\": \"0\",\
                   \"ucp_msg_type\": \"3\",\
                   \"ucp_msg_class\": \"3\"\
                  }\
                 ]\
                }",
        headers: { Authorization: "Basic " + process.env.SMS_AUTHORIZATIONKEY,
                   "Content-Type": "application/json"}
    };
    restclient.post(process.env.SMS_SENDLINK  + phoneNumber, args, function(data,response) {});
return randomotp;
}










///////////////////////////////////////////Previous Menu, maintained until tested. 
// R.1 - menu | PrepaidDialog
bot.dialog('PrepaidDialog', [
    function (session) {
        trackBotEvent(session, 'Main|Prepaid',1);
        
        builder.Prompts.choice(session, "Here are some things that I can help you with", 'Plan Recommendation|Prepaid Plans|Promotions|Internet Plans|My Account', { listStyle: builder.ListStyle.button });
    },

    
    function (session, results) {
        switch (results.response.index) {
        case 0:
            session.beginDialog('PrepaidRecommendationQ1');
            break;
	    case 1:
	    case 2:    // Promotions
        case 3:    // Internet Plans
            var cards = getCardsPrepaidPlan();
		    var reply = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(cards);
    		session.send(reply);
            break;
        case 4:    // My Account
            session.beginDialog('MyAccountPrepaid');
            break;
        default:
            session.send("Sorry, I don't quite get that");
            session.endDialog();
            session.beginDialog('MyAccountPrepaid');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])


// R.0.0 - menu | PrepaidDialog | PrepaidRecommendationQ1 
bot.dialog('PrepaidRecommendationQ1', [
    function (session) {
        trackBotEvent(session, 'Main|Prepaid|PrepaidRecommendationQ1',1);

        builder.Prompts.choice(session, "Do you use a lot of voice calls?", 'Yes|No', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0: // Yes
        case 1: // No
            session.beginDialog('PrepaidRecommendationQ2');
            break;
        default:
    		session.send('Sorry, I don\'t quite understand that');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.0.0.1 - menu | PrepaidDialog | PrepaidRecommendationQ1 | PrepaidRecommendationQ2
bot.dialog('PrepaidRecommendationQ2', [
    function (session) {
        trackBotEvent(session, 'Main|Prepaid|PrepaidRecommendationQ2',1);

        builder.Prompts.choice(session, "I see.  What do you usually use your data for?", 'Social Media|Music/Videos|Data is Life!|I don\'t really use data', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0:
	    case 1:
	    case 2:
	    case 3:
            var cards = getCardsBestPrepaid();
		    var reply = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(cards);
    		session.send(reply);
            session.beginDialog('getFeedback');
            break;
        default:
    		session.send('Sorry, I don\'t quite understand that');
            break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

// R.0.0.1.1 - menu | PrepaidDialog | PrepaidRecommendationQ1 | PrepaidRecommendationQ2 | getCardsBestPrepaid
function getCardsBestPrepaid(session) {
    return [
        new builder.HeroCard(session)
            .title('Digi Prepaid BEST')
            .subtitle('Unlimited Social Internet Pack')
            .images([
                builder.CardImage.create(session, 'http://new.digi.com.my/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1410526370609&ssbinary=true')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Port In')
            ])
    ];
}

// R.0.1 - menu | PrepaidDialog | getCardsPrepaidPlan
function getCardsPrepaidPlan(session) {
    return [
        new builder.HeroCard(session)
            .title('Digi Prepaid BEST')
            .subtitle('The Best Deal for Prepaid')
            .images([
                builder.CardImage.create(session, 'http://new.digi.com.my/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1410526370609&ssbinary=true')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Port In')
            ]),
        new builder.HeroCard(session)
            .title('Digi Prepaid LIVE')
            .subtitle('ALL the internet you need')
            .images([
                builder.CardImage.create(session, 'http://new.digi.com.my/cs/Satellite?blobcol=urldata&blobkey=id&blobtable=MungoBlobs&blobwhere=1410526372124&ssbinary=true')
            ])
            .buttons([
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Buy Now'),
                builder.CardAction.openUrl(session, 'https://store.digi.com.my/storefront/product-config.ep?pID=20016&isBundle=n&ppymttype=PREPAID&ptype=VOICE&_ga=1.60494381.1675682806.1470899460', 'Port In')
            ])
    ];
}

// R.0.4 - menu | PrepaidDialog  | MyAccountPrepaid
bot.dialog('MyAccountPrepaid', [
    function (session) {
        session.send("Just let us verify your identity for a sec ");


        session.userData.oneTimeCode = GenerateOtp(session.userData.phoneNumber);
        var userOtpRegex = new RegExp(userOtp);
        console.log("otp is " + session.userData.oneTimeCode);        
        builder.DialogAction.validatedPrompt('I have just sent the One Time Code to you. Can you please key in the 4 digit code?', function (response) {
            return userOtpRegex.test(response);
        })
        
        
        
        
        session.beginDialog('validators:phonenumber', {
            prompt: session.gettext('What is your phone number?'),
            retryPrompt: session.gettext('The phone number is invalid. Please key in Digi Phone Number 01xxxxxxxx'),
            maxRetries: MaxRetries
        });
    },
    function (session, results) {
        session.userData.phoneNumber = results.response;
        session.userData.oneTimeCode = GenerateOtp(session.userData.phoneNumber);
        builder.Prompts.text(session, 'I have just sent the One Time Code to you. Can you please key in the 4 digit code?');
        
        var userOtpRegex = new RegExp(userOtp);
        
        builder.DialogAction.validatedPrompt('I have just sent the One Time Code to you. Can you please key in the 4 digit code?', function (response) {
            return userOtpRegex.test(response);
        })
    },
    function (session, results) {
        session.send('Your Phone is ' + session.userData.phoneNumber + ' your code is ' + session.userData.oneTimeCode);
        session.replaceDialog('PrepaidAccountOverview');
    },
    function (session) {
        // Reload menu
        session.replaceDialog('menu');
    }
])

function GenerateOtp(phoneNumber){
    
    var randomotp = math.randomInt(1,9999);
    var args = {
        data:  "{\
                 \"ref_id\": \"TEST123456#\",\
                 \"service_id\": \"DG_HELLOWIFI\",\
                 \"msisdn\": \"" + phoneNumber + "\",\
                 \"status\": \"1\",\
                 \"transaction_id\": \"\",\
                 \"price_code\": \"VAS220000\",\
                 \"keyword\": \"test\",\
                 \"source_mobtel\": \"20000\",\
                 \"sender_name\": \"\",\
                 \"sms_contents\": [\
                  {\
                   \"content\": \"RM0.00 Digi Virtual Assistant. Your one time PIN is " + randomotp + ", valid for the next 3 minutes\",\
                   \"ucp_data_coding_id\": \"0\",\
                   \"ucp_msg_type\": \"3\",\
                   \"ucp_msg_class\": \"3\"\
                  }\
                 ]\
                }",
        headers: { Authorization: "Basic " + process.env.SMS_AUTHORIZATIONKEY,
                   "Content-Type": "application/json"}
    };
//restclient.post(process.env.SMS_SENDLINK  + phoneNumber, args, function(data,response) {});
console.log("sent OTP" + process.env.SMS_SENDLINK + phoneNumber + " data " + args.data); 

return randomotp;
}


// R.0.4.1.1 - menu | PrepaidDialog  | MyAccountPrepaid | OneTimeCode | PrepaidAccountOverview
bot.dialog('PrepaidAccountOverview', [
    function (session) {
        builder.Prompts.choice(session, "What can we help you with?", 'Credit Balance|Internet Quota|Talktime Services|Itemized Usage|Reload|Add On', { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        switch (results.response.index) {
        case 0: // Credit Balance
            session.beginDialog('CreditBalance');
            break;
        case 1: // Internet Quota
        case 2: // Talktime Services
        case 3: // Itemized Usage
        case 4: // Reload
        case 5: // Add On
            session.send("Coming Soon!!");
        default:
            session.send("Sorry, I didn't quite get that.");
            break;
        }
    }
])


//////////////////////////////////////////////////////////////////////////////
// All interfaces for Reference
//////////////////////////////////////////////////////////////////////////////


bot.dialog('/ref', [
    function (session) {
        builder.Prompts.choice(session, "What demo would you like to run?", "prompts|picture|cards|list|carousel|receipt|actions|quit");
    },
    function (session, results) {
        if (results.response && results.response.entity != 'quit'
            && results.response.entity != 'menu'
            && results.response.entity != 'exit'
            && results.response.entity != 'begin') {
            // Launch demo dialog
            session.beginDialog('/' + results.response.entity);
        } else {
            // Exit the menu
            session.replaceDialog('menu');
        }
    },
    function (session, results) {
        // The menu runs a loop until the user chooses to (quit).
        session.replaceDialog('/menu');
    }
]).triggerAction({
    matches: /(referencemenu)/i
});

bot.dialog('/help', [
    function (session) {
        session.endDialog("Global commands that are available anytime:\n\n* menu - Exits a demo and returns to the menu.\n* goodbye - End this conversation.\n* help - Displays these commands.");
    }
]);

bot.dialog('/prompts', [
    function (session) {
        session.send("Our Bot Builder SDK has a rich set of built-in prompts that simplify asking the user a series of questions. This demo will walk you through using each prompt. Just follow the prompts and you can quit at any time by saying 'cancel'.");
        builder.Prompts.text(session, "Prompts.text()\n\nEnter some text and I'll say it back.");
    },
    function (session, results) {
        session.send("You entered '%s'", results.response);
        builder.Prompts.number(session, "Prompts.number()\n\nNow enter a number.");
    },
    function (session, results) {
        session.send("You entered '%s'", results.response);
        session.send("Bot Builder includes a rich choice() prompt that lets you offer a user a list choices to pick from. On Facebook these choices by default surface using Quick Replies if there are 10 or less choices. If there are more than 10 choices a numbered list will be used but you can specify the exact type of list to show using the ListStyle property.");
        builder.Prompts.choice(session, "Prompts.choice()\n\nChoose a list style (the default is auto.)", "auto|inline|list|button|none");
    },
    function (session, results) {
        var style = builder.ListStyle[results.response.entity];
        builder.Prompts.choice(session, "Prompts.choice()\n\nNow pick an option.", "option A|option B|option C", { listStyle: style });
    },
    function (session, results) {
        session.send("You chose '%s'", results.response.entity);
        builder.Prompts.confirm(session, "Prompts.confirm()\n\nSimple yes/no questions are possible. Answer yes or no now.");
    },
    function (session, results) {
        session.send("You chose '%s'", results.response ? 'yes' : 'no');
        builder.Prompts.time(session, "Prompts.time()\n\nThe framework can recognize a range of times expressed as natural language. Enter a time like 'Monday at 7am' and I'll show you the JSON we return.");
    },
    function (session, results) {
        session.send("Recognized Entity: %s", JSON.stringify(results.response));
        builder.Prompts.attachment(session, "Prompts.attachment()\n\nYour bot can wait on the user to upload an image or video. Send me an image and I'll send it back to you.");
    },
    function (session, results) {
        var msg = new builder.Message(session)
            .ntext("I got %d attachment.", "I got %d attachments.", results.response.length);
        results.response.forEach(function (attachment) {
            msg.addAttachment(attachment);    
        });
        session.endDialog(msg);
    }
]);

bot.dialog('/picture', [
    function (session) {
        session.send("You can easily send pictures to a user...");
        var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: "http://www.theoldrobots.com/images62/Bender-18.JPG"
            }]);
        session.endDialog(msg);
    }
]);

bot.dialog('/cards', [
    function (session) {
        session.send("You can use either a Hero or a Thumbnail card to send the user visually rich information. On Facebook both will be rendered using the same Generic Template...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Hero Card")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle"))
            ]);
        session.send(msg);

        msg = new builder.Message(session)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Thumbnail Card")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/list', [
    function (session) {
        session.send("You can send the user a list of cards as multiple attachments in a single message...");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
            ]);
        session.endDialog(msg);
    }
]);

bot.dialog('/carousel', [
    function (session) {
        session.send("You can pass a custom message to Prompts.choice() that will present the user with a carousel of cards to select from. Each card can even support multiple actions.");
        
        // Ask the user to select an item from a carousel.
        var msg = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:100", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("Pikes Place Market")
                    .subtitle("Pike Place Market is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/800px-PikePlaceMarket.jpg")),
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:101", "Select")
                    ]),
                new builder.HeroCard(session)
                    .title("EMP Museum")
                    .subtitle("EMP Musem is a leading-edge nonprofit museum, dedicated to the ideas and risk-taking that fuel contemporary popular culture.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/320px-Night_Exterior_EMP.jpg")
                            .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/800px-Night_Exterior_EMP.jpg"))
                    ])
                    .buttons([
                        builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/EMP_Museum", "Wikipedia"),
                        builder.CardAction.imBack(session, "select:102", "Select")
                    ])
            ]);
        builder.Prompts.choice(session, msg, "select:100|select:101|select:102");
    },
    function (session, results) {
        var action, item;
        var kvPair = results.response.entity.split(':');
        switch (kvPair[0]) {
            case 'select':
                action = 'selected';
                break;
        }
        switch (kvPair[1]) {
            case '100':
                item = "the Space Needle";
                break;
            case '101':
                item = "Pikes Place Market";
                break;
            case '102':
                item = "the EMP Museum";
                break;
        }
        session.endDialog('You %s "%s"', action, item);
    }    
]);

bot.dialog('/receipt', [
    function (session) {
        session.send("You can send a receipts for facebook using Bot Builders ReceiptCard...");
        var msg = new builder.Message(session)
            .attachments([
                new builder.ReceiptCard(session)
                    .title("Recipient's Name")
                    .items([
                        builder.ReceiptItem.create(session, "$22.00", "EMP Museum").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/a/a0/Night_Exterior_EMP.jpg")),
                        builder.ReceiptItem.create(session, "$22.00", "Space Needle").image(builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/7/7c/Seattlenighttimequeenanne.jpg"))
                    ])
                    .facts([
                        builder.Fact.create(session, "1234567898", "Order Number"),
                        builder.Fact.create(session, "VISA 4076", "Payment Method")
                    ])
                    .tax("$4.40")
                    .total("$48.40")
            ]);
        session.send(msg);

        session.send("Or using facebooks native attachment schema...");
        msg = new builder.Message(session)
            .sourceEvent({
                facebook: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "receipt",
                            recipient_name: "Stephane Crozatier",
                            order_number: "12345678902",
                            currency: "USD",
                            payment_method: "Visa 2345",        
                            order_url: "http://petersapparel.parseapp.com/order?order_id=123456",
                            timestamp: "1428444852", 
                            elements: [
                                {
                                    title: "Classic White T-Shirt",
                                    subtitle: "100% Soft and Luxurious Cotton",
                                    quantity: 2,
                                    price: 50,
                                    currency: "USD",
                                    image_url: "http://petersapparel.parseapp.com/img/whiteshirt.png"
                                },
                                {
                                    title: "Classic Gray T-Shirt",
                                    subtitle: "100% Soft and Luxurious Cotton",
                                    quantity: 1,
                                    price: 25,
                                    currency: "USD",
                                    image_url: "http://petersapparel.parseapp.com/img/grayshirt.png"
                                }
                            ],
                            address: {
                                street_1: "1 Hacker Way",
                                street_2: "",
                                city: "Menlo Park",
                                postal_code: "94025",
                                state: "CA",
                                country: "US"
                            },
                            summary: {
                                subtotal: 75.00,
                                shipping_cost: 4.95,
                                total_tax: 6.19,
                                total_cost: 56.14
                            },
                            adjustments: [
                                { name: "New Customer Discount", amount: 20 },
                                { name: "$10 Off Coupon", amount: 10 }
                            ]
                        }
                    }
                }
            });
        session.endDialog(msg);
    }
]);

bot.dialog('/actions', [
    function (session) { 
        session.send("Bots can register global actions, like the 'help' & 'goodbye' actions, that can respond to user input at any time. You can even bind actions to buttons on a card.");

        var msg = new builder.Message(session)
            .attachments([
                new builder.HeroCard(session)
                    .title("Space Needle")
                    .subtitle("The Space Needle is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
                    ])
                    .buttons([
                        builder.CardAction.dialogAction(session, "weather", "Seattle, WA", "Current Weather")
                    ])
            ]);
        session.send(msg);

        session.endDialog("The 'Current Weather' button on the card above can be pressed at any time regardless of where the user is in the conversation with the bot. The bot can even show the weather after the conversation has ended.");
    }
]);

// Create a dialog and bind it to a global action
bot.dialog('/weather', [
    function (session, args) {
        session.endDialog("The weather in %s is 71 degrees and raining.", args.data);
    }
]);
bot.beginDialogAction('weather', '/weather');   // <-- no 'matches' option means this can only be triggered by a button.


// Connector listener wrapper to capture site url
var connectorListener = connector.listen();
function listen() {
    return function (req, res) {
        // Capture the url for the hosted application
        // We'll later need this url to create the checkout link 
        connectorListener(req, res);
    };
}

module.exports = {
    listen: listen,
};
