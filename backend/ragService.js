const { pipeline } = require('@xenova/transformers');

// Singleton to ensure we only load the model once.
class EmbeddingPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            console.log('Loading embedding model...');
            this.instance = pipeline(this.task, this.model, { progress_callback });
            console.log('Embedding model loaded.');
        }
        return this.instance;
    }
}

const getEmbedding = async (text) => {
    const extractor = await EmbeddingPipeline.getInstance();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
};

const customerToDocument = (customer) => {
    // Make sure requirements and interactions are parsed if they are stored as JSON strings
    const requirements = typeof customer.requirements === 'string' ? JSON.parse(customer.requirements) : customer.requirements;
    const interactions = typeof customer.interactions === 'string' ? JSON.parse(customer.interactions) : customer.interactions;
    const tags = requirements.tags || [];
    return `Customer: ${customer.name}, Phone: ${customer.phoneNumber}, Notes: ${requirements.notes}, Tags: ${tags.join(', ')}`;
};

const propertyToDocument = (property) => {
    const features = typeof property.features === 'string' ? JSON.parse(property.features) : property.features;
    return `Property: ${property.address}, Type: ${property.propertyType}, Price: ${property.price}, Description: ${property.description}, Features: ${features.join(', ')}`;
};

const euclideanDistance = (a, b) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
};

/**
 * For a given customer, finds the most similar properties from a list.
 * @param {object} customer - The customer object to find matches for.
 * @param {Array<object>} allProperties - An array of all properties to search within.
 * @param {number} [limit=3] - The max number of similar properties to return.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of property objects.
 */
const findSimilarProperties = async (customer, allProperties, limit = 3) => {
    if (!customer || !allProperties || allProperties.length === 0) {
        return [];
    }

    // Convert customer requirements to a query string
    const query = customerToDocument(customer);
    const queryEmbedding = await getEmbedding(query);

    // Get embeddings for all properties
    const propertyDocs = allProperties.map(p => ({ property: p, text: propertyToDocument(p) }));
    const docEmbeddings = await Promise.all(propertyDocs.map(doc => getEmbedding(doc.text)));

    // Calculate similarity
    const withDistance = propertyDocs.map((doc, i) => ({
        ...doc,
        distance: euclideanDistance(queryEmbedding, docEmbeddings[i])
    }));

    // Sort by distance (lower is better)
    withDistance.sort((a, b) => a.distance - b.distance);

    // A simple threshold could be applied here if needed, e.g., filter(p => p.distance < 0.8)

    // Return the full property objects
    return withDistance.slice(0, limit).map(d => d.property);
};

/**
 * For a given property, finds the most similar customers from a list.
 * @param {object} property - The property object to find matches for.
 * @param {Array<object>} allCustomers - An array of all customers to search within.
 * @param {number} [limit=5] - The max number of similar customers to return.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of customer objects.
 */
const findSimilarCustomers = async (property, allCustomers, limit = 5) => {
    if (!property || !allCustomers || allCustomers.length === 0) {
        return [];
    }

    // Convert property details to a query string
    const query = propertyToDocument(property);
    const queryEmbedding = await getEmbedding(query);

    // Get embeddings for all customers
    const customerDocs = allCustomers.map(c => ({ customer: c, text: customerToDocument(c) }));
    const docEmbeddings = await Promise.all(customerDocs.map(doc => getEmbedding(doc.text)));

    // Calculate similarity
    const withDistance = customerDocs.map((doc, i) => ({
        ...doc,
        distance: euclideanDistance(queryEmbedding, docEmbeddings[i])
    }));

    // Sort by distance (lower is better)
    withDistance.sort((a, b) => a.distance - b.distance);

    // Return the full customer objects
    return withDistance.slice(0, limit).map(d => d.customer);
};

const searchSimilarDocuments = async (query, customers, properties, limit = 5) => {
    if ((!customers || customers.length === 0) && (!properties || properties.length === 0)) {
        return [];
    }

    const queryEmbedding = await getEmbedding(query);

    const customerDocs = customers.map(c => ({ id: `customer-${c.id}`, text: customerToDocument(c) }));
    const propertyDocs = properties.map(p => ({ id: `property-${p.id}`, text: propertyToDocument(p) }));
    const allDocs = [...customerDocs, ...propertyDocs];

    if (allDocs.length === 0) {
        return [];
    }

    const docEmbeddings = await Promise.all(allDocs.map(doc => getEmbedding(doc.text)));

    const withDistance = allDocs.map((doc, i) => ({
        id: doc.id,
        text: doc.text, // For context
        distance: euclideanDistance(queryEmbedding, docEmbeddings[i])
    }));

    withDistance.sort((a, b) => a.distance - b.distance);

    // We only need to return the text for the context
    return withDistance.slice(0, limit).map(d => d.text);
};

module.exports = {
    searchSimilarDocuments,
    findSimilarProperties,
    findSimilarCustomers,
};
