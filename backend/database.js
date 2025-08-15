const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite'
});

const Customer = sequelize.define('Customer', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, validate: { isEmail: true } },
    phoneNumber: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE },
    requirements: { type: DataTypes.JSON },
    leadScore: { type: DataTypes.INTEGER },
    leadScoreReasoning: { type: DataTypes.TEXT }
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

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const SmsProvider = sequelize.define('SmsProvider', {
    name: { type: DataTypes.STRING, allowNull: false },
    apiKey: { type: DataTypes.STRING, allowNull: false },
    apiSecret: { type: DataTypes.STRING, allowNull: false },
    senderNumber: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const NotificationLog = sequelize.define('NotificationLog', {
    recipient: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false }, // e.g., 'sent', 'failed'
    provider: { type: DataTypes.STRING },
    error: { type: DataTypes.TEXT }
});

const Team = sequelize.define('Team', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

// Associations
User.belongsToMany(Team, { through: 'UserTeam' });
Team.belongsToMany(User, { through: 'UserTeam' });

Team.hasMany(SmsProvider);
SmsProvider.belongsTo(Team);

Team.hasMany(Customer);
Customer.belongsTo(Team);

Team.hasMany(Property);
Property.belongsTo(Team);

User.hasMany(Customer);
Customer.belongsTo(User);

User.hasMany(Property);
Property.belongsTo(User);

User.hasMany(Task);
Task.belongsTo(User);

const Image = sequelize.define('Image', {
    path: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

Property.hasMany(Image);
Image.belongsTo(Property);

const Interaction = sequelize.define('Interaction', {
    type: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT }
});

Customer.hasMany(Interaction);
Interaction.belongsTo(Customer);

User.hasMany(Interaction);
Interaction.belongsTo(User);

// NotificationLog Associations
Team.hasMany(NotificationLog);
NotificationLog.belongsTo(Team);

Customer.hasMany(NotificationLog);
NotificationLog.belongsTo(Customer);

Property.hasMany(NotificationLog);
NotificationLog.belongsTo(Property);

module.exports = {
    sequelize,
    User,
    Customer,
    Property,
    Task,
    Image,
    Team,
    Interaction,
    SmsProvider,
    NotificationLog
};
