const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Simple test route
app.get('/', (req, res) => {
    res.send('Real Estate CRM Backend is running!');
});

// Customer routes
app.get('/api/customers', async (req, res) => {
    try {
        const customers = await Customer.findAll();
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/customers', async (req, res) => {
    try {
        const newCustomer = await Customer.create(req.body);
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const customer = await Customer.findByPk(req.params.id);
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

app.delete('/api/customers/:id', async (req, res) => {
    try {
        const deleted = await Customer.destroy({
            where: { id: req.params.id }
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
app.get('/api/properties', async (req, res) => {
    try {
        const properties = await Property.findAll();
        res.json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/properties', async (req, res) => {
    try {
        const newProperty = await Property.create(req.body);
        res.status(201).json(newProperty);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/properties/:id', async (req, res) => {
    try {
        const property = await Property.findByPk(req.params.id);
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

app.delete('/api/properties/:id', async (req, res) => {
    try {
        const deleted = await Property.destroy({
            where: { id: req.params.id }
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

// Task routes
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.findAll();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', async (req, res) => {
    try {
        const newTask = await Task.create(req.body);
        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByPk(req.params.id);
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

app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const deleted = await Task.destroy({
            where: { id: req.params.id }
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

const { sequelize, Customer, Property, Task } = require('./database');

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
