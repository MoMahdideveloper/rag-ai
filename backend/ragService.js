const { pipeline } = require('@xenova/transformers');
const { Customer, Property, sequelize } = require('./database');

// Singleton to ensure we only load the model once.
class EmbeddingPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

const getEmbedding = async (text) => {
    const extractor = await EmbeddingPipeline.getInstance();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
};

// تابع برای ساخت متن قابل جستجو برای مشتری
const customerToDocument = (customer) => {
    const requirements = typeof customer.requirements === 'string' ? JSON.parse(customer.requirements) : customer.requirements;
    const tags = requirements.tags || [];
    return `Customer: ${customer.name}, Phone: ${customer.phoneNumber}, Notes: ${requirements.notes}, Tags: ${tags.join(', ')}`;
};

// تابع برای ساخت متن قابل جستجو برای ملک
const propertyToDocument = (property) => {
    const features = typeof property.features === 'string' ? JSON.parse(property.features) : property.features;
    return `Property: ${property.address}, Type: ${property.propertyType}, Price: ${property.price}, Description: ${property.description}, Features: ${features.join(', ')}`;
};

// تابع جدید برای جستجو با pgvector
const searchSimilarDocuments = async (query, teamId, limit = 5) => {
    const queryEmbedding = await getEmbedding(query);

    // جستجو در مشتریان
    const customerResults = await Customer.findAll({
        where: { TeamId: teamId },
        order: sequelize.literal(`embedding <=> '${JSON.stringify(queryEmbedding)}'`),
        limit: limit
    });

    // جستجو در املاک
    const propertyResults = await Property.findAll({
        where: { TeamId: teamId },
        order: sequelize.literal(`embedding <=> '${JSON.stringify(queryEmbedding)}'`),
        limit: limit
    });

    // ترکیب و مرتب‌سازی نتایج (این بخش را می‌توانید بر اساس نیاز خود تغییر دهید)
    const customerDocs = customerResults.map(c => customerToDocument(c));
    const propertyDocs = propertyResults.map(p => propertyToDocument(p));

    // در اینجا می‌توانید منطق بهتری برای ادغام و رتبه‌بندی نتایج پیاده کنید
    // اما برای سادگی، فعلا فقط آن‌ها را برمی‌گردانیم
    return [...customerDocs, ...propertyDocs];
};

module.exports = { searchSimilarDocuments, getEmbedding, customerToDocument, propertyToDocument };
