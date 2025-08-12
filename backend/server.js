const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Helper functions to read and write data
const readDB = () => {
    const dbData = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(dbData);
};

const writeDB = (data) => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

// Simple test route
app.get('/', (req, res) => {
    res.send('Real Estate CRM Backend is running!');
});

// Customer routes
app.get('/api/customers', (req, res) => {
    const db = readDB();
    res.json(db.customers);
});

app.post('/api/customers', (req, res) => {
    const db = readDB();
    const newCustomer = { ...req.body, id: Date.now() };
    db.customers.push(newCustomer);
    writeDB(db);
    res.status(201).json(newCustomer);
});

app.put('/api/customers/:id', (req, res) => {
    const db = readDB();
    const customerId = parseInt(req.params.id, 10);
    const customerIndex = db.customers.findIndex(c => c.id === customerId);

    if (customerIndex === -1) {
        return res.status(404).send('Customer not found');
    }

    const updatedCustomer = { ...db.customers[customerIndex], ...req.body };
    db.customers[customerIndex] = updatedCustomer;
    writeDB(db);
    res.json(updatedCustomer);
});

app.delete('/api/customers/:id', (req, res) => {
    const db = readDB();
    const customerId = parseInt(req.params.id, 10);
    const initialLength = db.customers.length;
    db.customers = db.customers.filter(c => c.id !== customerId);

    if (db.customers.length === initialLength) {
        return res.status(404).send('Customer not found');
    }

    writeDB(db);
    res.status(204).send();
});

// Property routes
app.get('/api/properties', (req, res) => {
    const db = readDB();
    res.json(db.properties);
});

app.post('/api/properties', (req, res) => {
    const db = readDB();
    const newProperty = { ...req.body, id: Date.now() };
    db.properties.push(newProperty);
    writeDB(db);
    res.status(201).json(newProperty);
});

app.put('/api/properties/:id', (req, res) => {
    const db = readDB();
    const propertyId = parseInt(req.params.id, 10);
    const propertyIndex = db.properties.findIndex(p => p.id === propertyId);

    if (propertyIndex === -1) {
        return res.status(404).send('Property not found');
    }

    const updatedProperty = { ...db.properties[propertyIndex], ...req.body };
    db.properties[propertyIndex] = updatedProperty;
    writeDB(db);
    res.json(updatedProperty);
});

app.delete('/api/properties/:id', (req, res) => {
    const db = readDB();
    const propertyId = parseInt(req.params.id, 10);
    const initialLength = db.properties.length;
    db.properties = db.properties.filter(p => p.id !== propertyId);

    if (db.properties.length === initialLength) {
        return res.status(404).send('Property not found');
    }

    writeDB(db);
    res.status(204).send();
});

// Task routes
app.get('/api/tasks', (req, res) => {
    const db = readDB();
    res.json(db.tasks);
});

app.post('/api/tasks', (req, res) => {
    const db = readDB();
    const newTask = { ...req.body, id: Date.now() };
    db.tasks.push(newTask);
    writeDB(db);
    res.status(201).json(newTask);
});

app.put('/api/tasks/:id', (req, res) => {
    const db = readDB();
    const taskId = parseInt(req.params.id, 10);
    const taskIndex = db.tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
        return res.status(404).send('Task not found');
    }

    const updatedTask = { ...db.tasks[taskIndex], ...req.body };
    db.tasks[taskIndex] = updatedTask;
    writeDB(db);
    res.json(updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
    const db = readDB();
    const taskId = parseInt(req.params.id, 10);
    const initialLength = db.tasks.length;
    db.tasks = db.tasks.filter(t => t.id !== taskId);

    if (db.tasks.length === initialLength) {
        return res.status(404).send('Task not found');
    }

    writeDB(db);
    res.status(204).send();
});


app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
