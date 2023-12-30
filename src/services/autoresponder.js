import { google } from "googleapis";

import { getThreadData, getThreads, createLabelIfNotExists, getUser, hasAlreadyBeenReplied, sendEmail } from "../utils/gmail.js";
import { authorize } from "../auth/gmailAuth.js";
import { emailConfig } from "../../config.js";
import { delay, getRandomDelayBetweenIntervals } from "../utils/utility.js";
import logger from "../utils/logger.js";

async function reply(gmail, userEmail, label) {
    const threads = await getThreads(gmail);

    logger.info(`${threads.length} unread threads fetched`);

    // to count the number of processed emails
    let processedEmails = 0, manuallyReplied = 0;

    for(const thread of threads) {
        // get the thread data
        const threadData = await getThreadData(gmail, thread.id);
        const threadMessages = threadData.messages || [];

        // check if there has been any manual reply by the user in the past
        if(hasAlreadyBeenReplied(threadMessages, userEmail)) {
            manuallyReplied += 1;
        } else {
            await sendEmail(gmail, threadData, label);
            processedEmails += 1;
        }
    }

    logger.info(`${manuallyReplied} threads manually replied by the user in the past`);
    logger.info(`${processedEmails} emails autoreplied`);
}

async function startService() {
    logger.info('Autoresponder service started...');
    try {
        // authorize the user and get the oauth client
        const auth = await authorize();
        
        // instantiate the gmail client using the oauth client
        const gmailClient = google.gmail({ version: 'v1', auth });

        // get the user data
        const user = await getUser(gmailClient);

        if(!user) {
            logger.info('User not found');
            return;
        }

        logger.info(`User: ${ user }`);

        // create the label
        const label = await createLabelIfNotExists(gmailClient, emailConfig.labelName);

        while(true) {
            // Reply to new threads
            await reply(gmailClient, user, label);

            // Introduce a random delay
            await delay(getRandomDelayBetweenIntervals() * 1000);
        }
    } catch(err) {
        logger.error(err);
    }
}

export { startService };