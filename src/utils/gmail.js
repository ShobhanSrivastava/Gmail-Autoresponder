import { emailConfig } from "../../config.js";
import logger from "./logger.js";

// to get the data of the user
async function getUser(gmail) {
    const res = await gmail.users.getProfile({
        userId: 'me'
    });

    return res.data.emailAddress || '';
}

// to check if label with the given name exists or not
async function findLabel(gmail, labelName) {
    const res = await gmail.users.labels.list({
        userId: 'me'
    });

    const labelsList = res.data.labels || [];

    let label = labelsList.find(
        label => label.name?.toLowerCase() === labelName.toLowerCase()
    );

    return label;
}

// to create a label if it not exists yet
async function createLabelIfNotExists(gmail, labelName) {
    let label = await findLabel(gmail, labelName);

    if(!label) {
        logger.info("No label with given labelName found");
        
        const res = await gmail.users.labels.create({
            userId: 'me',
            requestBody: {
                labelListVisibility: "labelShow",
                messageListVisibility: "show",
                name: labelName
            }
        });
        
        label = res.data;
        logger.info("Created a label with given labelName");
    } else {
        logger.info('Label already present');
    }

    return label;
}

// to get the threads of the user
async function getThreads(gmail) {
    const twoMinutesAgo = Math.floor(new Date(Date.now() - 2 * 60 * 1000)/1000);

    /**
     * Instead of fetching all the unread threads,
     * to reduce redundancy, I have fetched only the unread threads received in the past 2 minutes
     * also I have made sure that the thread does not have the label that is added by the application
     * This offloads those computations to the Gmail API, which check if the thread has been autoreplied already
     */
    const res = await gmail.users.threads.list({
        userId: 'me',
        q: `after:${twoMinutesAgo} is:unread -label:${emailConfig.labelName}`
    });

    return res.data.threads || [];
}

// to get the thread data
async function getThreadData(gmail, id) {
    const res = await gmail.users.threads.get({
        userId: 'me',
        id,
        format: 'metadata'
    });

    return res.data;
}

// checks if the thread has already been replied by the user
function hasAlreadyBeenReplied(messages, userEmail) {
    for(const message of messages) {
        const headers = message.payload?.headers || [];
        for(const header of headers) {
            if(header.name.toLowerCase() === "from" && header.value.includes(userEmail)) {
                return true;
            }
        }
    }

    return false;
}

// to get the important headers like From, Subject and Message-ID which are used to reply to the same conversation
function getRequiredHeaders(headers) {
    let requiredHeaders = {};

    for(const header of headers) {
        if(header.name === 'From') {
            requiredHeaders['sender'] = header.value;
        } else if(header.name === 'Subject') {
            requiredHeaders['subject'] = header.value;
        } else if(header.name === 'Message-ID') {
            requiredHeaders['value'] = header.value;
        }
    }

    return requiredHeaders;
}

// to update the thread with the given label
async function updateThreadId(gmail, label, threadId) {
    await gmail.users.threads.modify({
        userId: 'me',
        id: threadId,
        requestBody: {
            addLabelIds: [ label.id ]
        }
    });
}

// To send an email
async function sendEmail(gmail, thread, label) {
    const { sender, subject, messageId } = getRequiredHeaders(thread.messages[0]?.payload?.headers);

    const email = 
    `To: ${sender}\n`
    + `Subject: ${subject}\n`
    + `In-Reply-To: ${messageId}\n`
    + `References: ${messageId}\n`
    + `\n`
    + `${emailConfig.description}`;

    const encodedEmail = Buffer.from(email).toString('base64');

    const message = {
        threadId: thread.id,
        raw: encodedEmail
    };

    await gmail.users.messages.send({
        userId: 'me',
        requestBody: message
    });

    await updateThreadId(gmail, label, thread.id);
}

export { getUser, getThreads, getThreadData, createLabelIfNotExists, hasAlreadyBeenReplied, sendEmail };