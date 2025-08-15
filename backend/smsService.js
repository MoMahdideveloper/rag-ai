const { SmsProvider } = require('./database');
const TwilioSmsProvider = require('./providers/twilioSmsProvider');

// In a real app, you might have a map of providers
const providers = {
    'Twilio': TwilioSmsProvider,
    // 'Vonage': VonageSmsProvider, // Example for the future
};

async function sendSms(teamId, recipient, body) {
    try {
        // 1. Find the active provider for the team
        const activeProvider = await SmsProvider.findOne({
            where: {
                teamId: teamId,
                isActive: true,
            },
        });

        if (!activeProvider) {
            console.warn(`No active SMS provider found for team ${teamId}. SMS not sent.`);
            return { success: false, error: 'No active SMS provider configured.', providerName: null };
        }

        // 2. Get the provider implementation
        const ProviderClass = providers[activeProvider.name];
        if (!ProviderClass) {
            console.error(`SMS provider implementation for "${activeProvider.name}" not found.`);
            return { success: false, error: `Provider ${activeProvider.name} is not supported.` };
        }

        // 3. Instantiate and send
        // Note: apiKey is used for Account SID, apiSecret for Auth Token for Twilio
        const providerInstance = new ProviderClass(activeProvider.apiKey, activeProvider.apiSecret);
        const result = await providerInstance.send(
            recipient,
            activeProvider.senderNumber,
            body
        );

        return { ...result, providerName: activeProvider.name };

    } catch (error) {
        console.error(`Error in smsService for team ${teamId}:`, error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendSms,
};
