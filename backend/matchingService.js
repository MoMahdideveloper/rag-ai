const { Customer, Property } = require('./database');
const { findSimilarProperties, findSimilarCustomers } = require('./ragService');

/**
 * Finds properties that are a good match for a given customer's requirements using the RAG service.
 * @param {object} customer - The customer instance from Sequelize.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of matching property instances.
 */
async function findMatchingProperties(customer) {
    try {
        const allProperties = await Property.findAll({ where: { TeamId: customer.TeamId } });
        if (allProperties.length === 0) {
            return [];
        }
        return await findSimilarProperties(customer, allProperties);
    } catch (error) {
        console.error("Error in findMatchingProperties (matchingService):", error);
        return [];
    }
}

/**
 * Finds customers who are a good match for a given property using the RAG service.
 * @param {object} property - The property instance from Sequelize.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of matching customer instances.
 */
async function findMatchingCustomers(property) {
    try {
        const allCustomers = await Customer.findAll({ where: { TeamId: property.TeamId } });
        if (allCustomers.length === 0) {
            return [];
        }
        return await findSimilarCustomers(property, allCustomers);
    } catch (error) {
        console.error("Error in findMatchingCustomers (matchingService):", error);
        return [];
    }
}

module.exports = {
    findMatchingProperties,
    findMatchingCustomers,
};
