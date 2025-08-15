const sgMail = require('@sendgrid/mail');

// It's crucial to set the API key from an environment variable in a real application.
// The user will be instructed to set this up in the README.
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid API Key configured.');
} else {
    console.warn('WARNING: SENDGRID_API_KEY not set. Email functionality will be disabled.');
}

/**
 * Sends an email using SendGrid.
 * @param {object} options
 * @param {string} options.to - The recipient's email address.
 * @param {string} options.from - The sender's email address. Must be a verified sender in SendGrid.
 * @param {string} options.subject - The subject of the email.
 * @param {string} options.text - The plain text content of the email.
 * @param {string} options.html - The HTML content of the email.
 */
const sendEmail = async ({ to, from, subject, text, html }) => {
    if (!process.env.SENDGRID_API_KEY) {
        console.error('SendGrid API Key not configured. Simulating email send for development.');
        // To avoid blocking the workflow (e.g., creating the Interaction),
        // we'll resolve the promise successfully in a non-production environment.
        // In a real production app, you would likely throw an error here.
        return Promise.resolve();
    }

    const msg = {
        to,
        from, // This needs to be a verified sender in your SendGrid account
        subject,
        text,
        html,
    };

    try {
        await sgMail.send(msg);
        console.log(`Email sent successfully to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        if (error.response) {
            console.error(error.response.body)
        }
        // Re-throw the error to be handled by the calling function.
        throw error;
    }
};

module.exports = {
    sendEmail,
};
