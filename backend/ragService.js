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

module.exports = { searchSimilarDocuments };
