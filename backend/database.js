const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

const Customer = sequelize.define('Customer', {
    name: { type: DataTypes.STRING, allowNull: false },
    phoneNumber: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE },
    // For requirements and interactions, we'll use JSONB/TEXT since they are complex objects
    requirements: { type: DataTypes.JSON },
    interactions: { type: DataTypes.JSON }
}, { timestamps: false });

const Property = sequelize.define('Property', {
    title: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING },
    transactionType: { type: DataTypes.STRING },
    propertyType: { type: DataTypes.STRING },
    area: { type: DataTypes.INTEGER },
    bedrooms: { type: DataTypes.INTEGER },
    price: { type: DataTypes.BIGINT },
    rahn: { type: DataTypes.BIGINT },
    rent: { type: DataTypes.BIGINT },
    features: { type: DataTypes.JSON },
    description: { type: DataTypes.TEXT },
    createdAt: { type: DataTypes.DATE }
}, { timestamps: false });

const Task = sequelize.define('Task', {
    title: { type: DataTypes.STRING, allowNull: false },
    dueDate: { type: DataTypes.DATEONLY },
    priority: { type: DataTypes.STRING },
    isCompleted: { type: DataTypes.BOOLEAN, defaultValue: false },
    customerId: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE }
}, { timestamps: false });

module.exports = {
    sequelize,
    Customer,
    Property,
    Task
};
