const twilio = require('twilio');

class TwilioSmsProvider {
    constructor(accountSid, authToken) {
        if (!accountSid || !authToken) {
            throw new Error('Twilio account SID and auth token are required.');
        }
        this.client = twilio(accountSid, authToken);
    }

    async send(to, from, body) {
        try {
            const message = await this.client.messages.create({
                to: to,
                from: from,
                body: body,
            });
            console.log(`SMS sent successfully to ${to}. SID: ${message.sid}`);
            return { success: true, messageId: message.sid };
        } catch (error) {
            console.error(`Failed to send SMS to ${to} via Twilio:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = TwilioSmsProvider;
