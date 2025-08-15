require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sequelize, setupVectorExtension, User, Customer, Property, Task, Image, Team, Interaction } = require('./database');
const { searchSimilarDocuments, getEmbedding, customerToDocument, propertyToDocument } = require('./ragService');
const { fn, col } = require('sequelize');
const { sendEmail } = require('./emailService');
const { getLeadScoreFromAI } = require('./aiService');

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-that-should-be-in-an-env-file';

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

const isTeamMember = async (req, res, next) => {
    try {
        const teamId = req.query.teamId || req.body.teamId || req.params.teamId;
        if (!teamId) {
            return res.status(400).json({ error: 'Team ID is required' });
        }
        const user = await User.findByPk(req.user.id, { include: Team });
        const isMember = user.Teams.some(team => team.id == teamId);

        if (!isMember) {
            return res.status(403).json({ error: 'User is not a member of this team' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Team routes
app.post('/api/teams', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
    }
    try {
        const team = await Team.create({ name });
        await team.addUser(req.user.id, { through: { role: 'owner' } });
        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/teams', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, { include: Team });
        res.json(user.Teams);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/teams/:teamId/invite', authenticateToken, async (req, res) => {
    try {
        const { email } = req.body;
        const teamId = req.params.teamId;

        const team = await Team.findByPk(teamId);
        if (!team) {
            return res.status(404).send('Team not found');
        }

        const userToInvite = await User.findOne({ where: { email } });
        if (!userToInvite) {
            return res.status(404).send('User to invite not found');
        }

        await team.addUser(userToInvite.id, { through: { role: 'member' } });
        res.status(200).json({ message: 'User invited successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Analytics Routes
app.get('/api/analytics/summary', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { teamId } = req.query;

        const totalCustomers = await Customer.count({ where: { TeamId: teamId } });
        const totalProperties = await Property.count({ where: { TeamId: teamId } });

        const propertiesForSale = await Property.count({ where: { TeamId: teamId, transactionType: 'Sale' } });
        const propertiesForRent = await Property.count({ where: { TeamId: teamId, transactionType: 'Rent' } });

        const tasksCompleted = await Task.count({ where: { UserId: req.user.id, isCompleted: true } });
        const tasksPending = await Task.count({ where: { UserId: req.user.id, isCompleted: false } });

        res.json({
            totalCustomers,
            totalProperties,
            propertiesForSale,
            propertiesForRent,
            tasksCompleted,
            tasksPending
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/analytics/timeseries', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { teamId } = req.query;

        const customerSeries = await Customer.findAll({
            where: { TeamId: teamId },
            attributes: [
                [fn('TO_CHAR', col('createdAt'), 'YYYY-MM'), 'month'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['month'],
            order: [['month', 'ASC']]
        });

        res.json({ customerSeries });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// RAG Search Route
app.post('/api/rag-search', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { query, teamId } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const contextDocuments = await searchSimilarDocuments(query, teamId);

        res.json({ context: contextDocuments.join('\n\n') });
    } catch (error) {
        console.error('RAG search error:', error);
        res.status(500).json({ error: 'Failed to perform RAG search' });
    }
});

// Customer routes
app.get('/api/customers', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const customers = await Customer.findAll({
            where: { TeamId: req.query.teamId },
            include: [Interaction]
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id, { include: [Interaction, Team] });
        const isMember = await customer.Team.hasUser(req.user.id);
        if (customer && isMember) {
            res.json(customer);
        } else {
            res.status(404).send('Customer not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { teamId, ...customerData } = req.body;
        const newCustomer = await Customer.create({ ...customerData, TeamId: teamId });

        // Generate and save embedding
        const docText = customerToDocument(newCustomer);
        const embedding = await getEmbedding(docText);
        await newCustomer.update({ embedding });

        // Fire-and-forget AI scoring
        getLeadScoreFromAI(newCustomer).then(({ score, reasoning }) => {
            if (score !== null) {
                newCustomer.update({ leadScore: score, leadScoreReasoning: reasoning });
            }
        }).catch(err => console.error("AI Scoring failed:", err));

        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id, { include: Team });
        const isMember = await customer.Team.hasUser(req.user.id);
        if (customer && isMember) {
            await customer.update(req.body);

            // Re-generate and save embedding
            const docText = customerToDocument(customer);
            const embedding = await getEmbedding(docText);
            await customer.update({ embedding });

            // Fire-and-forget AI scoring
            getLeadScoreFromAI(customer).then(({ score, reasoning }) => {
                if (score !== null) {
                    customer.update({ leadScore: score, leadScoreReasoning: reasoning });
                }
            }).catch(err => console.error("AI Scoring failed:", err));

            res.json(customer);
        } else {
            res.status(404).send('Customer not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/customers/:id', authenticateToken, async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id, { include: Team });
        const isMember = await customer.Team.hasUser(req.user.id);
        if (customer && isMember) {
            await customer.destroy();
            res.status(204).send();
        } else {
            res.status(404).send('Customer not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers/:customerId/send-email', authenticateToken, async (req, res) => {
    try {
        const { subject, body } = req.body;
        const { customerId } = req.params;

        if (!subject || !body) {
            return res.status(400).json({ error: 'Subject and body are required' });
        }

        const customer = await Customer.findByPk(customerId, { include: Team });
        if (!customer) {
            return res.status(404).send('Customer not found');
        }

        const isMember = await customer.Team.hasUser(req.user.id);
        if (!isMember) {
            return res.status(403).send('User is not a member of the team this customer belongs to');
        }

        const fromAddress = process.env.FROM_EMAIL || 'your-verified-sender@example.com';

        await sendEmail({
            to: customer.email,
            from: fromAddress,
            subject: subject,
            text: body,
            html: `<p>${body}</p>`,
        });

        const interaction = await Interaction.create({
            type: 'Email',
            notes: `Subject: ${subject}\n\n${body}`,
            date: new Date(),
            CustomerId: customer.id,
            UserId: req.user.id
        });

        res.status(200).json(interaction);
    } catch (error) {
        console.error('Failed to send email or log interaction:', error);
        res.status(500).json({ error: 'Failed to send email' });
    }
});

// Property routes
app.get('/api/properties', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const properties = await Property.findAll({
            where: { TeamId: req.query.teamId },
            include: Image
        });
        res.json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findByPk(req.params.id, { include: [Image, Team] });
        const isMember = await property.Team.hasUser(req.user.id);
        if (property && isMember) {
            res.json(property);
        } else {
            res.status(404).send('Property not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/properties', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { teamId, ...propertyData } = req.body;
        const newProperty = await Property.create({ ...propertyData, TeamId: teamId });

        // Generate and save embedding
        const docText = propertyToDocument(newProperty);
        const embedding = await getEmbedding(docText);
        await newProperty.update({ embedding });

        res.status(201).json(newProperty);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findByPk(req.params.id, { include: Team });
        const isMember = await property.Team.hasUser(req.user.id);
        if (property && isMember) {
            await property.update(req.body);

            // Re-generate and save embedding
            const docText = propertyToDocument(property);
            const embedding = await getEmbedding(docText);
            await property.update({ embedding });

            res.json(property);
        } else {
            res.status(404).send('Property not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/properties/:id', authenticateToken, async (req, res) => {
    try {
        const property = await Property.findByPk(req.params.id, { include: Team });
        const isMember = await property.Team.hasUser(req.user.id);
        if (property && isMember) {
            await property.destroy();
            res.status(204).send();
        } else {
            res.status(404).send('Property not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/properties/:propertyId/images', authenticateToken, async (req, res) => {
    const property = await Property.findByPk(req.params.propertyId, { include: Team });
    const isMember = await property.Team.hasUser(req.user.id);
    if (!property || !isMember) {
        return res.status(404).send('Property not found or user not a member of the team');
    }

    const uploader = upload.array('images', 10);
    uploader(req, res, async (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
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
    });
});

app.delete('/api/images/:imageId', authenticateToken, async (req, res) => {
    try {
        const image = await Image.findByPk(req.params.imageId, { include: { model: Property, include: Team } });
        const isMember = await image.Property.Team.hasUser(req.user.id);
        if (image && isMember) {
            fs.unlink(image.path, (err) => {
                if (err) console.error("Failed to delete image file:", err);
            });
            await image.destroy();
            res.status(204).send();
        } else {
            res.status(404).send('Image not found or user not a member of the team');
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Task routes remain user-specific, no team logic needed for now.
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
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        // اجرای تابع برای فعال‌سازی افزونه
        await setupVectorExtension();
        console.log('Vector extension setup complete.');

        app.listen(PORT, () => {
            console.log(`Backend server is running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start the server:', error);
    }
};

startServer();
