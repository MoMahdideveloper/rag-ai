const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sequelize, User, Customer, Property, Task, Image } = require('./database');
const { searchSimilarDocuments } = require('./ragService');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-super-secret-key-that-should-be-in-an-env-file';

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static('uploads'));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append extension
    }
});

const upload = multer({ storage: storage });

// Simple test route
app.get('/', (req, res) => {
    res.send('Real Estate CRM Backend is running!');
});

// Auth routes
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword });
        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) return res.sendStatus(401); // if there isn't any token

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// RAG Search Route
app.post('/api/rag-search', authenticateToken, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Fetch the user's data
        const customers = await Customer.findAll({ where: { UserId: req.user.id } });
        const properties = await Property.findAll({ where: { UserId: req.user.id } });

        // Perform the RAG search
        const context = await searchSimilarDocuments(query, customers, properties);

        res.json({ context });
    } catch (error) {
        console.error('RAG search error:', error);
        res.status(500).json({ error: 'Failed to perform RAG search' });
    }
});

// Customer routes
app.get('/api/customers', authenticateToken, async (req, res) => {
    try {
        const customers = await Customer.findAll({ where: { UserId: req.user.id } });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', authenticateToken, async (req, res) => {
    try {
        const newCustomer = await Customer.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const customer = await Customer.findOne({ where: { id: req.params.id, UserId: req.user.id } });
        if (customer) {
            await customer.update(req.body);
            res.json(customer);
        } else {
            res.status(404).send('Customer not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await Customer.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).send('Customer not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Property routes
app.get('/api/properties', authenticateToken, async (req, res) => {
    try {
        const properties = await Property.findAll({
            where: { UserId: req.user.id },
            include: Image
        });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findOne({
            where: { id: req.params.id, UserId: req.user.id },
            include: Image
        });
        if (property) {
            res.json(property);
        } else {
            res.status(404).send('Property not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/properties', authenticateToken, async (req, res) => {
    try {
        const newProperty = await Property.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(newProperty);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findOne({ where: { id: req.params.id, UserId: req.user.id } });
        if (property) {
            await property.update(req.body);
            res.json(property);
        } else {
            res.status(404).send('Property not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await Property.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).send('Property not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/properties/:propertyId/images', authenticateToken, upload.array('images', 10), async (req, res) => {
    try {
        const propertyId = req.params.propertyId;
        const property = await Property.findOne({ where: { id: propertyId, UserId: req.user.id } });

        if (!property) {
            return res.status(404).send('Property not found');
        }

        if (!req.files) {
            return res.status(400).send('No files were uploaded.');
        }

        const images = req.files.map(file => ({
            path: file.path,
            PropertyId: property.id
        }));

        const createdImages = await Image.bulkCreate(images);
        res.status(201).json(createdImages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const imageId = req.params.imageId;
        const image = await Image.findByPk(imageId, { include: Property });

        if (!image || image.Property.UserId !== req.user.id) {
            return res.status(404).send('Image not found');
        }

        // Delete file from server
        fs.unlink(image.path, (err) => {
            if (err) {
                console.error("Failed to delete image file:", err);
            }
        });

        await image.destroy();
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Task routes
app.get('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const tasks = await Task.findAll({ where: { UserId: req.user.id } });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
    try {
        const newTask = await Task.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const task = await Task.findOne({ where: { id: req.params.id, UserId: req.user.id } });
        if (task) {
            await task.update(req.body);
            res.json(task);
        } else {
            res.status(404).send('Task not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await Task.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).send('Task not found');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const startServer = async () => {
    try {
        await sequelize.sync();
        console.log('Database synchronized');

        app.listen(PORT, () => {
            console.log(`Backend server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
