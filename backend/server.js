const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sequelize, User, Customer, Property, Task, Image, Team } = require('./database');
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

// RAG Search Route
app.post('/api/rag-search', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { query, teamId } = req.body;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const customers = await Customer.findAll({ where: { TeamId: teamId } });
        const properties = await Property.findAll({ where: { TeamId: teamId } });

        const context = await searchSimilarDocuments(query, customers, properties);

        res.json({ context });
    } catch (error) {
        console.error('RAG search error:', error);
        res.status(500).json({ error: 'Failed to perform RAG search' });
    }
});

// Customer routes
app.get('/api/customers', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const customers = await Customer.findAll({ where: { TeamId: req.query.teamId } });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', authenticateToken, isTeamMember, async (req, res) => {
    try {
        const { teamId, ...customerData } = req.body;
        const newCustomer = await Customer.create({ ...customerData, TeamId: teamId });
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
