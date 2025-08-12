import { createRxDatabase, RxDatabase, RxCollection, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { pipeline, Pipeline } from '@xenova/transformers';
import { Customer, Property } from '../types';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';

// addRxPlugin(RxDBDevModePlugin); // TODO: remove in production

// Define types for our data
interface Document {
    id: string;
    text: string;
    type: 'customer' | 'property';
}

interface VectorDocument {
    id: string;
    embedding: number[];
}

let db: RxDatabase | null = null;
let embeddingPipeline: Pipeline | null = null;

const DB_NAME = 'real_estate_rag_db';
const DOCUMENTS_COLLECTION_NAME = 'documents';
const VECTORS_COLLECTION_NAME = 'vectors';

// 1. Initialize the database
export const initDB = async () => {
    if (db) {
        return;
    }
    db = await createRxDatabase({
        name: DB_NAME,
        storage: getRxStorageDexie(),
    });

    await db.addCollections({
        [DOCUMENTS_COLLECTION_NAME]: {
            schema: {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    text: {
                        type: 'string'
                    },
                    type: {
                        type: 'string',
                        maxLength: 20
                    }
                },
                required: ['id', 'text', 'type']
            }
        },
        [VECTORS_COLLECTION_NAME]: {
            schema: {
                version: 0,
                primaryKey: 'id',
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    embedding: {
                        type: 'array',
                        items: {
                            type: 'number'
                        }
                    }
                },
                required: ['id', 'embedding']
            }
        }
    });
};

// 2. Get the embedding pipeline
const getEmbeddingPipeline = async () => {
    if (!embeddingPipeline) {
        embeddingPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embeddingPipeline;
};

// 3. Generate embeddings from text
export const getEmbedding = async (text: string): Promise<number[]> => {
    const pipe = await getEmbeddingPipeline();
    const output = await pipe(text, {
        pooling: 'mean',
        normalize: true,
    });
    return Array.from(output.data as Float32Array);
};

// 4. Add a document to the index
export const addDocument = async (doc: Document) => {
    if (!db) {
        throw new Error('Database not initialized');
    }
    const documentsCollection: RxCollection<Document> = db[DOCUMENTS_COLLECTION_NAME];
    const vectorsCollection: RxCollection<VectorDocument> = db[VECTORS_COLLECTION_NAME];

    await documentsCollection.upsert(doc);
    const embedding = await getEmbedding(doc.text);
    await vectorsCollection.upsert({
        id: doc.id,
        embedding: embedding
    });
};

// 5. Search for similar documents
export const searchSimilarDocuments = async (queryText: string, limit: number = 5): Promise<string[]> => {
    if (!db) {
        throw new Error('Database not initialized');
    }
    const vectorsCollection: RxCollection<VectorDocument> = db[VECTORS_COLLECTION_NAME];

    const queryEmbedding = await getEmbedding(queryText);
    const allVectors = await vectorsCollection.find().exec();

    if (allVectors.length === 0) {
        return [];
    }

    // This is a simplified distance calculation. For production, consider a more optimized approach.
    const euclideanDistance = (a: number[], b: number[]): number => {
        return Math.sqrt(
            a.map((x, i) => Math.pow(x - b[i], 2)).reduce((sum, val) => sum + val, 0)
        );
    }

    const withDistance = allVectors.map(vectorDoc => ({
        id: vectorDoc.id,
        distance: euclideanDistance(queryEmbedding, vectorDoc.embedding)
    }));

    withDistance.sort((a, b) => a.distance - b.distance);

    return withDistance.slice(0, limit).map(item => item.id);
};

// 6. Delete a document
export const deleteDocument = async (id: string) => {
    if (!db) {
        throw new Error('Database not initialized');
    }
    const documentsCollection: RxCollection<Document> = db[DOCUMENTS_COLLECTION_NAME];
    const vectorsCollection: RxCollection<VectorDocument> = db[VECTORS_COLLECTION_NAME];

    const doc = await documentsCollection.findOne(id).exec();
    if (doc) {
        await doc.remove();
    }

    const vectorDoc = await vectorsCollection.findOne(id).exec();
    if (vectorDoc) {
        await vectorDoc.remove();
    }
}

// Helper functions to convert app data to documents
export const customerToDocument = (customer: Customer): Document => {
    const text = `
        Customer: ${customer.name},
        Phone: ${customer.phoneNumber},
        Notes: ${customer.requirements.notes},
        Tags: ${customer.requirements.tags?.join(', ')}
    `;
    return { id: `customer-${customer.id}`, text, type: 'customer' };
}

export const propertyToDocument = (property: Property): Document => {
    const text = `
        Property: ${property.address},
        Type: ${property.propertyType},
        Price: ${property.price},
        Description: ${property.description},
        Features: ${property.features.join(', ')}
    `;
    return { id: `property-${property.id}`, text, type: 'property' };
}
