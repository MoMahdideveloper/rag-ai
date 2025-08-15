'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Customer extends Model {
    static associate(models) {
      Customer.belongsTo(models.Team);
      Customer.hasMany(models.Interaction);
    }
  }
  Customer.init({
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, validate: { isEmail: true } },
    phoneNumber: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE },
    requirements: { type: DataTypes.JSON },
    leadScore: { type: DataTypes.INTEGER },
    leadScoreReasoning: { type: DataTypes.TEXT },
    embedding: { type: DataTypes.VECTOR(384) }
  }, {
    sequelize,
    modelName: 'Customer',
    timestamps: false,
    indexes: [{
        fields: ['embedding'],
        using: 'hnsw',
        operator: 'vector_cosine_ops'
    }]
  });
  return Customer;
};
