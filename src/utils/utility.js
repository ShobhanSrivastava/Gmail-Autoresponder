import { emailConfig } from "../../config.js";

function getRandomDelayBetweenIntervals() {
    return Math.floor(
        emailConfig.minInterval + Math.random() * (emailConfig.maxInterval - emailConfig.minInterval + 1)
    );
}

function delay(duration) {
    return new Promise(resolve => {
        setTimeout(resolve, duration);
    })
}

export { getRandomDelayBetweenIntervals, delay };