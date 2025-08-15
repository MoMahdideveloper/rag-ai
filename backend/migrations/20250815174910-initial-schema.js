'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Users Table
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Teams Table
    await queryInterface.createTable('Teams', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // UserTeam Join Table
    await queryInterface.createTable('UserTeam', {
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      UserId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE'
      },
      TeamId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'Teams', key: 'id' },
        onDelete: 'CASCADE'
      }
    });

    // Customers Table
    await queryInterface.createTable('Customers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: { type: Sequelize.STRING, allowNull: false },
      email: { type: Sequelize.STRING, validate: { isEmail: true } },
      phoneNumber: { type: Sequelize.STRING },
      status: { type: Sequelize.STRING },
      createdAt: { type: Sequelize.DATE },
      requirements: { type: Sequelize.JSON },
      leadScore: { type: Sequelize.INTEGER },
      leadScoreReasoning: { type: Sequelize.TEXT },
      embedding: { type: 'VECTOR(384)' },
      TeamId: {
        type: Sequelize.INTEGER,
        references: { model: 'Teams', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      }
    });
    await queryInterface.addIndex('Customers', ['embedding'], { using: 'hnsw', operator: 'vector_cosine_ops' });


    // Properties Table
    await queryInterface.createTable('Properties', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        title: { type: Sequelize.STRING, allowNull: false },
        address: { type: Sequelize.STRING },
        transactionType: { type: Sequelize.STRING },
        propertyType: { type: Sequelize.STRING },
        area: { type: Sequelize.INTEGER },
        bedrooms: { type: Sequelize.INTEGER },
        price: { type: Sequelize.BIGINT },
        rahn: { type: Sequelize.BIGINT },
        rent: { type: Sequelize.BIGINT },
        features: { type: Sequelize.JSON },
        description: { type: Sequelize.TEXT },
        createdAt: { type: Sequelize.DATE },
        embedding: { type: 'VECTOR(384)' },
        TeamId: {
            type: Sequelize.INTEGER,
            references: { model: 'Teams', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        }
    });
    await queryInterface.addIndex('Properties', ['embedding'], { using: 'hnsw', operator: 'vector_cosine_ops' });

    // Tasks Table
    await queryInterface.createTable('Tasks', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        title: { type: Sequelize.STRING, allowNull: false },
        dueDate: { type: Sequelize.DATEONLY },
        priority: { type: Sequelize.STRING },
        isCompleted: { type: Sequelize.BOOLEAN, defaultValue: false },
        createdAt: { type: Sequelize.DATE },
        customerId: { type: Sequelize.INTEGER },
        UserId: {
            type: Sequelize.INTEGER,
            references: { model: 'Users', key: 'id' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        }
    });

    // Images Table
    await queryInterface.createTable('Images', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        path: { type: Sequelize.STRING, allowNull: false },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
        },
        PropertyId: {
            type: Sequelize.INTEGER,
            references: { model: 'Properties', key: 'id' },
            onDelete: 'CASCADE'
        }
    });

    // Interactions Table
    await queryInterface.createTable('Interactions', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        type: { type: Sequelize.STRING, allowNull: false },
        date: { type: Sequelize.DATE, allowNull: false },
        notes: { type: Sequelize.TEXT },
        createdAt: {
            allowNull: false,
            type: Sequelize.DATE
        },
        updatedAt: {
            allowNull: false,
            type: Sequelize.DATE
        },
        CustomerId: {
            type: Sequelize.INTEGER,
            references: { model: 'Customers', key: 'id' },
            onDelete: 'CASCADE'
        },
        UserId: {
            type: Sequelize.INTEGER,
            references: { model: 'Users', key: 'id' },
            onDelete: 'SET NULL'
        }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Interactions');
    await queryInterface.dropTable('Images');
    await queryInterface.dropTable('Tasks');
    await queryInterface.dropTable('Properties');
    await queryInterface.dropTable('Customers');
    await queryInterface.dropTable('UserTeam');
    await queryInterface.dropTable('Teams');
    await queryInterface.dropTable('Users');
  }
};
